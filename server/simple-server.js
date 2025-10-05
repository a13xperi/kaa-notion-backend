const http = require('http');

const server = http.createServer((req, res) => {
  console.log('Request received:', req.url);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'Server is running',
    time: new Date().toISOString()
  }));
});

const port = 3005;
server.listen(port, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${port}/`);
}); 