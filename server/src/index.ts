import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { FigmaClient } from './figma-client';
import { handleFigmaWebhook } from './webhook-handler';

dotenv.config();

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

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
  console.log('Client connected to WebSocket');

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
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Error processing request' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
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
    console.log('Fetching file:', req.params.fileKey);
    const fileData = await figmaClient.getFile(req.params.fileKey);
    console.log('File data received successfully');
    res.json(fileData);
  } catch (error) {
    console.error('Error fetching Figma file:', error);
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
    console.error('Error fetching Figma nodes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Figma nodes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/webhook', handleFigmaWebhook);

// Stripe Checkout endpoint
app.post('/api/stripe/checkout', async (req, res) => {
  try {
    const { leadId, tier } = req.body;

    // Validate required fields
    if (!leadId || !tier) {
      return res.status(400).json({ error: 'leadId and tier are required' });
    }

    // Get the price ID from environment variable based on tier
    const priceIdEnvVar = `STRIPE_TIER${tier}_PRICE_ID`;
    const priceId = process.env[priceIdEnvVar];

    if (!priceId) {
      return res.status(400).json({
        error: `Price ID not configured for tier ${tier}. Expected env var: ${priceIdEnvVar}`
      });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        leadId: String(leadId),
        tier: String(tier),
      },
      success_url: process.env.STRIPE_SUCCESS_URL || `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: process.env.STRIPE_CANCEL_URL || `${req.headers.origin}/cancel`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Test the server at: http://localhost:3001/test');
}); 