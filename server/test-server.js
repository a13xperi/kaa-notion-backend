const express = require('express');
const logger = require('./logger');
const app = express();
const port = 3005;

// Add request logging
app.use((req, res, next) => {
  logger.info(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/test', (req, res) => {
  logger.info('Test endpoint hit');
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Add error handling
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
  logger.info(`Test server running on port ${port}`);
  logger.info(`Test the server at: http://localhost:${port}/test`);
});

// Handle server errors
server.on('error', (error) => {
  logger.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`);
  }
}); 
