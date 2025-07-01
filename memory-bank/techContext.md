# Technology Context

## Full-Stack Architecture
- **Frontend**: React SPA with Vite build system
- **Backend**: Node.js/Express API server
- **AI Integration**: OpenAI Assistants API with function calling
- **Architecture Pattern**: Client-Server with RESTful API

## Frontend Stack
### Framework & Runtime
- **React 18**: Frontend framework for building user interfaces
- **JavaScript/JSX**: Primary programming language
- **Vite**: Modern build tool for fast development and production builds
- **Tailwind CSS**: Utility-first CSS framework for styling

### Key Frontend Dependencies
- `react`: Core React library
- `react-dom`: React DOM rendering
- `lucide-react`: Icon library for UI components

### Browser APIs Used
- **Web Speech API**: 
  - `webkitSpeechRecognition`: Speech-to-text functionality
  - `speechSynthesis`: Text-to-speech functionality
- **Fetch API**: HTTP requests to backend API
- **DOM APIs**: Standard web APIs for UI interaction

## Backend Stack
### Framework & Runtime
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **ES Modules**: Modern JavaScript module system

### Key Backend Dependencies
- `openai`: Official OpenAI API client
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `helmet`: Security middleware
- `express-rate-limit`: API rate limiting
- `dotenv`: Environment variable management
- `axios`: HTTP client for external APIs

## AI Integration
- **OpenAI Assistants API**: GPT-4 powered conversational AI
- **Function Calling**: Tool integration for weather, email, workflows
- **Thread Management**: Persistent conversation contexts
- **Tool System**: Extensible function definitions for external integrations

## Available Tools/Functions
1. **Weather Information**: Location-based weather data
2. **Email Sending**: SMTP integration capabilities
3. **n8n Workflow Triggers**: Automation workflow integration
4. **Web Search**: Information retrieval capabilities

## API Architecture
- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Communication**: Request/response format
- **Thread-based Sessions**: Persistent conversation state
- **Error Handling**: Comprehensive error responses

## Security Features
- **Rate Limiting**: API abuse prevention
- **CORS Configuration**: Cross-origin request management
- **Helmet Security**: HTTP header security
- **Environment Variables**: Secure API key management

## Development & Deployment
- **Frontend Dev Server**: Vite development server (port 3000)
- **Backend Dev Server**: Express server (port 5000)
- **Build Process**: Production-ready static files
- **Environment Configuration**: .env file management

## External Integrations
- **OpenAI Platform**: AI model access and function calling
- **n8n Workflows**: Automation platform integration
- **Weather APIs**: Real-time weather data (configurable)
- **Email Services**: SMTP providers (configurable)
