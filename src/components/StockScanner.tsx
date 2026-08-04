'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpIcon, ArrowDownIcon, RefreshCwIcon, TrendingUpIcon } from 'lucide-react';

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  volume: number;
  avgVolume3Month: number | null;
  marketCap: number | null;
  exchange: string;
}

export default function StockScanner() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/stocks');
      if (!res.ok) {
        throw new Error('Failed to fetch stock data');
      }
      const data = await res.json();
      setStocks(data.stocks || []);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const res = await fetch('/api/stocks');
        if (!res.ok) throw new Error('Failed to fetch stock data');
        const data = await res.json();

        if (mounted) {
          setStocks(data.stocks || []);
          setLastUpdated(new Date());
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unknown error occurred');
          }
          setLoading(false);
        }
      }
    };

    loadData();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadData();
    }, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <TrendingUpIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            NASDAQ Active Scanner
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time scan for high volume NASDAQ stocks
          </p>
        </div>

        <div className="flex items-center gap-4 mt-4 md:mt-0">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchStocks()}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Symbol</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Company Name</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Price</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Change</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Volume</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right hidden sm:table-cell">Avg Vol (3m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading && stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCwIcon className="w-5 h-5 animate-spin" />
                      Scanning markets...
                    </div>
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No active NASDAQ stocks found at the moment.
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => (
                  <tr key={stock.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{stock.symbol}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-gray-600 dark:text-gray-300 truncate max-w-xs">
                      {stock.name}
                    </td>
                    <td className="p-4 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(stock.price)}
                    </td>
                    <td className="p-4 text-right">
                      <div className={`flex items-center justify-end gap-1 font-medium ${
                        stock.percentChange > 0 ? 'text-green-600 dark:text-green-400' :
                        stock.percentChange < 0 ? 'text-red-600 dark:text-red-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {stock.percentChange > 0 ? <ArrowUpIcon className="w-4 h-4" /> :
                         stock.percentChange < 0 ? <ArrowDownIcon className="w-4 h-4" /> : null}
                        {Math.abs(stock.percentChange || 0).toFixed(2)}%
                      </div>
                    </td>
                    <td className="p-4 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatNumber(stock.volume)}
                    </td>
                    <td className="p-4 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                      {formatNumber(stock.avgVolume3Month)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
