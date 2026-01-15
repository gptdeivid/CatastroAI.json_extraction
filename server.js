/**
 * Production Server for Cloud Run
 * Express.js server serving static files and API endpoints
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Load extraction prompt
let EXTRACTION_PROMPT;
try {
    EXTRACTION_PROMPT = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf-8');
} catch (error) {
    console.error('Warning: Could not load prompt.txt');
    EXTRACTION_PROMPT = 'Extract all relevant information from this document and return it as structured JSON.';
}

// Rate limiting (simple in-memory)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

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

function isValidPDF(buffer) {
    if (buffer.length < 4) return false;
    const header = buffer.slice(0, 4).toString();
    return header === '%PDF';
}

// API endpoint: Extract data from PDF
app.post('/api/extract', async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket?.remoteAddress ||
        'anonymous';

    console.log(`[DEBUG] Received API request: POST /api/extract`);
    console.log(`[DEBUG] Content-Length: ${req.headers['content-length']} bytes`);

    // Check rate limit
    if (!checkRateLimit(ip)) {
        return res.status(429).json({
            error: 'Demasiadas solicitudes. Por favor espera un momento.',
            retryAfter: 60
        });
    }

    try {
        const { pdfBase64, filename } = req.body;

        // Validate request body
        if (!pdfBase64) {
            return res.status(400).json({ error: 'No se proporcionó ningún PDF' });
        }

        // Decode base64
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');

        // Validate file size (30MB max)
        const MAX_SIZE = 30 * 1024 * 1024;
        if (pdfBuffer.length > MAX_SIZE) {
            return res.status(400).json({
                error: `El archivo es demasiado grande. Máximo ${MAX_SIZE / (1024 * 1024)}MB`
            });
        }

        // Validate PDF magic bytes
        if (!isValidPDF(pdfBuffer)) {
            return res.status(400).json({ error: 'El archivo no es un PDF válido' });
        }

        // Check API key
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_API_KEY not configured');
            return res.status(500).json({
                error: 'Error de configuración del servidor'
            });
        }

        // Initialize Gemini client
        const genai = new GoogleGenAI({ apiKey });

        // Get model name from env or use default
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

        console.log(`Processing ${filename || 'unknown'} (${pdfBuffer.length} bytes) with ${modelName}`);

        // Call Gemini API
        const response = await genai.models.generateContent({
            model: modelName,
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: EXTRACTION_PROMPT },
                        {
                            inlineData: {
                                mimeType: 'application/pdf',
                                data: pdfBase64
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        });

        // Extract text from response
        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error('Empty response from Gemini');
            return res.status(500).json({
                error: 'No se recibió respuesta del modelo'
            });
        }

        // Parse JSON response
        let parsedResult;
        try {
            // Clean markdown code blocks if present
            let cleanedResponse = responseText.trim();

            if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, '');
                cleanedResponse = cleanedResponse.replace(/\n?```\s*$/, '');
            }

            parsedResult = JSON.parse(cleanedResponse);
            console.log('JSON parsed successfully');
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', parseError.message);
            console.log('Raw response preview:', responseText.substring(0, 200));

            // Try to extract JSON from the response if embedded in text
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedResult = JSON.parse(jsonMatch[0]);
                    console.log('JSON extracted from embedded text');
                } catch {
                    parsedResult = { rawResponse: responseText, parseError: 'No se pudo parsear el JSON' };
                }
            } else {
                parsedResult = { rawResponse: responseText, parseError: 'No se encontró JSON válido' };
            }
        }

        console.log(`Successfully processed ${filename || 'document'}`);

        return res.status(200).json(parsedResult);

    } catch (error) {
        console.error('Extraction error:', error);

        if (error.message?.includes('API key')) {
            return res.status(500).json({
                error: 'Error de autenticación con la API'
            });
        }

        if (error.message?.includes('quota')) {
            return res.status(429).json({
                error: 'Límite de cuota de API alcanzado. Intenta más tarde.'
            });
        }

        return res.status(500).json({
            error: 'Error al procesar el documento',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                      Catastro AI                           ║
║                   Production Server                        ║
╠════════════════════════════════════════════════════════════╣
║  Server running at:  http://0.0.0.0:${PORT}                    ║
║  API endpoint:       /api/extract                          ║
╠════════════════════════════════════════════════════════════╣
║  Environment: ${process.env.NODE_ENV || 'production'}                              ║
╚════════════════════════════════════════════════════════════╝
    `);
});
