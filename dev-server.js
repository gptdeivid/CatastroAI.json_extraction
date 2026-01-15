/**
 * Local Development Server
 * Serves static files and handles the /api/extract endpoint
 * Run with: node dev-server.js
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 3000;

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Load extraction prompt
let EXTRACTION_PROMPT;
try {
    EXTRACTION_PROMPT = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf-8');
} catch (error) {
    console.error('Warning: Could not load prompt.txt');
    EXTRACTION_PROMPT = 'Extract all relevant information from this document and return it as structured JSON.';
}

/**
 * Handle API extraction request
 */
async function handleExtract(req, res) {
    // Parse JSON body
    let body = '';
    for await (const chunk of req) {
        body += chunk;
    }

    try {
        const { pdfBase64, filename } = JSON.parse(body);

        if (!pdfBase64) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No se proporcionó ningún PDF' }));
            return;
        }

        // Validate PDF
        const pdfBuffer = Buffer.from(pdfBase64, 'base64');
        if (pdfBuffer.length > 10 * 1024 * 1024) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'El archivo es demasiado grande. Máximo 10MB' }));
            return;
        }

        const header = pdfBuffer.slice(0, 4).toString();
        if (header !== '%PDF') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'El archivo no es un PDF válido' }));
            return;
        }

        // Check API key
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'GOOGLE_API_KEY no está configurada en .env' }));
            return;
        }

        console.log(`Processing ${filename || 'document'} (${pdfBuffer.length} bytes)...`);

        // Initialize Gemini
        const genai = new GoogleGenAI({ apiKey });
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

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

        const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No se recibió respuesta del modelo' }));
            return;
        }

        // Parse and return result
        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            result = { rawResponse: responseText };
        }

        console.log(`Successfully processed ${filename || 'document'}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));

    } catch (error) {
        console.error('Extraction error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Error al procesar el documento',
            details: error.message
        }));
    }
}

/**
 * Serve static files from public directory
 */
function serveStatic(req, res) {
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }

        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

// Create server
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Route requests
    if (req.url === '/api/extract' && req.method === 'POST') {
        await handleExtract(req, res);
    } else {
        serveStatic(req, res);
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                      Catastro AI                           ║
║                  Local Development Server                  ║
╠════════════════════════════════════════════════════════════╣
║  Server running at:  http://localhost:${PORT}                  ║
║  API endpoint:       http://localhost:${PORT}/api/extract      ║
╠════════════════════════════════════════════════════════════╣
║  Press Ctrl+C to stop                                      ║
╚════════════════════════════════════════════════════════════╝
    `);
});
