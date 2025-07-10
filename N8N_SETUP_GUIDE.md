# N8N Workflow Setup Guide

This guide explains how to set up n8n workflows to work with the JARVIS voice assistant.

## Prerequisites

1. **N8N Installation**: Make sure you have n8n installed and running
   ```bash
   npm install -g n8n
   n8n start
   ```

2. **Environment Variables**: Copy and configure the `.env.example` file in the backend directory

## Required N8N Workflows

Create the following workflows in your n8n instance:

### 1. Financial Agent Workflow
- **Webhook URL**: `/webhook/financial-agent`
- **Purpose**: Handle financial requests, budgeting, expense tracking
- **Suggested nodes**:
  - Webhook trigger
  - Function node to process financial data
  - Database/Spreadsheet integration for expense tracking
  - Email notifications for financial reports

### 2. Task Organizer Workflow
- **Webhook URL**: `/webhook/task-organizer`
- **Purpose**: Manage tasks, to-do lists, calendar appointments
- **Suggested nodes**:
  - Webhook trigger
  - Google Calendar integration
  - Notion/Airtable for task management
  - Slack/Teams notifications

### 3. Email Assistant Workflow
- **Webhook URL**: `/webhook/email-assistant`
- **Purpose**: Send emails, manage email communications
- **Suggested nodes**:
  - Webhook trigger
  - Gmail/Outlook integration
  - Email template processing
  - Contact management

### 4. Receipt Sorter Workflow
- **Webhook URL**: `/webhook/receipt-sorter`
- **Purpose**: Process and categorize receipts and documents
- **Suggested nodes**:
  - Webhook trigger
  - OCR/Document processing
  - File storage (Google Drive/Dropbox)
  - Expense categorization

### 5. General Assistant Workflow
- **Webhook URL**: `/webhook/general-assistant`
- **Purpose**: Handle general requests not covered by other workflows
- **Suggested nodes**:
  - Webhook trigger
  - Web scraping for information
  - API integrations
  - General purpose processing

## Workflow Configuration

### Input Data Structure
Each workflow receives the following data from JARVIS:

```json
{
  "userMessage": "User's original voice/text input",
  "agent": "Agent type (financial, tasks, email, receipts, general)",
  "aiResponse": "AI's response to the user",
  "context": {
    "threadId": "Conversation thread ID",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "source": "jarvis-ai"
}
```

### Expected Response Format
Workflows should return:

```json
{
  "success": true,
  "result": {
    "message": "Action completed successfully",
    "data": { /* workflow-specific data */ }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Authentication

### N8N API Key (Optional)
If your n8n instance requires authentication:
1. Generate an API key in n8n settings
2. Add it to your `.env` file as `N8N_API_KEY`

### Webhook Security
For production deployments, consider:
- Using HTTPS for webhook URLs
- Implementing webhook signature verification
- Adding IP whitelisting

## Example Workflow Setup

### Financial Agent Example
1. Create a new workflow in n8n
2. Add a Webhook node with path `/webhook/financial-agent`
3. Add a Function node to process the financial data:
   ```javascript
   const userMessage = items[0].json.userMessage;
   const amount = extractAmount(userMessage);
   const category = categorizeExpense(userMessage);
   
   return [{
     json: {
       amount: amount,
       category: category,
       description: userMessage,
       date: new Date().toISOString()
     }
   }];
   ```
4. Connect to your preferred database or spreadsheet service
5. Add response formatting

## Testing

Test each workflow by sending a POST request to the webhook URL:

```bash
curl -X POST "http://localhost:5678/webhook/financial-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I spent $50 on groceries",
    "agent": "financial",
    "aiResponse": "I'll help you track that expense",
    "context": {
      "threadId": "test-123",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  }'
```

## Integration with JARVIS

1. Update your `.env` file with the correct N8N_BASE_URL
2. Ensure all webhook paths match the workflow definitions
3. Test the complete flow by speaking to JARVIS with financial, task, email, or receipt-related requests

## Troubleshooting

- **Webhook not triggering**: Check that the webhook URL is correctly configured
- **Authentication errors**: Verify N8N_API_KEY is set correctly
- **Network issues**: Ensure n8n is accessible from your JARVIS backend
- **Response format errors**: Verify workflows return the expected JSON structure

## Advanced Configuration

### Custom Workflow Routing
You can modify the agent routing logic in `JarvisAgent.jsx` to add new keywords or change how requests are categorized.

### Additional Workflows
Add new workflows by:
1. Creating the workflow in n8n
2. Adding the agent definition in `JarvisAgent.jsx`
3. Updating the backend routing logic if needed