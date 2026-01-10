import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { FigmaClient } from './figma-client';
import { handleFigmaWebhook } from './webhook-handler';

// Route imports
import leadsRouter from './routes/leads';
import checkoutRouter from './routes/checkout';
import webhooksRouter from './routes/webhooks';
import authRouter from './routes/auth';
import projectsRouter from './routes/projects';
import milestonesRouter from './routes/milestones';
import deliverablesRouter from './routes/deliverables';
import analyticsRouter from './routes/analytics';
import pushRouter from './routes/push';
import portfolioRouter from './routes/portfolioRoutes';
import teamRouter from './routes/teamRoutes';
import referralRouter from './routes/referralRoutes';
import subscriptionRouter from './routes/subscriptionRoutes';
import multiProjectRouter from './routes/multiProjectRoutes';
import healthRouter from './routes/health';

// ============================================
// CONFIGURATION
// ============================================

dotenv.config();

const PORT = process.env.PORT || 3001;
const WS_PORT = 3002;

// ============================================
// APP FACTORY
// ============================================

/**
 * Create and configure the Express application
 */
function createApp(): Express {
  const app = express();

  registerMiddleware(app);
  registerRoutes(app);
  registerErrorHandlers(app);

  return app;
}

// ============================================
// MIDDLEWARE REGISTRATION
// ============================================

/**
 * Register all middleware in the correct order
 */
function registerMiddleware(app: Express): void {
  // CORS
  app.use(cors());

  // Stripe webhooks need raw body for signature verification
  // Must be before express.json() middleware
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

  // JSON body parser
  app.use(express.json());
}

// ============================================
// ROUTE REGISTRATION
// ============================================

/**
 * Register all API routes
 */
function registerRoutes(app: Express): void {
  // Initialize Figma client for legacy routes
  const figmaClient = new FigmaClient({
    accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
  });

  // Health/test endpoint
  app.get('/test', (_req: Request, res: Response) => {
    res.json({
      status: 'Server is running',
      token: process.env.FIGMA_ACCESS_TOKEN ? 'Present' : 'Missing'
    });
  });

  // Legacy Figma REST API endpoints
  registerFigmaRoutes(app, figmaClient);

  // API Routes
  registerApiRoutes(app);
}

/**
 * Register Figma-related routes (legacy)
 */
function registerFigmaRoutes(app: Express, figmaClient: FigmaClient): void {
  app.get('/file/:fileKey', async (req: Request, res: Response) => {
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

  app.get('/file/:fileKey/nodes', async (req: Request, res: Response) => {
    try {
      const { nodeIds } = req.query;
      if (!nodeIds || typeof nodeIds !== 'string') {
        res.status(400).json({ error: 'nodeIds parameter is required' });
        return;
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
}

/**
 * Register all /api/* routes
 */
function registerApiRoutes(app: Express): void {
  // Health checks
  app.use('/api/health', healthRouter);

  // Authentication
  app.use('/api/auth', authRouter);

  // Core resources
  app.use('/api/projects', projectsRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/deliverables', deliverablesRouter);

  // Nested routes for project resources
  app.use('/api', milestonesRouter);    // For /api/projects/:id/milestones
  app.use('/api', deliverablesRouter);  // For /api/projects/:id/deliverables

  // Multi-project features
  app.use('/api/projects', multiProjectRouter);

  // Team & Admin
  app.use('/api/team', teamRouter);
  app.use('/api/admin/analytics', analyticsRouter);

  // Client-facing
  app.use('/api/leads', leadsRouter);
  app.use('/api/portfolio', portfolioRouter);

  // Payments & Subscriptions
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/subscriptions', subscriptionRouter);

  // Notifications
  app.use('/api/push', pushRouter);

  // Referrals
  app.use('/api/referrals', referralRouter);
}

// ============================================
// ERROR HANDLERS
// ============================================

/**
 * Register global error handlers
 */
function registerErrorHandlers(app: Express): void {
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      },
    });
  });
}

// ============================================
// WEBSOCKET SERVER
// ============================================

/**
 * Initialize WebSocket server for real-time updates
 */
function initializeWebSocket(figmaClient: FigmaClient): WebSocketServer {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        await handleWebSocketMessage(ws, data, figmaClient);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Error processing request' }));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  return wss;
}

/**
 * Handle incoming WebSocket messages
 */
async function handleWebSocketMessage(
  ws: WebSocket,
  data: { type: string; fileKey?: string; nodeIds?: string[] },
  figmaClient: FigmaClient
): Promise<void> {
  switch (data.type) {
    case 'getFile':
      if (data.fileKey) {
        const fileData = await figmaClient.getFile(data.fileKey);
        ws.send(JSON.stringify({ type: 'fileData', data: fileData }));
      }
      break;
    case 'getFileNodes':
      if (data.fileKey && data.nodeIds) {
        const nodesData = await figmaClient.getFileNodes(data.fileKey, data.nodeIds);
        ws.send(JSON.stringify({ type: 'nodesData', data: nodesData }));
      }
      break;
  }
}

// ============================================
// SERVER STARTUP
// ============================================

/**
 * Start the HTTP and WebSocket servers
 */
function startServer(): void {
  const app = createApp();

  // Initialize Figma client for WebSocket
  const figmaClient = new FigmaClient({
    accessToken: process.env.FIGMA_ACCESS_TOKEN || '',
  });

  // Start WebSocket server
  initializeWebSocket(figmaClient);

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`[SAGE] Server running on port ${PORT}`);
    console.log(`[SAGE] WebSocket server running on port ${WS_PORT}`);
    console.log(`[SAGE] Test endpoint: http://localhost:${PORT}/test`);
    console.log(`[SAGE] API endpoints: http://localhost:${PORT}/api/*`);
  });
}

// ============================================
// EXPORTS & ENTRY POINT
// ============================================

export { createApp, registerMiddleware, registerRoutes, registerErrorHandlers };

// Start server when run directly
startServer();
