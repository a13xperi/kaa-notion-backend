const http = require('http');
const logger = require('./logger');

const server = http.createServer((req, res) => {
  logger.info('Received request:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running\n');
});

const port = 8080;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
    process.exit(1);
  }
});

server.listen(port, 'localhost', () => {
  logger.info(`Server running at http://localhost:${port}`);
  logger.info('Try accessing it in your browser or with curl');
});

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}); 
