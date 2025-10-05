# Figma MCP Server

This is a Message Control Protocol (MCP) server for Figma integration. It provides real-time communication between your application and Figma through WebSocket connections and REST API endpoints.

## Features

- Real-time Figma file updates via WebSocket
- REST API endpoints for Figma file operations
- Webhook support for Figma events
- Secure authentication with Figma API

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Figma account with API access

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the server directory with the following variables:
   ```
   PORT=3001
   FIGMA_ACCESS_TOKEN=your_figma_access_token_here
   FIGMA_WEBHOOK_PASSCODE=your_webhook_passcode_here
   ```

3. Get your Figma access token:
   - Go to your Figma account settings
   - Navigate to Personal access tokens
   - Create a new access token
   - Copy the token and paste it in your `.env` file

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### REST API

- `GET /file/:fileKey` - Get Figma file data
- `GET /file/:fileKey/nodes` - Get specific nodes from a Figma file
- `POST /webhook` - Handle Figma webhook events

### WebSocket Events

- `getFile` - Request Figma file data
- `getFileNodes` - Request specific nodes from a Figma file

## WebSocket Connection

Connect to the WebSocket server at `ws://localhost:3002`. The server supports the following message types:

```typescript
// Get file data
{
  type: 'getFile',
  fileKey: 'your-figma-file-key'
}

// Get specific nodes
{
  type: 'getFileNodes',
  fileKey: 'your-figma-file-key',
  nodeIds: ['node-id-1', 'node-id-2']
}
```

## Error Handling

The server includes comprehensive error handling for:
- Invalid Figma access tokens
- Missing or invalid file keys
- WebSocket connection issues
- Webhook verification failures

## Security

- All API requests require a valid Figma access token
- Webhook endpoints are protected with a passcode
- CORS is enabled for cross-origin requests
- WebSocket connections are authenticated

## Development

For development with hot-reloading:
```bash
npm run dev
```

## Testing

Run the test suite:
```bash
npm test
``` 