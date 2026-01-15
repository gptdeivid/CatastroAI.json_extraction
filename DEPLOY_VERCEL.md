# 🚀 Guía de Despliegue en Vercel

Esta guía explica cómo desplegar **Catastro AI** (Gemini JSON OCR) en Vercel.

---

## 📋 Prerequisitos

1. **Cuenta de Vercel**: Créala en [vercel.com](https://vercel.com)
2. **Cuenta de GitHub**: Para conectar tu repositorio
3. **API Key de Gemini**: Obtén una en [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 🔧 Método 1: Despliegue desde GitHub (Recomendado)

### Paso 1: Subir código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### Paso 2: Conectar con Vercel

1. Ve a [vercel.com/new](https://vercel.com/new)
2. Haz clic en **"Import Git Repository"**
3. Selecciona tu repositorio de GitHub
4. Vercel detectará automáticamente la configuración

### Paso 3: Configurar Variables de Entorno

En la pantalla de configuración, agrega las siguientes variables:

| Variable | Valor | Requerida |
|----------|-------|-----------|
| `GOOGLE_API_KEY` | Tu API key de Gemini | ✅ Sí |
| `GEMINI_MODEL` | `gemini-2.0-flash` | ❌ No (por defecto) |
| `ALLOWED_ORIGIN` | `https://tu-app.vercel.app` | ❌ No |
| `NODE_ENV` | `production` | ❌ No |

### Paso 4: Desplegar

Haz clic en **"Deploy"** y espera a que termine el proceso.

---

## 🔧 Método 2: Despliegue desde CLI

### Paso 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Paso 2: Login en Vercel

```bash
vercel login
```

### Paso 3: Desplegar

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

O usa el script predefinido:

```bash
npm run deploy
```

---

## ⚙️ Configuración del Proyecto

El archivo `vercel.json` ya está configurado:

```json
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/public/$1" }
  ],
  "functions": {
    "api/extract.js": {
      "memory": 1024,
      "maxDuration": 60,
      "maxRequestBodySize": "50mb"
    }
  }
}
```

### Detalles de la configuración:

- **`@vercel/node`**: Ejecuta las funciones serverless en Node.js
- **`@vercel/static`**: Sirve los archivos estáticos desde `/public`
- **`maxDuration: 60`**: Tiempo máximo de ejecución de 60 segundos
- **`maxRequestBodySize: 50mb`**: Permite subir archivos hasta 50MB

---

## 🔐 Variables de Entorno en Producción

### Agregar después del despliegue:

1. Ve a tu proyecto en el dashboard de Vercel
2. Navega a **Settings** → **Environment Variables**
3. Agrega las variables necesarias:

```
GOOGLE_API_KEY = AIzaSy...tu-api-key
GEMINI_MODEL = gemini-2.0-flash
NODE_ENV = production
```

> ⚠️ **Importante**: Nunca commits tu `.env` con la API key real al repositorio.

---

## 🔄 Actualizaciones Automáticas

Con la integración de GitHub:
- Cada **push a `main`** → Despliegue automático a producción
- Cada **Pull Request** → Preview deployment con URL única

---

## 🐛 Troubleshooting

### Error: "Function timed out"
- La función tiene un límite de 60 segundos
- Archivos muy grandes pueden exceder este límite

### Error: "Payload too large"
- El límite es 50MB para archivos
- Comprime los PDFs antes de subir

### Error: "GOOGLE_API_KEY not set"
1. Ve a Settings → Environment Variables
2. Asegúrate de que `GOOGLE_API_KEY` esté configurada
3. Redespliega el proyecto

### Ver logs de funciones
1. Dashboard de Vercel → Tu proyecto
2. **Deployments** → Selecciona un deployment
3. **Functions** → Ver logs en tiempo real

---

## 📊 Monitoreo

Vercel proporciona:
- **Analytics**: Métricas de uso y rendimiento
- **Logs**: Logs de las funciones serverless
- **Speed Insights**: Análisis de rendimiento web

---

## ✅ Checklist de Despliegue

- [ ] Código subido a GitHub
- [ ] Proyecto importado en Vercel
- [ ] `GOOGLE_API_KEY` configurada
- [ ] Despliegue completado exitosamente
- [ ] Probar subida de documento PDF
- [ ] Verificar extracción de datos

---

💡 **Tip**: Usa `vercel dev` localmente para simular el entorno de Vercel antes de desplegar.
