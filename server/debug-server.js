const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Request received:', {
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
  
  console.log('Sending response:', response);
  res.end(JSON.stringify(response));
});

const port = 3005;
const host = '127.0.0.1';

server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
});

server.listen(port, host, () => {
  console.log(`Debug server running at http://${host}:${port}/`);
  console.log('Press Ctrl+C to stop the server');
}); 