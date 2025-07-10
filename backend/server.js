import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Configure multer for file uploads
const uploadDir = join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5050;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [process.env.CORS_ORIGIN || 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:53236'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Store for thread management
const threadStore = new Map();

// Tool definitions for OpenAI Assistant
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather information for a location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA"
          }
        },
        required: ["location"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to a recipient",
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Email address of the recipient"
          },
          subject: {
            type: "string",
            description: "Subject line of the email"
          },
          body: {
            type: "string",
            description: "Body content of the email"
          }
        },
        required: ["to", "subject", "body"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trigger_n8n_workflow",
      description: "Trigger an n8n workflow with data",
      parameters: {
        type: "object",
        properties: {
          workflow_name: {
            type: "string",
            description: "Name or identifier of the n8n workflow"
          },
          data: {
            type: "object",
            description: "Data to send to the workflow"
          }
        },
        required: ["workflow_name", "data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          }
        },
        required: ["query"]
      }
    }
  }
];

// Tool function implementations
const toolFunctions = {
  get_weather: async (args) => {
    const { location } = args;
    // Mock weather data - replace with actual weather API
    return {
      location,
      temperature: "72°F",
      condition: "Sunny",
      humidity: "45%",
      timestamp: new Date().toISOString()
    };
  },

  send_email: async (args) => {
    const { to, subject, body } = args;
    // Mock email sending - replace with actual email service
    console.log(`Sending email to ${to}: ${subject}`);
    return {
      success: true,
      message: `Email sent to ${to}`,
      timestamp: new Date().toISOString()
    };
  },

  trigger_n8n_workflow: async (args) => {
    const { workflow_name, data } = args;
    
    try {
      // Get n8n webhook URL from environment
      const n8nBaseUrl = process.env.N8N_BASE_URL || 'https://n8n.scrapha.com';
      const webhookUrl = `${n8nBaseUrl}/webhook/${workflow_name}`;
      
      console.log(`Triggering n8n workflow: ${workflow_name}`, data);
      
      // Call n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.N8N_API_KEY ? `Bearer ${process.env.N8N_API_KEY}` : undefined
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: 'jarvis-ai'
        })
      });
      
      if (!response.ok) {
        throw new Error(`N8N workflow failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        success: true,
        workflow: workflow_name,
        result: result,
        triggered_at: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error triggering n8n workflow ${workflow_name}:`, error);
      return {
        success: false,
        workflow: workflow_name,
        error: error.message,
        triggered_at: new Date().toISOString()
      };
    }
  },

  search_web: async (args) => {
    const { query } = args;
    // Mock web search - replace with actual search API
    return {
      query,
      results: [
        {
          title: "Sample Search Result",
          url: "https://example.com",
          snippet: "This is a mock search result for demonstration purposes."
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create or get thread
app.post('/api/thread', async (req, res) => {
  try {
    const { userId } = req.body;
    const threadKey = userId || 'default';
    
    if (threadStore.has(threadKey)) {
      return res.json({ threadId: threadStore.get(threadKey) });
    }

    const thread = await openai.beta.threads.create();
    threadStore.set(threadKey, thread.id);
    
    res.json({ threadId: thread.id });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// Send message to assistant
app.post('/api/chat', upload.array('files'), async (req, res) => {
  try {
    const { message, threadId, agent, workflow } = req.body;
    const files = req.files;

    if ((!message && (!files || files.length === 0)) || !threadId) {
      return res.status(400).json({ error: 'Message or files, and threadId are required' });
    }
    
    // Enhanced system prompt based on selected agent
    let systemPrompt = '';
    switch(agent) {
      case 'financial':
        systemPrompt = 'You are a financial assistant. Help users with budgeting, expense tracking, and financial planning. Always trigger the financial-agent workflow for financial tasks.';
        break;
      case 'tasks':
        systemPrompt = 'You are a task organization assistant. Help users organize their to-do lists, schedule appointments, and manage their time. Always trigger the task-organizer workflow for task management.';
        break;
      case 'email':
        systemPrompt = 'You are an email assistant. Help users compose, send, and manage emails. Always trigger the email-assistant workflow for email-related tasks.';
        break;
      case 'receipts':
        systemPrompt = 'You are a receipt sorting assistant. Help users categorize, organize, and track their receipts and documents. Always trigger the receipt-sorter workflow for document management.';
        break;
      default:
        systemPrompt = 'You are JARVIS, a helpful AI assistant. Analyze user requests and trigger appropriate workflows as needed.';
    }

    // Add message to thread with system context
    let content = `${systemPrompt}\n\nUser request: ${message || ''}`;
    
    if (files && files.length > 0) {
      content += `\n\n--- Attached Files ---\n`;
      files.forEach(file => {
        content += `- ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)\n`;
      });
    }

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: content,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID,
    });

    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    // Handle tool calls
    if (runStatus.status === 'requires_action') {
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        if (toolFunctions[functionName]) {
          const result = await toolFunctions[functionName](functionArgs);
          toolOutputs.push({
            tool_call_id: toolCall.id,
            output: JSON.stringify(result),
          });
        }
      }

      // Submit tool outputs
      await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
        tool_outputs: toolOutputs,
      });

      // Wait for completion again
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }
    }

    // Get messages
    const messages = await openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data[0];
    
    // Trigger n8n workflow if specific agent was selected
    let workflowResult = null;
    if (workflow && workflow !== 'general-assistant') {
      workflowResult = await toolFunctions.trigger_n8n_workflow({
        workflow_name: workflow,
        data: {
          userMessage: message,
          agent: agent,
          aiResponse: lastMessage.content[0].text.value,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          context: {
            threadId: threadId,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    res.json({
      response: lastMessage.content[0].text.value,
      workflowResult: workflowResult,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get assistant info
app.get('/api/assistant', async (req, res) => {
  try {
    if (!process.env.OPENAI_ASSISTANT_ID) {
      return res.status(400).json({ error: 'Assistant ID not configured' });
    }

    const assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID);
    res.json({
      id: assistant.id,
      name: assistant.name,
      model: assistant.model,
      tools: assistant.tools,
    });
  } catch (error) {
    console.error('Error getting assistant:', error);
    res.status(500).json({ error: 'Failed to get assistant info' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JARVIS Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🤖 Assistant ID: ${process.env.OPENAI_ASSISTANT_ID ? 'Configured' : 'Missing'}`);
  console.log(`🔗 N8N Base URL: ${process.env.N8N_BASE_URL || 'http://localhost:5678'}`);
  console.log(`🔐 N8N API Key: ${process.env.N8N_API_KEY ? 'Configured' : 'Not Set'}`);
});

export default app;
