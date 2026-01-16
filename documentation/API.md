# 📡 Guía de API - Catastro AI

## Introducción

Esta guía documenta la API REST de Catastro AI, el componente central que conecta el frontend con el motor de inteligencia artificial de Google Gemini. La API está diseñada como una **función serverless** que se ejecuta bajo demanda, eliminando la necesidad de mantener servidores activos y permitiendo escalado automático según el tráfico.

### ¿Por qué una API Serverless?

A diferencia de arquitecturas tradicionales con servidores siempre activos, las funciones serverless ofrecen ventajas significativas para casos de uso de procesamiento de documentos:

1. **Costo Eficiente**: Solo pagas por el tiempo de ejecución real (~2-8 segundos por documento)
2. **Escalado Infinito**: Vercel automáticamente escala a miles de requests concurrentes
3. **Zero Mantenimiento**: Sin parches de sistema operativo, sin actualizaciones de servidor
4. **Global por Defecto**: Se ejecuta en múltiples regiones cercanas a tus usuarios

### Arquitectura de la API

```
Cliente → CDN Edge → Función Serverless → Gemini API
         (Vercel)    (Node.js 18)       (Google Cloud)
```

El flujo completo toma típicamente:
- **Con caché (cliente)**: < 100ms (respuesta instantánea)
- **Sin caché**: 3-10 segundos (procesamiento completo con Gemini)

