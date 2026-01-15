# Deploy to Google Cloud Run

This guide covers deploying Catastro AI to Google Cloud Run.

## Prerequisites

1. **Google Cloud CLI** installed: [Install gcloud](https://cloud.google.com/sdk/docs/install)
2. **Docker** installed (for local testing): [Install Docker](https://docs.docker.com/get-docker/)
3. **Google Cloud Project** with billing enabled
4. **Google API Key** for Gemini AI

## Quick Deploy

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### 3. Deploy to Cloud Run

```bash
# Build and deploy in one command
gcloud run deploy catastro-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GOOGLE_API_KEY=your_api_key_here" \
  --memory 1Gi \
  --timeout 60s
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Yes | Google AI Studio API key |
| `GEMINI_MODEL` | No | Model name (default: `gemini-2.0-flash`) |
| `ALLOWED_ORIGIN` | No | CORS origin (default: `*`) |
| `NODE_ENV` | No | Environment (default: `production`) |

### Using Secret Manager (Recommended)

```bash
# Create secret
echo -n "your_api_key" | gcloud secrets create google-api-key --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding google-api-key \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy catastro-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets "GOOGLE_API_KEY=google-api-key:latest" \
  --memory 1Gi \
  --timeout 60s
```

## Local Testing

### With Docker

```bash
# Build image
npm run docker:build

# Run container
docker run -p 8080:8080 -e GOOGLE_API_KEY=your_key catastro-ai

# Open http://localhost:8080
```

### Without Docker

```bash
# Install dependencies
npm install

# Run production server
npm start

# Open http://localhost:8080
```

## Update Deployment

```bash
gcloud run deploy catastro-ai --source . --region us-central1
```

## View Logs

```bash
gcloud run logs read catastro-ai --region us-central1 --limit 50
```

## Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service catastro-ai \
  --domain your-domain.com \
  --region us-central1
```

## Costs

Cloud Run charges only for actual usage:
- **CPU**: ~$0.00001800/vCPU-second
- **Memory**: ~$0.00000200/GiB-second
- **Requests**: ~$0.40/million requests

Free tier includes 2 million requests/month.
