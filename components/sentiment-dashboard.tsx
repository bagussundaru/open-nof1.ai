'use client';

import React, { useState, useEffect } from 'react';

interface SentimentDashboardProps {
  symbol?: string;
}

export default function SentimentDashboard({ symbol = 'BTCUSDT' }: SentimentDashboardProps) {
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '24h'>('4h');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchSentimentData();
  }, [symbol, timeframe]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchSentimentData, 300000); // Refresh every 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, symbol, timeframe]);

  const fetchSentimentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ai/sentiment?symbol=${symbol}&timeframe=${timeframe}&strategy=true`);
      const data = await response.json();
      
      if (data.success) {
        setSentimentData(data.data);
      } else {
        setError(data.error || 'Failed to fetch sentiment data');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching sentiment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (category: string) => {
    switch (category) {
      case 'VERY_POSITIVE': return '#16a34a';
      case 'POSITIVE': return '#22c55e';
      case 'NEUTRAL': return '#eab308';
      case 'NEGATIVE': return '#ef4444';
      case 'VERY_NEGATIVE': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'LOW': return '#22c55e';
      case 'MEDIUM': return '#eab308';
      case 'HIGH': return '#ef4444';
      case 'CRITICAL': return '#dc2626';
      default: return '#6b7280';
    }
  };

  if (loading && !sentimentData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading sentiment analysis...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Sentiment Analysis Error</div>
          <div className="text-gray-600 dark:text-gray-400 mb-4">{error}</div>
          <button 
            onClick={fetchSentimentData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!sentimentData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              📰 Market Sentiment Analysis
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{symbol}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as '1h' | '4h' | '24h')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="24h">24 Hours</option>
            </select>
            
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Auto Refresh</span>
            </label>
            
            <button 
              onClick={fetchSentimentData}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Sentiment Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getSentimentColor(sentimentData.summary.overallSentiment) }}>
              {sentimentData.summary.overallSentiment}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Sentiment</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {(sentimentData.summary.sentimentScore * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Sentiment Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {(sentimentData.summary.confidence * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getImpactColor(sentimentData.summary.tradingImpact) }}>
              {sentimentData.summary.tradingImpact}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Trading Impact</div>
          </div>
        </div>
      </div>

      {/* News vs Social Sentiment */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">News vs Social Media Sentiment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* News Sentiment */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-900 dark:text-white">📰 News Sentiment</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                <span className="font-medium" style={{ color: getSentimentColor(sentimentData.sentiment.news.sentiment.category) }}>
                  {sentimentData.sentiment.news.sentiment.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Score:</span>
                <span className="font-medium">
                  {(sentimentData.sentiment.news.sentiment.score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Articles:</span>
                <span className="font-medium">
                  {sentimentData.sentiment.news.articles.length}
                </span>
              </div>
            </div>
          </div>

          {/* Social Media Sentiment */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium mb-3 text-gray-900 dark:text-white">💬 Social Media Sentiment</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                <span className="font-medium" style={{ color: getSentimentColor(sentimentData.sentiment.social.sentiment.category) }}>
                  {sentimentData.sentiment.social.sentiment.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Score:</span>
                <span className="font-medium">
                  {(sentimentData.sentiment.social.sentiment.score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Posts:</span>
                <span className="font-medium">
                  {sentimentData.sentiment.social.posts.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Strategy */}
      {sentimentData.strategy && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">🎯 Sentiment-Enhanced Strategy</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-blue-600">
                {sentimentData.strategy.action}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Action</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {(sentimentData.strategy.finalPositionSize * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Position Size</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-purple-600">
                {sentimentData.strategy.leverage}x
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Leverage</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold" style={{ color: getSentimentColor(sentimentData.strategy.sentimentDirection) }}>
                {sentimentData.strategy.sentimentDirection}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Sentiment Direction</div>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Strategy Reasoning</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              {sentimentData.strategy.reasoning}
            </p>
          </div>
        </div>
      )}

      {/* Key Insights */}
      {sentimentData.summary.keyInsights && sentimentData.summary.keyInsights.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">💡 Key Insights</h3>
          <div className="space-y-3">
            {sentimentData.summary.keyInsights.map((insight: string, index: number) => (
              <div key={index} className="flex items-start p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-yellow-500 mr-3 mt-0.5">💡</span>
                <span className="text-sm text-yellow-800 dark:text-yellow-200">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {sentimentData.summary.riskFactors && sentimentData.summary.riskFactors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">⚠️ Risk Factors</h3>
          <div className="space-y-3">
            {sentimentData.summary.riskFactors.map((risk: string, index: number) => (
              <div key={index} className="flex items-start p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-red-500 mr-3 mt-0.5">⚠️</span>
                <span className="text-sm text-red-800 dark:text-red-200">{risk}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}