## Índice
- [Endpoint de Extracción](#endpoint-de-extracción)
- [Autenticación](#autenticación)
- [Formatos de Request y Response](#formatos-de-request-y-response)
- [Códigos de Error](#códigos-de-error)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Rate Limiting](#rate-limiting)

---

## Endpoint de Extracción

### `POST /api/extract`

Extrae información estructurada de documentos PDF utilizando Google Gemini Vision API.

**URL**: `/api/extract`  
**Método**: `POST`  
**Content-Type**: `application/json`  
**Timeout**: 60 segundos  
**Tamaño máximo**: 30 MB

---

## Autenticación

La API no requiere autenticación del cliente, pero **requiere** que el servidor tenga configurada la variable de entorno `GOOGLE_API_KEY`.

```env
GOOGLE_API_KEY=tu_api_key_de_google_aqui
```

> ⚠️ **Importante**: En producción, considera implementar autenticación para proteger tu API key de Google.

---

## Formatos de Request y Response

### Request Body

```json
{
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PA...",
  "filename": "cedula_catastral.pdf"
}
```

#### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `pdfBase64` | string | ✅ Sí | PDF codificado en Base64 (sin prefijo data URL) |
| `filename` | string | ❌ No | Nombre del archivo original (para logging) |

#### Validaciones

- ✅ El PDF debe ser válido (magic bytes `%PDF-`)
- ✅ Tamaño máximo: 30 MB
- ✅ Solo archivos PDF aceptados

---

### Response (Éxito)

El formato de respuesta depende del tipo de documento detectado:

#### Cédula Catastral

```json
{
  "tipo_documento": "Cedula Catastral",
  "clave_catastral": "095-001-123-456-789",
  "numero_predio": "123456",
  "lote": "15",
  "manzana": "42",
  "tipo_predio": "Urbano",
  "propietarios": [
    "Juan Pérez García",
    "María López Hernández"
  ],
  "domicilio": {
    "calle": "Avenida Reforma",
    "numero": "123",
    "colonia": "Centro",
    "codigo_postal": "06000",
    "municipio": "Cuauhtémoc",
    "estado": "Ciudad de México"
  },
  "superficies": {
    "terreno_m2": 250.5,
    "construccion_m2": 180.25,
    "total_m2": 430.75
  },
  "colindancias": {
    "norte": {
      "medida_m": 10.5,
      "colinda_con": "Calle Principal"
    },
    "sur": {
      "medida_m": 10.5,
      "colinda_con": "Lote 16"
    },
    "este": {
      "medida_m": 24.0,
      "colinda_con": "Avenida Juárez"
    },
    "oeste": {
      "medida_m": 24.0,
      "colinda_con": "Lote 14"
    }
  },
  "valores_catastrales": {
    "valor_suelo": "$1,250,000.00 MXN",
    "valor_construccion": "$850,000.00 MXN",
    "valor_total": "$2,100,000.00 MXN"
  },
  "registro_publico": {
    "folio_real": "123456789",
    "fecha_registro": "2020-05-15",
    "inscripcion_anterior": "12345",
    "volumen_anterior": "456"
  }
}
```

#### Acta Constitutiva

```json
{
  "tipo_documento": "Acta Constitutiva",
  "razon_social": "Empresa Ejemplo S.A. de C.V.",
  "fecha_constitucion": "2023-01-15",
  "objeto_social": "Prestación de servicios de tecnología...",
  "duracion": "99 años",
  "domicilio_social": "Av. Insurgentes Sur 1234, CDMX",
  "capital_social": {
    "monto": "$500,000.00",
    "moneda": "MXN",
    "division": "50,000 acciones de $10.00 cada una"
  },
  "socios": [
    {
      "nombre": "Juan Carlos Pérez López",
      "participacion": "60% (30,000 acciones)"
    },
    {
      "nombre": "María Fernanda García Ruiz",
      "participacion": "40% (20,000 acciones)"
    }
  ],
  "administracion": {
    "tipo": "Consejo de Administración",
    "miembros": [
      {
        "nombre": "Juan Carlos Pérez López",
        "cargo": "Presidente"
      },
      {
        "nombre": "María Fernanda García Ruiz",
        "cargo": "Secretaria"
      }
    ]
  },
  "apoderados": [
    {
      "nombre": "Roberto Martínez Sánchez",
      "facultades": "Poder general para actos de administración"
    }
  ],
  "datos_notariales": {
    "escritura_numero": "12345",
    "notario_numero": "98",
    "notario_nombre": "Lic. Alberto González Ramírez",
    "lugar": "Ciudad de México",
    "fecha": "2023-01-15",
    "estado": "Ciudad de México"
  },
  "registro_comercio": {
    "folio_mercantil": "987654",
    "fecha_inscripcion": "2023-02-01",
    "lugar": "Registro Público de Comercio de la CDMX"
  }
}
```

#### Certificado de Libertad o Gravamen

```json
{
  "tipo_documento": "Certificado Libertad Gravamen",
  "folio_real": "123456789",
  "fecha_expedicion": "2023-12-01",
  "titulares": [
    "Juan Pérez García"
  ],
  "descripcion_inmueble": "Casa habitación ubicada en Calle Reforma 123...",
  "situacion_juridica": "Libre de gravamen",
  "gravamenes": [],
  "anotaciones": "Sin anotaciones preventivas",
  "registro_anterior": {
    "inscripcion": "12345",
    "volumen": "456",
    "fecha": "2015-03-20"
  },
  "funcionario": "Lic. Roberto Hernández Morales"
}
```

#### Contrato de Compraventa

```json
{
  "tipo_documento": "Contrato Compraventa",
  "vendedor": {
    "nombre": "Juan Pérez García",
    "representante": null
  },
  "comprador": {
    "nombre": "María López Hernández",
    "estado_civil": "Casada"
  },
  "regimen_matrimonial": "Sociedad Conyugal",
  "inmueble": {
    "lote": "15",
    "manzana": "42",
    "tipo_predio": "Urbano",
    "estado": "Ciudad de México",
    "ubicacion": "Calle Reforma 123, Col. Centro",
    "superficie": "250.5 m²",
    "colindancias": {
      "norte": "Calle Principal, 10.5 m",
      "sur": "Lote 16, 10.5 m",
      "este": "Av. Juárez, 24.0 m",
      "oeste": "Lote 14, 24.0 m"
    }
  },
  "datos_notariales": {
    "escritura": "67890",
    "notario_nombre": "Lic. Carlos Ramírez Torres",
    "notario_numero": "45"
  },
  "registro_anterior": {
    "inscripcion": "54321",
    "volumen": "789",
    "libro": "III",
    "fecha": "2020-06-15"
  },
  "operacion": {
    "precio": "$2,100,000.00 MXN",
    "fecha": "2023-11-30"
  }
}
```

---

### Response (Error)

```json
{
  "error": "Mensaje descriptivo del error",
  "details": "Detalles técnicos (solo en modo desarrollo)",
  "retryAfter": 60
}
```

---

## Códigos de Error

| Código HTTP | Error | Causa | Solución |
|-------------|-------|-------|----------|
| `400` | No se proporcionó ningún PDF | Campo `pdfBase64` vacío o ausente | Enviar PDF válido en base64 |
| `400` | El archivo es demasiado grande | Archivo > 30 MB | Reducir tamaño o dividir documento |
| `400` | El archivo no es un PDF válido | Magic bytes no coinciden con `%PDF-` | Verificar que sea un PDF real |
| `405` | Method not allowed | Método diferente a POST | Usar POST |
| `429` | Demasiadas solicitudes | Más de 10 requests en 1 minuto | Esperar 60 segundos |
| `500` | Error de configuración del servidor | `GOOGLE_API_KEY` no configurada | Configurar variable de entorno |
| `500` | No se recibió respuesta del modelo | Gemini API no respondió | Reintentar request |
| `500` | Error al procesar el documento | Error interno de Gemini | Verificar formato del PDF |

---

## Ejemplos de Uso

### JavaScript (Fetch API)

```javascript
async function extractPDF(file) {
  // Convertir archivo a Base64
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  // Enviar a API
  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pdfBase64: base64,
      filename: file.name
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Uso
const fileInput = document.getElementById('fileInput');
const result = await extractPDF(fileInput.files[0]);
console.log(result);
```

### Python

```python
import base64
import requests

def extract_pdf(file_path):
    # Leer y codificar PDF
    with open(file_path, 'rb') as f:
        pdf_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    # Enviar a API
    response = requests.post(
        'https://tu-dominio.vercel.app/api/extract',
        json={
            'pdfBase64': pdf_base64,
            'filename': file_path.split('/')[-1]
        },
        timeout=60
    )
    
    response.raise_for_status()
    return response.json()

# Uso
result = extract_pdf('cedula.pdf')
print(result)
```

### cURL

```bash
# Codificar PDF a base64 (sin saltos de línea)
BASE64_PDF=$(base64 -w 0 cedula.pdf)

# Enviar request
curl -X POST https://tu-dominio.vercel.app/api/extract \
  -H "Content-Type: application/json" \
  -d "{\"pdfBase64\":\"$BASE64_PDF\",\"filename\":\"cedula.pdf\"}"
```

### Node.js

```javascript
import fs from 'fs';
import fetch from 'node-fetch';

async function extractPDF(filePath) {
  // Leer y codificar PDF
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfBase64 = pdfBuffer.toString('base64');

  // Enviar a API
  const response = await fetch('https://tu-dominio.vercel.app/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pdfBase64: pdfBase64,
      filename: filePath.split('/').pop()
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Uso
const result = await extractPDF('./cedula.pdf');
console.log(JSON.stringify(result, null, 2));
```

---

## Rate Limiting

### Límites Actuales

- **10 requests por minuto** por dirección IP
- Ventana deslizante de 60 segundos
- Contador se resetea automáticamente

### Manejo de Rate Limit

```javascript
async function extractWithRetry(file, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: await fileToBase64(file),
          filename: file.name
        })
      });

      if (response.status === 429) {
        const data = await response.json();
        const retryAfter = data.retryAfter || 60;
        
        console.log(`Rate limit alcanzado. Esperando ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

---

## Headers de Respuesta

### CORS

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Seguridad

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

## Webhook (Próximamente)

Para procesamiento asíncrono de documentos grandes:

```json
{
  "pdfBase64": "...",
  "filename": "documento.pdf",
  "webhookUrl": "https://tu-servidor.com/webhook",
  "webhookSecret": "tu_secreto_hmac"
}
```

Respuesta inmediata:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimatedTime": 30
}
```

Callback al webhook cuando esté listo:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "result": { /* JSON extraído */ },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

---

## Monitoreo y Debugging

### Logs del Servidor

La API registra información útil para debugging:

```
[DEBUG] Received API request: POST /api/extract
[DEBUG] Content-Length: 1048576 bytes
Processing cedula.pdf (1048576 bytes) with gemini-2.0-flash
JSON parsed successfully
Successfully processed cedula.pdf
```

### Métricas Recomendadas

Para monitoreo en producción, rastrea:

- 📊 **Tasa de éxito**: % de requests que retornan 200
- ⏱️ **Latencia p95**: Tiempo de respuesta percentil 95
- 💰 **Costo por documento**: Tokens usados * precio del modelo
- 🔄 **Tasa de retry**: % de documentos que requieren reintento
- 📝 **Distribución de tipos**: Conteo por tipo de documento

---

## Mejores Prácticas

### 1. Validación del Cliente

Valida archivos **antes** de enviarlos a la API:

```javascript
function validatePDF(file) {
  // Tamaño
  if (file.size > 30 * 1024 * 1024) {
    throw new Error('Archivo muy grande (máx 30MB)');
  }

  // Extensión
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Solo archivos PDF');
  }

  // Magic bytes (async)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result).subarray(0, 4);
      const header = String.fromCharCode.apply(null, arr);
      if (header === '%PDF') {
        resolve(true);
      } else {
        reject(new Error('PDF inválido'));
      }
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}
```

### 2. Manejo de Errores

Implementa retry logic con backoff exponencial:

```javascript
async function extractWithBackoff(file) {
  const delays = [1000, 2000, 5000, 10000]; // ms
  
  for (let i = 0; i < delays.length; i++) {
    try {
      return await extractPDF(file);
    } catch (error) {
      if (i === delays.length - 1) throw error;
      
      if (error.status === 429 || error.status >= 500) {
        await new Promise(r => setTimeout(r, delays[i]));
        continue;
      }
      
      throw error; // No retry para errores 4xx
    }
  }
}
```

### 3. Caché en el Cliente

Usa el caché local para evitar requests duplicados:

```javascript
async function extractWithCache(file) {
  const hash = await generateHash(file);
  
  // Revisar caché
  const cached = await cache.get(hash);
  if (cached) {
    console.log('Cache hit!');
    return cached.data;
  }
  
  // Llamar API
  const result = await extractPDF(file);
  
  // Guardar en caché
  await cache.set(hash, file.name, result);
  
  return result;
}
```

---

## Límites y Consideraciones

### Límites de Gemini API

- **Tamaño de contexto**: ~1M tokens (suficiente para PDFs grandes)
- **Rate limits**: Según tu plan de Google AI
- **Tipos de archivo**: Solo PDF (por ahora)

### Calidad de Extracción

La precisión depende de:
- ✅ **Calidad del PDF**: Texto nativo > PDF escaneado
- ✅ **Complejidad del layout**: Tablas simples > layouts complejos
- ✅ **Idioma**: Español e inglés tienen mejor soporte
- ✅ **Calidad de escaneo**: Alta resolución > baja resolución

---

<div align="center">
  <strong>API construida para desarrolladores, optimizada para producción</strong>
</div>
