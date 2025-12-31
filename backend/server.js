const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const axios = require('axios');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const PORT = process.env.PORT || 3001;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Periodically fetch and broadcast stock updates
setInterval(async () => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/stocks/nifty500`);
    broadcast({
      type: 'stock_update',
      data: response.data.stocks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock updates:', error.message);
  }
}, 10000); // Every 10 seconds

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const [stocksRes, crossoversRes] = await Promise.all([
      axios.get(`${PYTHON_SERVICE_URL}/api/stocks/nifty500`),
      axios.get(`${PYTHON_SERVICE_URL}/api/stocks/crossovers`)
    ]);

    res.json({
      stocks: stocksRes.data.stocks,
      crossovers: crossoversRes.data.crossovers,
      crossoverCount: crossoversRes.data.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/stocks/${symbol}/ema`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching stock ${req.params.symbol}:`, error.message);
    res.status(404).json({ error: 'Stock not found' });
  }
});

app.post('/api/refresh', async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/stocks/refresh`);
    res.json(response.data);
  } catch (error) {
    console.error('Error refreshing stocks:', error.message);
    res.status(500).json({ error: 'Failed to refresh stocks' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
});