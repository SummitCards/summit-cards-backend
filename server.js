const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Pokemon TCG API base URL
const POKEMON_TCG_API = 'https://api.pokemontcg.io/v2';

// Optional: Add your Pokemon TCG API key for higher rate limits
const API_KEY = process.env.POKEMON_TCG_API_KEY || '';

// CORS configuration - allow your frontend domains
const allowedOrigins = [
  'https://collection.summitcards.co.uk',
  'https://summitcards.co.uk',
  'https://www.summitcards.co.uk',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Summit Cards Pokemon TCG API Proxy',
    version: '1.1.0',
    endpoints: {
      sets: '/api/sets',
      cards: '/api/cards',
      setById: '/api/sets/:id',
      cardById: '/api/cards/:id'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Helper function to make requests to Pokemon TCG API
async function pokemonApiRequest(endpoint, queryParams = '') {
  const url = `${POKEMON_TCG_API}${endpoint}${queryParams}`;
  console.log(`Fetching: ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  if (API_KEY) {
    headers['X-Api-Key'] = API_KEY;
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, { 
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error response: ${errorText}`);
      throw new Error(`Pokemon TCG API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timeout - Pokemon TCG API took too long to respond');
    }
    throw err;
  }
}

// GET /api/sets - Get all sets
app.get('/api/sets', async (req, res) => {
  try {
    const queryParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const data = await pokemonApiRequest('/sets', queryParams);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sets:', error.message);
    res.status(500).json({ error: 'Failed to fetch sets', message: error.message });
  }
});

// GET /api/sets/:id - Get a specific set
app.get('/api/sets/:id', async (req, res) => {
  try {
    const data = await pokemonApiRequest(`/sets/${req.params.id}`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching set:', error.message);
    res.status(500).json({ error: 'Failed to fetch set', message: error.message });
  }
});

// GET /api/cards - Get cards with optional query parameters
app.get('/api/cards', async (req, res) => {
  try {
    const queryParams = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const data = await pokemonApiRequest('/cards', queryParams);
    res.json(data);
  } catch (error) {
    console.error('Error fetching cards:', error.message);
    res.status(500).json({ error: 'Failed to fetch cards', message: error.message });
  }
});

// GET /api/cards/:id - Get a specific card
app.get('/api/cards/:id', async (req, res) => {
  try {
    const data = await pokemonApiRequest(`/cards/${req.params.id}`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching card:', error.message);
    res.status(500).json({ error: 'Failed to fetch card', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Summit Cards Backend v1.1.0 running on port ${PORT}`);
  console.log(`API Key configured: ${API_KEY ? 'Yes' : 'No (using default rate limits)'}`);
});
