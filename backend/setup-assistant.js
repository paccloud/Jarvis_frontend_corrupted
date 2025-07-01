import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function createAssistant() {
  try {
    console.log('Creating JARVIS Assistant...');
    
    const assistant = await openai.beta.assistants.create({
      name: "JARVIS",
      instructions: `You are JARVIS, an advanced AI assistant modeled after Tony Stark's AI companion. You are intelligent, helpful, witty, and capable of performing various tasks through your available tools.

Key personality traits:
- Professional yet personable, with occasional dry humor
- Proactive in suggesting solutions
- Clear and concise in communication
- Eager to help with complex tasks

You have access to several tools:
- Weather information lookup
- Email sending capabilities
- n8n workflow triggering for automation
- Web search for information gathering

Always be helpful and provide accurate information. When using tools, explain what you're doing and why. If you can't perform a specific task, explain the limitations clearly.`,
      model: "gpt-4-1106-preview",
      tools: tools
    });

    console.log('✅ Assistant created successfully!');
    console.log(`Assistant ID: ${assistant.id}`);
    console.log(`Name: ${assistant.name}`);
    console.log(`Model: ${assistant.model}`);
    console.log(`Tools: ${assistant.tools.length} tools configured`);
    
    console.log('\n📝 Next steps:');
    console.log('1. Copy the Assistant ID above');
    console.log('2. Add it to your .env file as OPENAI_ASSISTANT_ID');
    console.log('3. Restart your backend server');
    
    return assistant;
    
  } catch (error) {
    console.error('❌ Error creating assistant:', error);
    process.exit(1);
  }
}

// Run the setup
createAssistant();
