import { NextResponse } from 'next/server';

interface YahooQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  averageDailyVolume3Month: number;
  marketCap: number;
  exchange: string;
  fullExchangeName: string;
}

export async function GET() {
  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=most_actives&count=100';

    const res = await fetch(url, { next: { revalidate: 60 } }); // Cache for 60 seconds

    if (!res.ok) {
      throw new Error(`Yahoo Finance API error: ${res.status}`);
    }

    const data = await res.json();

    if (!data.finance?.result?.[0]?.quotes) {
      return NextResponse.json({ error: 'Invalid data format from Yahoo Finance' }, { status: 500 });
    }

    const quotes: YahooQuote[] = data.finance.result[0].quotes;

    // Filter for NASDAQ stocks
    const nasdaqQuotes = quotes.filter((q) =>
      q.exchange === 'NMS' || q.fullExchangeName === 'NasdaqGS' || q.fullExchangeName === 'NasdaqGM' || q.fullExchangeName === 'NasdaqCM'
    );

    // Format the response
    const formattedStocks = nasdaqQuotes.map((q) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      percentChange: q.regularMarketChangePercent,
      volume: q.regularMarketVolume,
      avgVolume3Month: q.averageDailyVolume3Month,
      marketCap: q.marketCap,
      exchange: q.fullExchangeName,
    }));

    // Sort by volume descending
    formattedStocks.sort((a, b) => b.volume - a.volume);

    return NextResponse.json({ stocks: formattedStocks });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}
