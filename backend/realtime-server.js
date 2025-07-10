import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { RealtimeAgent } from '@openai/agents/realtime';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.REALTIME_PORT || 5051;

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
const whitelist = [process.env.CORS_ORIGIN, 'http://localhost:3000', 'http://localhost:5174', 'http://127.0.0.1:53236', 'http://localhost:5173', 'http://localhost:5175'];
app.use(cors({
  origin: whitelist,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tool function implementations for JARVIS
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
          source: 'jarvis-realtime'
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

// Define JARVIS agents using the OpenAI Agents SDK
const financialAgent = new RealtimeAgent({
  name: 'financial',
  handoffDescription: 'Financial assistant for budgeting, expenses, and financial planning.',
  instructions: `You are a financial assistant named JARVIS. Help users with:
- Budget planning and tracking
- Expense categorization and analysis
- Financial goal setting
- Investment advice basics
- Bill reminders and payment tracking

Always be helpful, accurate, and speak in a professional yet friendly tone. 
When handling financial tasks, trigger the financial-agent n8n workflow.`,
  tools: [
    {
      type: "function",
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
    },
    {
      type: "function",
      name: "trigger_n8n_workflow",
      description: "Trigger financial workflow in n8n",
      parameters: {
        type: "object",
        properties: {
          workflow_name: {
            type: "string",
            description: "Name of the n8n workflow"
          },
          data: {
            type: "object",
            description: "Financial data to process"
          }
        },
        required: ["workflow_name", "data"]
      }
    }
  ],
  handoffs: []
});

const taskAgent = new RealtimeAgent({
  name: 'tasks',
  handoffDescription: 'Task organization and productivity assistant.',
  instructions: `You are a task organization assistant named JARVIS. Help users with:
- Creating and managing to-do lists
- Scheduling appointments and meetings
- Setting reminders and deadlines
- Time management and productivity tips
- Calendar organization

Be efficient, organized, and motivating. When handling task management, trigger the google-tasks-voice-agent n8n workflow.`,
  tools: [
    {
      type: "function",
      name: "trigger_n8n_workflow",
      description: "Trigger task organization workflow in n8n",
      parameters: {
        type: "object",
        properties: {
          workflow_name: {
            type: "string",
            description: "Name of the n8n workflow"
          },
          data: {
            type: "object",
            description: "Task data to organize"
          }
        },
        required: ["workflow_name", "data"]
      }
    }
  ],
  handoffs: [financialAgent]
});

const emailAgent = new RealtimeAgent({
  name: 'email',
  handoffDescription: 'Email composition and management assistant.',
  instructions: `You are an email assistant named JARVIS. Help users with:
- Composing professional emails
- Managing email organization
- Setting up email templates
- Email etiquette and best practices
- Scheduling email sending

Be professional, clear, and helpful. When handling email tasks, trigger the email-assistant n8n workflow.`,
  tools: [
    {
      type: "function",
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
    },
    {
      type: "function",
      name: "trigger_n8n_workflow",
      description: "Trigger email workflow in n8n",
      parameters: {
        type: "object",
        properties: {
          workflow_name: {
            type: "string",
            description: "Name of the n8n workflow"
          },
          data: {
            type: "object",
            description: "Email data to process"
          }
        },
        required: ["workflow_name", "data"]
      }
    }
  ],
  handoffs: [taskAgent, financialAgent]
});

const generalAgent = new RealtimeAgent({
  name: 'general',
  handoffDescription: 'General purpose AI assistant.',
  instructions: `You are JARVIS, a general purpose AI assistant. You can help with:
- General questions and information
- Web searches and research
- Weather information
- Casual conversation
- Routing to specialized agents when needed

Be helpful, friendly, and intelligent. You can hand off to specialized agents for specific tasks.
When users need financial help, hand off to the financial agent.
When users need task organization, hand off to the tasks agent.
When users need email help, hand off to the email agent.`,
  tools: [
    {
      type: "function",
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
    },
    {
      type: "function",
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
    },
    {
      type: "function",
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
  ],
  handoffs: [financialAgent, taskAgent, emailAgent]
});

// Set up agent handoffs
financialAgent.handoffs = [taskAgent, emailAgent, generalAgent];
taskAgent.handoffs = [financialAgent, emailAgent, generalAgent];
emailAgent.handoffs = [financialAgent, taskAgent, generalAgent];

// Agent configuration
const agents = [generalAgent, financialAgent, taskAgent, emailAgent];

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'jarvis-realtime',
    timestamp: new Date().toISOString() 
  });
});

// Create realtime session
app.post('/api/realtime/session', async (req, res) => {
  try {
    const { agent = 'general' } = req.body;
    
    // Find the requested agent
    const selectedAgent = agents.find(a => a.name === agent) || generalAgent;
    
    // Create ephemeral session token for the Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
        instructions: selectedAgent.instructions,
        tools: selectedAgent.tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_response_output_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const sessionData = await response.json();
    
    res.json({
      ...sessionData,
      agent: selectedAgent.name,
      availableAgents: agents.map(agent => ({
        name: agent.name,
        description: agent.handoffDescription
      }))
    });

  } catch (error) {
    console.error('Error creating realtime session:', error);
    res.status(500).json({ error: 'Failed to create realtime session' });
  }
});

// Handle tool calls from realtime session
app.post('/api/realtime/tools', async (req, res) => {
  try {
    const { toolName, arguments: toolArgs } = req.body;
    
    if (!toolFunctions[toolName]) {
      return res.status(400).json({ error: `Unknown tool: ${toolName}` });
    }
    
    const result = await toolFunctions[toolName](toolArgs);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available agents
app.get('/api/realtime/agents', (req, res) => {
  res.json({
    agents: agents.map(agent => ({
      name: agent.name,
      description: agent.handoffDescription,
      tools: agent.tools.map(tool => tool.function.name)
    }))
  });
});

// Agent handoff endpoint
app.post('/api/realtime/handoff', async (req, res) => {
  try {
    const { fromAgent, toAgent, sessionId } = req.body;
    
    const targetAgent = agents.find(agent => agent.name === toAgent);
    if (!targetAgent) {
      return res.status(400).json({ error: `Unknown agent: ${toAgent}` });
    }
    
    // In a real implementation, you would update the session with new instructions
    // For now, we'll return the new agent configuration
    res.json({
      success: true,
      newAgent: {
        name: targetAgent.name,
        instructions: targetAgent.instructions,
        tools: targetAgent.tools
      },
      message: `Handed off from ${fromAgent} to ${toAgent}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error handling agent handoff:', error);
    res.status(500).json({ error: 'Failed to handle agent handoff' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Realtime server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JARVIS Realtime Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🔗 N8N Base URL: ${process.env.N8N_BASE_URL || 'http://localhost:5678'}`);
  console.log(`🤖 Available Agents: ${agents.map(a => a.name).join(', ')}`);
});

export default app;
