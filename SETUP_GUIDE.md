# JARVIS AI Assistant - Setup Guide

## Overview
Your JARVIS application is now a full-stack AI assistant powered by OpenAI's Assistants API with function calling capabilities. The system includes:

- **Frontend**: React/Vite SPA with voice interaction
- **Backend**: Node.js/Express API server
- **AI Integration**: OpenAI Assistants API with tools
- **Tools**: Weather, email, n8n workflows, web search

## Prerequisites
1. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Node.js**: Version 18+ installed
3. **npm**: Package manager (comes with Node.js)

## Setup Instructions

### 1. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your credentials:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ASSISTANT_ID=asst_your-assistant-id-here

# Server Configuration
PORT=5000
NODE_ENV=development

# Security
CORS_ORIGIN=http://localhost:3000

# Optional: External API Keys for tools
WEATHER_API_KEY=your_weather_api_key_here
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
```

### 2. Create OpenAI Assistant
Run the setup script to create your JARVIS assistant:
```bash
cd backend
node setup-assistant.js
```

This will:
- Create a new OpenAI Assistant named "JARVIS"
- Configure it with all the tool functions
- Return an Assistant ID that you need to add to your `.env` file

Copy the Assistant ID and update your `.env` file:
```env
OPENAI_ASSISTANT_ID=asst_the-id-from-setup-script
```

### 3. Start the Application

#### Terminal 1 - Backend Server:
```bash
cd backend
npm run dev
```
This starts the backend API server on http://localhost:5000

#### Terminal 2 - Frontend Development:
```bash
cd ../  # Back to project root
npm run dev
```
This starts the frontend on http://localhost:3000

### 4. Test the Integration
1. Open http://localhost:3000 in your browser
2. You should see "AI Systems Online" status indicator
3. Try speaking or typing: "What's the weather like in San Francisco?"
4. JARVIS will respond using real AI and can execute tool functions

## Available Tools & Capabilities

### 1. Weather Information
- **Trigger**: "What's the weather in [location]?"
- **Function**: `get_weather`
- **Status**: Mock implementation (replace with real weather API)

### 2. Email Sending
- **Trigger**: "Send an email to [email] about [subject]"
- **Function**: `send_email`
- **Status**: Mock implementation (replace with SMTP service)

### 3. n8n Workflow Triggers
- **Trigger**: "Trigger the [workflow name] automation"
- **Function**: `trigger_n8n_workflow`
- **Status**: Mock implementation (configure with your n8n webhook URL)

### 4. Web Search
- **Trigger**: "Search for information about [query]"
- **Function**: `search_web`
- **Status**: Mock implementation (replace with search API)

## Deployment Options

### Option 1: Netlify (Frontend) + Railway/Render (Backend)
1. **Frontend**: Deploy `dist/` folder to Netlify
2. **Backend**: Deploy to Railway or Render
3. **Update**: Change `API_BASE` in frontend to production backend URL

### Option 2: Vercel Full Stack
1. Configure `vercel.json` for both frontend and backend
2. Deploy entire project to Vercel

### Option 3: DigitalOcean/AWS
1. Set up server with Node.js
2. Configure nginx reverse proxy
3. Use PM2 for process management

## Customization

### Adding New Tools
1. Add tool definition in `backend/server.js` `tools` array
2. Implement function in `toolFunctions` object
3. Update assistant with new tools: `node setup-assistant.js`

### Example New Tool:
```javascript
// In tools array
{
  type: "function",
  function: {
    name: "check_calendar",
    description: "Check calendar events for a specific date",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format" }
      },
      required: ["date"]
    }
  }
}

// In toolFunctions object
check_calendar: async (args) => {
  const { date } = args;
  // Implement calendar integration
  return { events: [], date };
}
```

## Troubleshooting

### Backend Issues
- **"Backend not available"**: Check if backend server is running on port 5000
- **OpenAI errors**: Verify API key and Assistant ID in `.env`
- **CORS errors**: Ensure CORS_ORIGIN matches frontend URL

### Frontend Issues
- **"AI Systems Offline"**: Backend connection failed
- **No voice input**: Check browser permissions for microphone
- **Build errors**: Run `npm run build` to check for issues

### OpenAI Issues
- **Rate limits**: Upgrade OpenAI plan or implement usage tracking
- **Token limits**: Monitor token usage in OpenAI dashboard
- **Function errors**: Check tool function implementations

## Architecture Details

### Frontend (React/Vite)
- Entry: `src/main.jsx`
- Main Component: `src/components/JarvisAgent.jsx`
- Styling: Tailwind CSS
- Build Output: `dist/`

### Backend (Node.js/Express)
- Entry: `backend/server.js`
- Assistant Setup: `backend/setup-assistant.js`
- Port: 5000
- API Endpoints:
  - `GET /health` - Health check
  - `POST /api/thread` - Create/get conversation thread
  - `POST /api/chat` - Send message to AI
  - `GET /api/assistant` - Get assistant info

### API Communication Flow
1. Frontend sends message to `/api/chat`
2. Backend adds message to OpenAI thread
3. Backend runs assistant with tools
4. Assistant may call tool functions
5. Backend submits tool outputs to OpenAI
6. Backend returns AI response to frontend
7. Frontend displays response and speaks it

## Next Steps
1. Configure your OpenAI API key
2. Create the assistant using the setup script
3. Test the application locally
4. Customize tools for your specific needs
5. Deploy to your chosen platform
6. Connect real external services (weather, email, etc.)

Your JARVIS AI assistant is now ready to serve as a powerful, voice-activated AI companion with real tool integration capabilities!
