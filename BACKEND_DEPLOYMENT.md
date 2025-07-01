# JARVIS Backend Deployment Guide

## Quick Deployment Options

### Option 1: Railway (Recommended for Node.js)

1. **Sign up**: Go to [Railway.app](https://railway.app) and sign up
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Connect Repository**: Link your GitHub account and select this repository
4. **Configure Service**: 
   - Select the `backend` folder as the root directory
   - Railway will auto-detect Node.js and use the start script
5. **Set Environment Variables**:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key-here
   OPENAI_ASSISTANT_ID=asst_your-assistant-id-here
   PORT=5000
   NODE_ENV=production
   CORS_ORIGIN=https://jarvis-ai-assistant.windsurf.build
   ```
6. **Deploy**: Railway will build and deploy automatically

### Option 2: Render

1. **Sign up**: Go to [Render.com](https://render.com) and create account
2. **New Web Service**: Connect your GitHub repository
3. **Configure**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. **Environment Variables**: Add the same variables as above
5. **Deploy**: Render will handle the rest

### Option 3: Vercel (Serverless Functions)

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Create vercel.json** in project root:
   ```json
   {
     "functions": {
       "backend/server.js": {
         "runtime": "@vercel/node"
       }
     },
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "/backend/server.js"
       }
     ]
   }
   ```
3. **Deploy**: `vercel --prod`
4. **Set Environment Variables**: Use Vercel dashboard

## After Backend Deployment

1. **Get Backend URL**: Copy your deployed backend URL (e.g., `https://your-app.railway.app`)

2. **Update Frontend**: Update the API base URL in your frontend:
   - In the deployed frontend, you'll need to update the `VITE_API_BASE_URL` environment variable
   - Or redeploy frontend with updated API URL

3. **Test Integration**: 
   - Visit your frontend: https://jarvis-ai-assistant.windsurf.build
   - Check that "AI Systems Online" appears (indicates backend connection)
   - Try voice or text input to test full integration

## Environment Variables Required

```env
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ASSISTANT_ID=asst_your-assistant-id-here

# Server Config
PORT=5000
NODE_ENV=production

# Security
CORS_ORIGIN=https://jarvis-ai-assistant.windsurf.build

# Optional: External APIs
WEATHER_API_KEY=your_weather_api_key_here
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
```

## Creating OpenAI Assistant

Before your backend works, you need to create the OpenAI Assistant:

1. **Get OpenAI API Key**: [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Run Setup Script**: 
   ```bash
   cd backend
   OPENAI_API_KEY=sk-your-key node setup-assistant.js
   ```
3. **Copy Assistant ID**: Use the returned ID in your environment variables

## Testing Deployment

1. **Health Check**: Visit `https://your-backend-url/health`
2. **Assistant Info**: Visit `https://your-backend-url/api/assistant`
3. **Frontend Connection**: Check your frontend shows "AI Systems Online"

## Troubleshooting

- **CORS Errors**: Ensure CORS_ORIGIN matches your frontend URL exactly
- **API Key Issues**: Verify OpenAI API key is valid and has sufficient credits
- **Build Failures**: Check Node.js version compatibility (use Node 18+)
- **Environment Variables**: Ensure all required variables are set in your hosting platform

Your JARVIS AI assistant will be fully functional once both frontend and backend are deployed and connected!
