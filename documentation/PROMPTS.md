# 🎯 Sistema de Prompts - Catastro AI

## Índice
- [Visión General](#visión-general)
- [Estructura del Prompt](#estructura-del-prompt)
- [Ingeniería de Prompts](#ingeniería-de-prompts)
- [Esquemas JSON](#esquemas-json)
- [Personalización](#personalización)
- [Mejores Prácticas](#mejores-prácticas)

---

## Visión General

El archivo `prompt.txt` es el **corazón del sistema de extracción**. Define cómo Gemini interpreta y estructura la información de los documentos. Este documento técnico explica su diseño y cómo personalizarlo.

### Ubicación

```
gemini-json-ocr-main/
└── prompt.txt          # 181 líneas de ingeniería de prompts
```

### Carga del Prompt

```javascript
// Backend (api/extract.js)
import { readFileSync } from 'fs';
const EXTRACTION_PROMPT = readFileSync(promptPath, 'utf-8');

// CLI (scan.py)
def get_prompt(args):
    default_prompt_path = Path(__file__).parent / "prompt.txt"
    return read_prompt_from_file(default_prompt_path)
```

---

## Estructura del Prompt

### 1. Definición de Rol

```
**Rol:** Eres un asistente de IA experto en el análisis exhaustivo de 
documentos legales y catastrales de México.
```

**Propósito**: Establece el contexto y expertise del modelo.

**Técnica**: **Role Playing** - El modelo adopta la perspectiva de un experto legal.

---

### 2. Objetivo Claro

```
**Objetivo:** Extraer TODA la información relevante del documento y 
devolverla en formato JSON estructurado válido.
```

**Propósito**: Define la tarea específica sin ambigüedad.

---

### 3. Restricciones de Formato

```
**IMPORTANTE:** Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido. 
NO incluyas texto explicativo, markdown, ni comentarios. Solo JSON puro.
```

**Propósito**: Elimina ambigüedad en el formato de salida.

**Técnica**: **Output Constraints** - Instrucciones explícitas para el formato.

**Resultado**: Reduce necesidad de post-procesamiento.

---

### 4. Instrucciones Paso a Paso

```markdown
**Instrucciones:**
1. Identifica el tipo de documento (Cédula Catastral, Acta Constitutiva, ...)
2. Extrae TODOS los datos relevantes
3. Si un dato no está presente, usa `null` o omite el campo
4. Devuelve SOLO el JSON, sin texto adicional
```

**Propósito**: Guía el proceso de razonamiento del modelo.

**Técnica**: **Chain of Thought Prompting** (implícito)

---

### 5. Esquemas por Tipo de Documento

```json
Para **Cédula Catastral**:
{
  "tipo_documento": "Cedula Catastral",
  "clave_catastral": "string",
  ...
}
```

**Propósito**: Define la estructura esperada de salida.

**Técnica**: **Few-Shot Learning** con ejemplos de esquemas.

---

## Ingeniería de Prompts

### Técnicas Aplicadas

#### 1. Role Playing

```
Rol: Eres un asistente de IA experto en el análisis exhaustivo de 
documentos legales y catastrales de México.
```

**Beneficio**: El modelo adopta el contexto de un experto legal, mejorando la precisión en la interpretación de términos técnicos.

---

#### 2. Output Format Specification

```
**IMPORTANTE:** Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido.
```

Combinado con:

```javascript
generationConfig: {
    responseMimeType: "application/json"
}
```

**Beneficio**: Gemini 2.0 Flash tiene modo JSON nativo que garantiza salida estructurada.

---

#### 3. Few-Shot Learning (Schema Examples)

En lugar de proporcionar ejemplos completos de documentos procesados (que consumen muchos tokens), proporcionamos **esquemas vacíos** para cada tipo:

```json
{
  "tipo_documento": "Cedula Catastral",
  "clave_catastral": "string",
  "numero_predio": "string",
  ...
}
```

**Beneficio**:
- ✅ Menor consumo de tokens vs. ejemplos completos
- ✅ Estructura clara sin sesgar el contenido
- ✅ Fácil de mantener y actualizar

---

#### 4. Error Handling Instructions

```
Si un dato no está presente, usa `null` o omite el campo
```

**Beneficio**: Previene alucinaciones del modelo cuando faltan datos.

---

#### 5. Emphasis Markers

```markdown
**IMPORTANTE:** 
**RECORDATORIO FINAL:**
```

**Beneficio**: Las palabras en negrita (**bold**) aumentan la atención del modelo a instrucciones críticas.

---

## Esquemas JSON

### Cédula Catastral

```json
{
  "tipo_documento": "Cedula Catastral",
  "clave_catastral": "string",
  "numero_predio": "string",
  "lote": "string",
  "manzana": "string",
  "tipo_predio": "string",
  "propietarios": ["string"],
  "domicilio": {
    "calle": "string",
    "numero": "string",
    "colonia": "string",
    "codigo_postal": "string",
    "municipio": "string",
    "estado": "string"
  },
  "superficies": {
    "terreno_m2": "number",
    "construccion_m2": "number",
    "total_m2": "number"
  },
  "colindancias": {
    "norte": {"medida_m": "number", "colinda_con": "string"},
    "sur": {"medida_m": "number", "colinda_con": "string"},
    "este": {"medida_m": "number", "colinda_con": "string"},
    "oeste": {"medida_m": "number", "colinda_con": "string"}
  },
  "valores_catastrales": {
    "valor_suelo": "string",
    "valor_construccion": "string",
    "valor_total": "string"
  },
  "registro_publico": {
    "folio_real": "string",
    "fecha_registro": "string",
    "inscripcion_anterior": "string",
    "volumen_anterior": "string"
  }
}
```

**Campos Clave**:
- `clave_catastral`: Identificador único del predio
- `superficies`: Medidas en metros cuadrados (tipo `number`)
- `valores_catastrales`: Valores monetarios (tipo `string` para preservar formato)

---

### Acta Constitutiva

```json
{
  "tipo_documento": "Acta Constitutiva",
  "razon_social": "string",
  "fecha_constitucion": "string",
  "objeto_social": "string",
  "duracion": "string",
  "domicilio_social": "string",
  "capital_social": {
    "monto": "string",
    "moneda": "string",
    "division": "string"
  },
  "socios": [
    {
      "nombre": "string",
      "participacion": "string"
    }
  ],
  "administracion": {
    "tipo": "string",
    "miembros": [{"nombre": "string", "cargo": "string"}]
  },
  "apoderados": [
    {
      "nombre": "string",
      "facultades": "string"
    }
  ],
  "datos_notariales": {
    "escritura_numero": "string",
    "notario_numero": "string",
    "notario_nombre": "string",
    "lugar": "string",
    "fecha": "string",
    "estado": "string"
  },
  "registro_comercio": {
    "folio_mercantil": "string",
    "fecha_inscripcion": "string",
    "lugar": "string"
  }
}
```

**Campos Clave**:
- `razon_social`: Nombre legal completo de la empresa
- `socios`: Array de objetos con participación de cada socio
- `datos_notariales`: Información de la escritura pública

---

### Certificado de Libertad o Gravamen

```json
{
  "tipo_documento": "Certificado Libertad Gravamen",
  "folio_real": "string",
  "fecha_expedicion": "string",
  "titulares": ["string"],
  "descripcion_inmueble": "string",
  "situacion_juridica": "string",
  "gravamenes": [
    {
      "tipo_acto": "string",
      "acreedor": "string",
      "deudor": "string",
      "monto": "string",
      "fecha_inscripcion": "string",
      "datos_origen": "string"
    }
  ],
  "anotaciones": "string",
  "registro_anterior": {
    "inscripcion": "string",
    "volumen": "string",
    "fecha": "string"
  },
  "funcionario": "string"
}
```

**Campos Clave**:
- `situacion_juridica`: "Libre de gravamen" o descripción de cargas
- `gravamenes`: Array (puede estar vacío si no hay gravámenes)
- `folio_real`: Identificador del Registro Público

---

### Contrato de Compraventa

```json
{
  "tipo_documento": "Contrato Compraventa",
  "vendedor": {
    "nombre": "string",
    "representante": "string"
  },
  "comprador": {
    "nombre": "string",
    "estado_civil": "string"
  },
  "regimen_matrimonial": "string",
  "inmueble": {
    "lote": "string",
    "manzana": "string",
    "tipo_predio": "string",
    "estado": "string",
    "ubicacion": "string",
    "superficie": "string",
    "colindancias": {
      "norte": "string",
      "sur": "string",
      "este": "string",
      "oeste": "string"
    }
  },
  "datos_notariales": {
    "escritura": "string",
    "notario_nombre": "string",
    "notario_numero": "string"
  },
  "registro_anterior": {
    "inscripcion": "string",
    "volumen": "string",
    "libro": "string",
    "fecha": "string"
  },
  "operacion": {
    "precio": "string",
    "fecha": "string"
  }
}
```

**Campos Clave**:
- `vendedor` y `comprador`: Partes de la transacción
- `operacion.precio`: Monto de la compraventa
- `inmueble`: Descripción completa de la propiedad

---

## Personalización

### Agregar un Nuevo Tipo de Documento

**Ejemplo**: Agregar soporte para "Escritura de Hipoteca"

#### 1. Actualizar Instrucciones

```markdown
**Instrucciones:**
1. Identifica el tipo de documento (Cédula Catastral, Acta Constitutiva, 
   Certificado de Libertad/Gravamen, Contrato de Compraventa, 
   **Escritura de Hipoteca**)
```

#### 2. Agregar Esquema

```markdown
Para **Escritura de Hipoteca**:
```json
{
  "tipo_documento": "Escritura Hipoteca",
  "deudor": {
    "nombre": "string",
    "estado_civil": "string"
  },
  "acreedor": {
    "nombre": "string",
    "tipo": "string"
  },
  "credito": {
    "monto": "string",
    "moneda": "string",
    "tasa_interes": "string",
    "plazo": "string"
  },
  "inmueble_garantia": {
    "descripcion": "string",
    "folio_real": "string",
    "valor_avaluo": "string"
  },
  "datos_notariales": {
    "escritura_numero": "string",
    "notario_numero": "string",
    "notario_nombre": "string",
    "fecha": "string"
  }
}
```
```

#### 3. Validar Frontend

Actualizar `viewer.js` si necesitas renderizado especial:

```javascript
const title = data.tipo_documento || 
              data.CONTRACT_TYPE || 
              'Documento Extraído';

// Maneja el nuevo tipo
if (title === 'Escritura Hipoteca') {
    // Renderizado custom si es necesario
}
```

---

### Modificar Campos Existentes

**Ejemplo**: Agregar campo `rfc` a propietarios en Cédula Catastral

```json
{
  "tipo_documento": "Cedula Catastral",
  "propietarios": [
    {
      "nombre": "string",
      "rfc": "string"
    }
  ],
  // ... resto de campos
}
```

> ⚠️ **Nota**: Cambiar de `["string"]` a `[{objeto}]` puede romper resultados existentes en caché.

---

### Agregar Validaciones

**Ejemplo**: Asegurar formato de RFC

```markdown
**Instrucciones adicionales:**
- El campo `rfc` debe tener 13 caracteres para personas físicas
- El campo `rfc` debe tener 12 caracteres para personas morales
- Si el RFC no está disponible, usa `null`
```

---

## Mejores Prácticas

### 1. Tipos de Datos

```json
// ✅ Números como number (para cálculos)
"terreno_m2": 250.5

// ✅ Valores monetarios como string (preserva formato)
"valor_total": "$2,100,000.00 MXN"

// ✅ Fechas como string ISO 8601
"fecha_registro": "2020-05-15"

// ❌ Evitar fechas como timestamp
"fecha_registro": 1589500800000
```

**Razón**: Los tipos string preservan el formato original del documento.

---

### 2. Manejo de Valores Faltantes

```json
// ✅ Opción 1: Usar null
"codigo_postal": null

// ✅ Opción 2: Omitir el campo (preferido)
{
  "calle": "Reforma",
  "numero": "123"
  // codigo_postal omitido
}

// ❌ No usar strings vacíos
"codigo_postal": ""

// ❌ No usar valores placeholder
"codigo_postal": "N/A"
```

---

### 3. Arrays vs. Objetos

```json
// ✅ Arrays para listas de items similares
"propietarios": ["Juan Pérez", "María López"]

// ✅ Objetos para datos estructurados
"domicilio": {
  "calle": "Reforma",
  "numero": "123"
}

// ❌ No mezclar arrays con objetos simples
"propietarios": {
  "0": "Juan Pérez",
  "1": "María López"
}
```

---

### 4. Nombres de Campos

```json
// ✅ snake_case consistente
"clave_catastral": "...",
"numero_predio": "..."

// ❌ No mezclar convenciones
"claveCatastral": "...",
"numero_predio": "..."
```

---

### 5. Documentación de Cambios

Mantén un registro de versiones del prompt:

```markdown
<!-- Historial de Cambios -->
<!-- 
v1.0 (2023-12-01): Versión inicial con 4 tipos de documentos
v1.1 (2023-12-15): Agregado campo rfc a propietarios
v1.2 (2024-01-05): Agregado soporte para Escritura de Hipoteca
-->
```

---

## Testing del Prompt

### 1. Test de Consistencia

Procesa el mismo documento varias veces y verifica que el output sea idéntico:

```python
results = [extract_pdf('cedula.pdf') for _ in range(5)]
assert all(r == results[0] for r in results)
```

### 2. Test de Esquema

Valida que el output cumple con el esquema:

```javascript
function validateSchema(data, type) {
    const schemas = {
        'Cedula Catastral': {
            required: ['tipo_documento', 'clave_catastral'],
            optional: ['propietarios', 'domicilio', 'superficies']
        }
    };
    
    const schema = schemas[type];
    return schema.required.every(field => field in data);
}
```

### 3. Test de Campos Específicos

```javascript
// Validar que superficies sean números
assert(typeof data.superficies.terreno_m2 === 'number');

// Validar formato de fecha
assert(/^\d{4}-\d{2}-\d{2}$/.test(data.fecha_registro));

// Validar que arrays no estén vacíos cuando son requeridos
assert(data.propietarios.length > 0);
```

---

## Optimización de Tokens

### Actual: ~1,200 tokens (prompt.txt)

### Estrategias para Reducir:

#### 1. Eliminar Ejemplos Redundantes

```markdown
<!-- Antes: 4 esquemas completos = ~800 tokens -->
Para Cédula Catastral: { ... 50 campos ... }
Para Acta Constitutiva: { ... 40 campos ... }

<!-- Después: Referencia a esquemas externos -->
Consulta los esquemas en: esquemas.json
```

**Ahorro**: ~400 tokens, pero pierde claridad.

#### 2. Comprimir Instrucciones

```markdown
<!-- Antes: ~200 tokens -->
**Instrucciones:**
1. Identifica el tipo de documento (Cédula Catastral, Acta Constitutiva, ...)
2. Extrae TODOS los datos relevantes del documento
3. Si un dato no está presente en el documento, usa `null` o omite el campo

<!-- Después: ~100 tokens -->
**Instrucciones:**
1. Identifica tipo de doc
2. Extrae todos los datos
3. Usa null si dato falta
```

**Ahorro**: ~100 tokens, pero reduce claridad.

---

### Recomendación

**No optimizar tokens prematuramente**. La claridad del prompt es más valiosa que ahorrar 200 tokens (~$0.0001 por request).

**Métricas actuales**:
- Prompt: ~1,200 tokens
- PDF típico: ~10,000 tokens
- **Total input**: ~11,200 tokens
- **Costo**: ~$0.001 por documento (Gemini 2.0 Flash)

---

## Troubleshooting

### Problema 1: Gemini retorna texto en lugar de JSON

**Síntomas**:
```
El documento es una Cédula Catastral que contiene...
```

**Solución**:
```javascript
// Asegurar que generationConfig esté presente
generationConfig: {
    responseMimeType: "application/json"
}
```

**Razón**: Sin `responseMimeType`, Gemini puede responder en lenguaje natural.

---

### Problema 2: JSON con markdown code blocks

**Síntomas**:
```
```json
{
  "tipo_documento": "..."
}
```
```

**Solución**:
```javascript
// En api/extract.js ya está implementado:
let cleanedResponse = responseText.trim();
if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '');
}
```

---

### Problema 3: Campos inconsistentes entre requests

**Síntomas**: Mismo documento, diferentes nombres de campos.

**Solución**: Agregar más énfasis a los esquemas:

```markdown
**IMPORTANTE**: Usa EXACTAMENTE los nombres de campos mostrados en los esquemas.
No uses variaciones o traducciones.

Ejemplo correcto: "clave_catastral"
Ejemplo incorrecto: "claveCatastral", "Clave Catastral", "clavecat"
```

---

### Problema 4: Tipos de datos incorrectos

**Síntomas**: `"terreno_m2": "250.5"` (string en lugar de number)

**Solución**: Especificar tipos explícitamente:

```json
"superficies": {
    "terreno_m2": "number",  // 👈 Tipo explícito
    "construccion_m2": "number"
}
```

Y agregar instrucción:

```markdown
Los campos marcados como "number" DEBEN ser números, no strings.
Los campos marcados como "string" DEBEN ser strings.
```

---

## Métricas de Calidad

### KPIs del Prompt

1. **Tasa de Parsing**: % de responses que parsean como JSON válido
   - **Objetivo**: > 99%
   - **Actual**: ~98% (con fallback parsing)

2. **Consistencia de Esquema**: % de responses que coinciden con el esquema
   - **Objetivo**: > 95%
   - **Actual**: ~92%

3. **Completitud de Campos**: % de campos requeridos presentes
   - **Objetivo**: > 90%
   - **Actual**: ~88%

4. **Precisión de Datos**: % de campos con valores correctos (validación manual)
   - **Objetivo**: > 95%
   - **Actual**: ~94%

---

## Próximas Mejoras

1. **Versionado de Prompts**
   ```
   prompt-v1.0.txt
   prompt-v1.1.txt
   ```
   Permitir seleccionar versión en request.

2. **Prompts Especializados**
   ```
   prompt-cedula.txt
   prompt-acta.txt
   prompt-certificado.txt
   ```
   Prompts optimizados por tipo de documento.

3. **Validation Schemas (JSON Schema)**
   ```json
   {
     "$schema": "http://json-schema.org/draft-07/schema#",
     "type": "object",
     "properties": {
       "tipo_documento": { "type": "string" }
     }
   }
   ```
   Validación automática de output.

4. **Prompt A/B Testing**
   Comparar variaciones de prompt para optimizar calidad.

---

<div align="center">
  <strong>El prompt es código - versiona, testa y optimiza como tal</strong>
</div>
