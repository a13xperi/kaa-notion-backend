import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { FigmaClient } from './figma-client';
import { handleFigmaWebhook } from './webhook-handler';
import { logger } from './logger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Figma client
const figmaClient = new FigmaClient({
  accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
});

// WebSocket server for real-time updates
const wss = new WebSocketServer({ port: 3002 });

wss.on('connection', (ws) => {
  logger.debug('Client connected to WebSocket');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      // Handle different message types
      switch (data.type) {
        case 'getFile':
          const fileData = await figmaClient.getFile(data.fileKey);
          ws.send(JSON.stringify({ type: 'fileData', data: fileData }));
          break;
        case 'getFileNodes':
          const nodesData = await figmaClient.getFileNodes(data.fileKey, data.nodeIds);
          ws.send(JSON.stringify({ type: 'nodesData', data: nodesData }));
          break;
        // Add more message handlers as needed
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Error processing request' }));
    }
  });

  ws.on('close', () => {
    logger.debug('Client disconnected from WebSocket');
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    status: 'Server is running',
    token: process.env.FIGMA_ACCESS_TOKEN ? 'Present' : 'Missing'
  });
});

// REST API endpoints
app.get('/file/:fileKey', async (req, res) => {
  try {
    logger.debug('Fetching file:', req.params.fileKey);
    const fileData = await figmaClient.getFile(req.params.fileKey);
    logger.debug('File data received successfully');
    res.json(fileData);
  } catch (error) {
    logger.error('Error fetching Figma file:', error);
    res.status(500).json({
      error: 'Failed to fetch Figma file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/file/:fileKey/nodes', async (req, res) => {
  try {
    const { nodeIds } = req.query;
    if (!nodeIds || typeof nodeIds !== 'string') {
      return res.status(400).json({ error: 'nodeIds parameter is required' });
    }
    const nodesData = await figmaClient.getFileNodes(req.params.fileKey, nodeIds.split(','));
    res.json(nodesData);
  } catch (error) {
    logger.error('Error fetching Figma nodes:', error);
    res.status(500).json({
      error: 'Failed to fetch Figma nodes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/webhook', handleFigmaWebhook);

// Start the server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info('Test the server at: http://localhost:3001/test');
}); 