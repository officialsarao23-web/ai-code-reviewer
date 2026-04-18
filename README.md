# AI Code Reviewer Monorepo

This project is a monorepo containing both the backend and frontend for the AI Code Reviewer application.

## Project Structure
- `/backend`: FastAPI application.
- `/frontend`: React + Vite application.

## Deployment on Railway
This project is designed to be deployed as two separate services on Railway using the same GitHub repository.

### 1. Backend Service
- **Root Directory**: `/backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2. Frontend Service
- **Root Directory**: `/frontend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx serve -s dist --listen $PORT`

## Environment Variables
Ensure the required `.env` variables are added to the respective Railway services.
