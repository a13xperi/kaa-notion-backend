const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Received request:', req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running\n');
});

const port = 8080;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

server.listen(port, 'localhost', () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Try accessing it in your browser or with curl');
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 