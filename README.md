# Nifty 500 Stock Dashboard

A real-time dashboard for monitoring Nifty 500 stocks with 50 EMA weekly crossover detection.

## Tech Stack

- **Frontend**: React + TypeScript + Material-UI
- **Backend**: Node.js + Express + WebSockets
- **Python Service**: FastAPI + Pandas + yfinance
- **Database**: Redis (caching)

## Features

- ✅ Real-time stock price updates
- ✅ Weekly 50 EMA calculation
- ✅ Bullish/Bearish crossover detection
- ✅ Sortable and filterable dashboard
- ✅ Responsive UI design

## Project Structure

```
nifty500-dashboard/
├── frontend/            # React application
├── backend/             # Node.js server
├── python-service/      # Python FastAPI service
├── docker-compose.yml   # Docker orchestration
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v18.x or later)
- Python (3.9+ )
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/bhandulaneelu-commits/nifty500-dashboard.git
cd nifty500-dashboard
```

2. Install dependencies:
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Python Service
cd ../python-service
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
# Create .env files in each directory based on .env.example
```

4. Run the application:
```bash
# Using Docker
docker-compose up

# Or run services individually
# Terminal 1: Python Service
cd python-service
uvicorn main:app --reload --port 8000

# Terminal 2: Node.js Backend
cd backend
npm run dev

# Terminal 3: React Frontend
cd frontend
npm start
```

## API Endpoints

### Python Service (Port 8000)

- `GET /api/stocks/nifty500` - Get all Nifty 500 stocks with current prices
- `GET /api/stocks/crossovers` - Get stocks with recent 50 EMA crossovers
- `GET /api/stocks/{symbol}/ema` - Get EMA data for specific stock

### Node.js Backend (Port 3001)

- `GET /api/dashboard` - Get aggregated dashboard data
- `WebSocket /ws` - Real-time price updates

## License

MIT

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.