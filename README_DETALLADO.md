# 📄 Gemini JSON OCR - Extractor de Datos Catastrales

> **Sistema de extracción inteligente de información de documentos legales y catastrales mexicanos utilizando Google Gemini AI**

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-3%20Flash-orange.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Tipos de Documentos Soportados](#-tipos-de-documentos-soportados)
- [Estructura de Datos Extraídos](#-estructura-de-datos-extraídos)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso del Sistema](#-uso-del-sistema)
- [Configuración Avanzada](#-configuración-avanzada)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Ejemplos de Salida](#-ejemplos-de-salida)

---

## 🎯 Descripción General

**Gemini JSON OCR** es una herramienta de línea de comandos que utiliza la API de Google Gemini para analizar documentos PDF escaneados y extraer información estructurada en formato JSON. Está especialmente diseñada para procesar documentos legales y catastrales del sistema mexicano.

### Características Principales

| Característica | Descripción |
|---------------|-------------|
| 🔍 **OCR Inteligente** | Reconocimiento óptico de caracteres potenciado por IA |
| 📊 **Salida Estructurada** | Datos extraídos en formato JSON estandarizado |
| 🇲🇽 **Especializado en México** | Optimizado para documentos catastrales mexicanos |
| 📁 **Procesamiento por Lotes** | Procesa múltiples PDFs en un directorio |
| ⚡ **API Moderna** | Utiliza Gemini 3 Flash para respuestas rápidas |

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
│                    (Línea de Comandos)                          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        scan.py                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Argument       │  │  File           │  │  Gemini         │  │
│  │  Parser         │──│  Scanner        │──│  Client         │  │
│  │                 │  │  (PDF files)    │  │  Integration    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    prompt.txt                                    │
│                                                                  │
│  Instrucciones detalladas para la extracción de:                │
│  • Cédulas Catastrales                                          │
│  • Actas Constitutivas                                          │
│  • Certificados de Libertad/Gravamen                            │
│  • Contratos de Compraventa                                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Google Gemini API                              │
│                                                                  │
│  Modelo: gemini-3-flash-preview                                 │
│  Entrada: PDF binario + Prompt estructurado                     │
│  Salida: JSON estructurado (response_mime_type: application/json)│
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Archivos de Salida                            │
│                                                                  │
│  documento.pdf → documento.pdf.json                              │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Procesamiento

1. **Entrada**: El usuario proporciona un directorio con archivos PDF
2. **Escaneo**: El sistema identifica todos los PDFs en el directorio
3. **Lectura**: Cada PDF se lee como datos binarios
4. **Envío a Gemini**: El PDF + prompt se envían a la API de Gemini
5. **Procesamiento IA**: Gemini analiza el documento visualmente
6. **Extracción**: La IA identifica y extrae los datos según el prompt
7. **Salida**: Se genera un archivo JSON por cada PDF procesado

---

## 📄 Tipos de Documentos Soportados

### 1. Cédula Catastral
Documento que contiene información registral de un inmueble.

**Datos Extraídos:**
- Clave Catastral
- Número de Predio / Cuenta Predial
- Propietario(s) Registral(es)
- Domicilio del Inmueble
- Superficies (Terreno, Construcción, Total)
- Medidas y Colindancias (Norte, Sur, Este, Oeste)
- Valores Catastrales
- Datos de Registro Público

### 2. Acta Constitutiva
Documento de constitución de sociedades mercantiles.

**Datos Extraídos:**
- Razón Social
- Fecha de Constitución
- Objeto Social
- Duración de la Sociedad
- Capital Social y estructura
- Socios/Accionistas con RFC y participación
- Órgano de Administración
- Apoderados Legales
- Datos de Protocolización Notarial
- Inscripción en Registro Público de Comercio

### 3. Certificado de Libertad o Gravamen
Documento que certifica el estado jurídico de un inmueble.

**Datos Extraídos:**
- Número de Folio Real
- Fecha de Expedición
- Titular(es) Registral(es)
- Descripción del Inmueble
- Situación Jurídica Actual
- Detalle de Gravámenes (si aplica)
- Anotaciones Preventivas
- Funcionario que Certifica

### 4. Contrato de Compraventa
Documento de transferencia de propiedad inmueble.

**Datos Extraídos:**
- Vendedor(es) con CURP y RFC
- Comprador(es) con CURP y RFC
- Régimen Matrimonial
- Descripción del Inmueble
- Datos Notariales
- Datos de Registro Público

---

## 📊 Estructura de Datos Extraídos

### Ejemplo de Salida JSON (Contrato de Compraventa)

```json
[
  {
    "CONTRACT_TYPE": "Compra Venta",
    "DATE": "December 11, 1992",
    "SELLER": "Nacional Financiera, S.N.C.",
    "SELLER_REPRESENTATIVE": "Isaias Alvarez Olivos",
    "BUYER": "Misael Soto Esparza and Andrea Fuerte Gaspar",
    "PROPERTY_LOCATION": "Terreno de el Mezquital de Apodaca, N.L.",
    "PROPERTY_DETAILS": {
      "AREA": "459 HS. 2065.00 M2",
      "URBANIZATION_STATUS": "Urbanizacion progresiva",
      "CADASTRAL_ZONE": "Region Catastral No.28",
      "SUBDIVISION_NAME": "Nuevo Amanecer I Sector",
      "SUBDIVISION_REGISTRY_DETAILS": "No.12, Volumen 43, Libro 3..."
    },
    "PAYMENT_DETAILS": {
      "AMOUNT": "$247,795.00"
    },
    "ADDITIONAL_NOTES": [
      "Both parties declare no causes of nullity...",
      "The property is sold free of all encumbrances..."
    ]
  }
]
```

---

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Python 3.9+** (gestionado automáticamente por `uv`)
- **API Key de Google AI Studio** ([Obtener aquí](https://aistudio.google.com/app/apikey))

### Paso 1: Instalar uv (Gestor de Paquetes)

```powershell
# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Paso 2: Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```env
GOOGLE_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-3-flash-preview
```

> ⚠️ **IMPORTANTE**: Nunca compartas tu API Key. El archivo `.env` está incluido en `.gitignore`.

### Paso 3: Verificar Instalación

```powershell
uv run scan.py --help
```

---

## 💻 Uso del Sistema

### Comando Básico

```powershell
uv run scan.py "C:\ruta\a\directorio\con\pdfs"
```

### Con Opción de Sobrescritura

```powershell
uv run scan.py --overwrite "C:\ruta\a\directorio\con\pdfs"
```

### Especificar Directorio con Flag

```powershell
uv run scan.py --directory "C:\ruta\a\directorio\con\pdfs"
```

### Modo Debug

```powershell
$env:DEBUG="true"; uv run scan.py "C:\ruta\a\directorio"
```

---

## ⚙️ Configuración Avanzada

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `GOOGLE_API_KEY` | API Key de Google AI Studio | (Requerida) |
| `GEMINI_MODEL` | Modelo de Gemini a utilizar | `gemini-3-flash-preview` |
| `DEBUG` | Habilitar modo debug | `false` |

### Personalizar el Prompt

El archivo `prompt.txt` contiene las instrucciones de extracción. Puedes modificarlo para:

- Agregar nuevos tipos de documentos
- Cambiar el formato de salida
- Añadir campos adicionales a extraer
- Modificar las instrucciones de procesamiento

---

## 📁 Estructura del Proyecto

```
gemini-json-ocr/
├── 📄 scan.py              # Script principal de procesamiento
├── 📝 prompt.txt           # Instrucciones de extracción para Gemini
├── 📋 pyproject.toml       # Configuración del proyecto y dependencias
├── 🔒 .env                 # Variables de entorno (no versionado)
├── 📖 README.md            # Documentación básica
├── 📖 README_DETALLADO.md  # Esta documentación
├── 📜 LICENSE              # Licencia MIT
├── 🔧 .gitignore           # Archivos ignorados por Git
├── 🔧 .python-version      # Versión de Python (3.12)
├── 🔧 .pre-commit-config.yaml # Configuración de pre-commit hooks
├── 📂 .venv/               # Entorno virtual (generado)
└── 📂 .vscode/             # Configuración de VS Code
```

### Dependencias Principales

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `python-dotenv` | Latest | Carga de variables de entorno |
| `google-genai` | Latest | Cliente oficial de Google Gemini |

### Dependencias de Desarrollo

| Paquete | Propósito |
|---------|-----------|
| `ruff` | Linter y formateador de código |
| `ty` | Type checker |

---

## 🔧 Funcionamiento Interno

### Función Principal: `process_with_gemini()`

```python
def process_with_gemini(path: str, client: genai.Client, prompt: str) -> str:
    # 1. Leer archivo PDF como bytes
    with open(path, "rb") as f:
        file_bytes = f.read()
    
    # 2. Detectar tipo MIME
    mime_type, _ = mimetypes.guess_type(path)  # application/pdf
    
    # 3. Enviar a Gemini con respuesta JSON forzada
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            prompt,  # Instrucciones de extracción
            genai.types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
        ],
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json"  # Fuerza salida JSON
        ),
    )
    
    return response.text
```

### Puntos Clave de la Implementación

1. **Procesamiento Visual Nativo**: Gemini analiza el PDF visualmente, no requiere conversión previa a imágenes
2. **Respuesta JSON Forzada**: El parámetro `response_mime_type` garantiza salida JSON válida
3. **Procesamiento por Lotes**: Escanea directorio y procesa todos los PDFs encontrados
4. **Idempotencia**: Con `--overwrite=false`, no reprocesa documentos ya convertidos

---

## ⚠️ Limitaciones Actuales

| Limitación | Descripción |
|------------|-------------|
| 📱 Sin interfaz gráfica | Solo disponible via CLI |
| 💻 Local únicamente | Requiere ejecución en máquina local |
| 🔐 API Key expuesta | La configuración actual no protege la API en producción |
| 📦 Sin caché | Cada ejecución reprocesa (sin --overwrite) |
| 🌐 Sin endpoint web | No expone una API REST |

---

## 📞 Soporte

Para reportar problemas o sugerir mejoras, por favor abre un issue en el repositorio.

---

**Versión**: 0.1.0  
**Licencia**: MIT  
**Última actualización**: Enero 2026
