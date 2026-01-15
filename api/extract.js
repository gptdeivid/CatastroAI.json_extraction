import { GoogleGenAI } from "@google/genai";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the prompt from prompt.txt
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptPath = join(__dirname, "..", "prompt.txt");

let EXTRACTION_PROMPT;
try {
    EXTRACTION_PROMPT = readFileSync(promptPath, "utf-8");
} catch (error) {
    console.error("Error loading prompt.txt:", error);
    EXTRACTION_PROMPT = "Extract all relevant information from this document and return it as structured JSON.";
}

// Rate limiting (simple in-memory, use Redis in production)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

/**
 * Simple rate limiter
 * @param {string} ip - Client IP address
 * @returns {boolean} - True if request is allowed
 */
function checkRateLimit(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return false;
    }

    record.count++;
    return true;
}

/**
 * Validate PDF content
 * @param {Buffer} buffer - PDF buffer
 * @returns {boolean} - True if valid PDF
 */
function isValidPDF(buffer) {
    if (buffer.length < 4) return false;
    const header = buffer.slice(0, 4).toString();
    return header === "%PDF";
}

/**
 * Main API handler for extracting data from PDFs
 */
export default async function handler(req, res) {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Get client IP
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket?.remoteAddress ||
        "anonymous";

    // Check rate limit
    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: "Demasiadas solicitudes. Por favor espera un momento.",
            retryAfter: 60
        });
    }

    try {
        const { pdfBase64, filename } = req.body;

        // Validate request body
        if (!pdfBase64) {
            return res.status(400).json({ error: "No se proporcionó ningún PDF" });
        }

        // Decode base64
        const pdfBuffer = Buffer.from(pdfBase64, "base64");

        // Validate file size (30MB max)
        const MAX_SIZE = 30 * 1024 * 1024;
        if (pdfBuffer.length > MAX_SIZE) {
            return res.status(400).json({
                error: `El archivo es demasiado grande. Máximo ${MAX_SIZE / (1024 * 1024)}MB`
            });
        }

        // Validate PDF magic bytes
        if (!isValidPDF(pdfBuffer)) {
            return res.status(400).json({ error: "El archivo no es un PDF válido" });
        }

        // Check API key
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error("GOOGLE_API_KEY not configured");
            return res.status(500).json({
                error: "Error de configuración del servidor"
            });
        }

        // Initialize Gemini client
        const genai = new GoogleGenAI({ apiKey });

        // Get model name from env or use default
        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

        console.log(`Processing ${filename || "unknown"} (${pdfBuffer.length} bytes) with ${modelName}`);

        // Call Gemini API
        const response = await genai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: EXTRACTION_PROMPT },
                        {
                            inlineData: {
                                mimeType: "application/pdf",
                                data: pdfBase64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        // Extract text from response
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error("Empty response from Gemini");
            return res.status(500).json({
                error: "No se recibió respuesta del modelo"
            });
        }

        // Parse JSON response
        let parsedResult;
        try {
            parsedResult = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Failed to parse Gemini response:", parseError);
            // Return raw text if JSON parsing fails
            parsedResult = { rawResponse: responseText };
        }

        console.log(`Successfully processed ${filename || "document"}`);

        return res.status(200).json(parsedResult);

    } catch (error) {
        console.error("Extraction error:", error);

        // Handle specific error types
        if (error.message?.includes("API key")) {
            return res.status(500).json({
                error: "Error de autenticación con la API"
            });
        }

        if (error.message?.includes("quota")) {
            return res.status(429).json({
                error: "Límite de cuota de API alcanzado. Intenta más tarde."
            });
        }

        return res.status(500).json({
            error: "Error al procesar el documento",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
}
