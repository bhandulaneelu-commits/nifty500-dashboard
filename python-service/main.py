from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import redis
import json
from apscheduler.schedulers.background import BackgroundScheduler
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Nifty 500 Stock Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
try:
    redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    redis_client.ping()
except:
    redis_client = None
    logger.warning("Redis not available, using in-memory cache")

# In-memory cache fallback
memory_cache = {}

# Nifty 500 stock symbols (sample - you'll need to add all 500)
NIFTY_500_SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
    "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS",
    "ULTRATECHCE.NS", "BAJFINANCE.NS", "HCLTECH.NS", "SUNPHARMA.NS", "NESTLE.NS",
    "ADANIPORTS.NS", "POWERGRID.NS", "M&M.NS", "JSWSTEEL.NS", "TATAMOTORS.NS",
    "HDFCLIFE.NS", "DIVISLAB.NS", "BAJAJAUTO.NS", "BHEL.NS", "COALINDIA.NS",
]

def calculate_ema(data: pd.Series, period: int = 50) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return data.ewm(span=period, adjust=False).mean()

def detect_crossover(current_price: float, prev_price: float, 
                         current_ema: float, prev_ema: float) -> Optional[str]:
    """Detect if price has crossed EMA"""
    if prev_price <= prev_ema and current_price > current_ema:
        return "bullish"
    elif prev_price >= prev_ema and current_price < current_ema:
        return "bearish"
    return None

def get_weekly_data(symbol: str, weeks: int = 52) -> pd.DataFrame:
    """Fetch weekly stock data"""
    try:
        stock = yf.Ticker(symbol)
        end_date = datetime.now()
        start_date = end_date - timedelta(weeks=weeks * 2)  # Extra buffer
        
        df = stock.history(start=start_date, end=end_date, interval="1wk")
        return df
    except Exception as e:
        logger.error(f"Error fetching data for {symbol}: {e}")
        return pd.DataFrame()

def analyze_stock(symbol: str) -> dict:
    """Analyze a single stock for EMA crossover"""
    try:
        # Get weekly data
        df = get_weekly_data(symbol)
        
        if df.empty or len(df) < 50:
            return None
        
        # Calculate 50 EMA
        df['EMA_50'] = calculate_ema(df['Close'], 50)
        
        # Get current and previous week data
        current = df.iloc[-1]
        previous = df.iloc[-2] if len(df) > 1 else current
        
        # Detect crossover
        crossover = detect_crossover(
            current['Close'], previous['Close'],
            current['EMA_50'], previous['EMA_50']
        )
        
        # Get current price (real-time)
        stock = yf.Ticker(symbol)
        current_price = stock.info.get('currentPrice', current['Close'])
        
        return {
            "symbol": symbol.replace(".NS", ""),
            "name": stock.info.get('longName', symbol),
            "current_price": round(current_price, 2),
            "weekly_close": round(current['Close'], 2),
            "ema_50": round(current['EMA_50'], 2),
            "crossover": crossover,
            "change_percent": round(((current_price - previous['Close']) / previous['Close']) * 100, 2),
            "volume": int(current['Volume']),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {e}")
        return None

def update_all_stocks():
    """Update all stock data"""
    logger.info("Updating all stocks...")
    results = []
    
    for symbol in NIFTY_500_SYMBOLS:
        data = analyze_stock(symbol)
        if data:
            results.append(data)
    
    # Cache results
    cache_key = "nifty500_stocks"
    if redis_client:
        redis_client.setex(cache_key, 300, json.dumps(results))
    else:
        memory_cache[cache_key] = results
    
    logger.info(f"Updated {len(results)} stocks")
    return results

@app.on_event("startup")
async def startup_event():
    """Initialize scheduler on startup"""
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_all_stocks, 'interval', minutes=5)
    scheduler.start()
    
    # Initial update
    update_all_stocks()

@app.get("/")
async def root():
    return {"message": "Nifty 500 Stock Service API", "status": "running"}

@app.get("/api/stocks/nifty500")
async def get_nifty500_stocks():
    """Get all Nifty 500 stocks with current data"""
    cache_key = "nifty500_stocks"
    
    # Try to get from cache
    if redis_client:
        cached = redis_client.get(cache_key)
        if cached:
            return {"stocks": json.loads(cached), "cached": True}
    elif cache_key in memory_cache:
        return {"stocks": memory_cache[cache_key], "cached": True}
    
    # If not cached, update
    stocks = update_all_stocks()
    return {"stocks": stocks, "cached": False}

@app.get("/api/stocks/crossovers")
async def get_crossovers():
    """Get stocks with recent EMA crossovers"""
    cache_key = "nifty500_stocks"
    
    if redis_client:
        cached = redis_client.get(cache_key)
        stocks = json.loads(cached) if cached else update_all_stocks()
    elif cache_key in memory_cache:
        stocks = memory_cache[cache_key]
    else:
        stocks = update_all_stocks()
    
    crossovers = [s for s in stocks if s.get('crossover')]
    return {"crossovers": crossovers, "count": len(crossovers)}

@app.get("/api/stocks/{symbol}/ema")
async def get_stock_ema(symbol: str):
    """Get detailed EMA data for a specific stock"""
    full_symbol = f"{symbol}.NS"
    data = analyze_stock(full_symbol)
    
    if not data:
        raise HTTPException(status_code=404, detail="Stock not found")
    
    return data

@app.post("/api/stocks/refresh")
async def refresh_stocks():
    """Manually trigger stock data refresh"""
    stocks = update_all_stocks()
    return {"message": "Stocks refreshed", "count": len(stocks)}