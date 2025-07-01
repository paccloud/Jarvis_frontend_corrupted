import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

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
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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
    // Mock n8n trigger - replace with actual n8n webhook call
    console.log(`Triggering n8n workflow: ${workflow_name}`, data);
    return {
      success: true,
      workflow: workflow_name,
      triggered_at: new Date().toISOString()
    };
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
app.post('/api/chat', async (req, res) => {
  try {
    const { message, threadId } = req.body;

    if (!message || !threadId) {
      return res.status(400).json({ error: 'Message and threadId are required' });
    }

    // Add message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
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

    res.json({
      response: lastMessage.content[0].text.value,
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
});

export default app;
