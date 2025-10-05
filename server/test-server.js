const express = require('express');
const app = express();
const port = 3005;

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Add error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Test the server at: http://localhost:${port}/test`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  }
}); 