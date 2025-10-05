const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Received request:', {
    url: req.url,
    method: req.method,
    time: new Date().toISOString()
  });

  // Test endpoint
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: 'Test endpoint is working!',
      time: new Date().toISOString()
    }));
    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running. Try /test endpoint\n');
});

const port = 8080;

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Try these endpoints:');
  console.log('- http://localhost:8080/test');
  console.log('- http://localhost:8080');
}); 