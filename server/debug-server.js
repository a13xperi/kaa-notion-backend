const http = require('http');
const logger = require('./logger');

const server = http.createServer((req, res) => {
  logger.info('Request received:', {
    url: req.url,
    method: req.method,
    headers: req.headers
  });
  
  res.writeHead(200, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  
  const response = { 
    status: 'Server is running',
    time: new Date().toISOString(),
    url: req.url
  };
  
  logger.info('Sending response:', response);
  res.end(JSON.stringify(response));
});

const port = 3005;
const host = '127.0.0.1';

server.on('error', (error) => {
  logger.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use`);
  }
});

server.listen(port, host, () => {
  logger.info(`Debug server running at http://${host}:${port}/`);
  logger.info('Press Ctrl+C to stop the server');
}); 
