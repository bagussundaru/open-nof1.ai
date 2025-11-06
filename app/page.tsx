"use client";

import { useEffect, useState } from "react";
import WhaleManipulationPanel from '@/components/whale-manipulation-panel';
import MarketHealthIndicators from '@/components/market-health-indicators';
import EnhancedPositionManager from '@/components/enhanced-position-manager';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [news, setNews] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    
    // Set a simple timeout to show the dashboard
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch data after component is mounted
  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        console.log("Starting to fetch data...");
        
        const healthRes = await fetch("/api/health");
        const healthData = await healthRes.json();
        console.log("Health data fetched:", healthData);
        setHealth(healthData);

        const pricingRes = await fetch("/api/pricing");
        const pricingData = await pricingRes.json();
        console.log("Pricing data fetched:", pricingData);
        setPricing(pricingData);

        const balanceRes = await fetch("/api/trading/balance");
        const balanceData = await balanceRes.json();
        console.log("Balance data fetched:", balanceData);
        setBalance(balanceData);

        const aiRes = await fetch("/api/ai/analysis");
        const aiData = await aiRes.json();
        console.log("AI data fetched:", aiData);
        setAiAnalysis(aiData);

        const newsRes = await fetch("/api/news");
        const newsData = await newsRes.json();
        console.log("News data fetched:", newsData);
        setNews(newsData);

        console.log("All data fetched successfully");
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    // Fetch data after a short delay
    const fetchTimer = setTimeout(fetchData, 3000);
    
    // Set up interval for periodic updates
    const interval = setInterval(fetchData, 30000);
    
    return () => {
      clearTimeout(fetchTimer);
      clearInterval(interval);
    };
  }, [mounted]);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🚀 Loading AI Trading System...</h1>
        <p>Please wait while we initialize the dashboard...</p>
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <h1 style={{ marginBottom: '20px' }}>🚀 Pramilupu Trading AI Dashboard</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: activeTab === 'dashboard' ? '#3b82f6' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setActiveTab('exchanges')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'exchanges' ? '#3b82f6' : '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          🔑 Exchange Management
        </button>
      </div>

      {activeTab === 'exchanges' ? (
        <div>
          <h2>Exchange Management</h2>
          <p>Exchange management functionality will be here.</p>
        </div>
      ) : (
        <div>
          <h2>📊 Trading Dashboard</h2>
          
          {/* System Health */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>🔧 System Health</h3>
            <p>Status: <strong style={{ color: health?.status === 'healthy' ? '#10b981' : '#ef4444' }}>
              {health?.status?.toUpperCase() || 'LOADING...'}
            </strong></p>
            <p>Last Update: {new Date().toLocaleTimeString()}</p>
            {health && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                <p>Uptime: {Math.floor((health.uptime || 0) / 60)} minutes</p>
                <p>Environment: {health.environment}</p>
              </div>
            )}
          </div>

          {/* Portfolio Summary */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>💰 Portfolio Summary</h3>
            <p>Total Balance: <strong>${balance?.data?.total?.toFixed(2) || '0.00'}</strong></p>
            <p>Available: <strong>${balance?.data?.available?.toFixed(2) || '0.00'}</strong></p>
            <p>P&L: <strong style={{ color: (balance?.data?.performance?.totalPnL || 0) >= 0 ? '#10b981' : '#ef4444' }}>
              ${balance?.data?.performance?.totalPnL?.toFixed(2) || '0.00'}
            </strong></p>
            <p>Active Positions: <strong>{balance?.data?.positions?.length || 0}</strong></p>
          </div>

          {/* Market Data */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>📈 Market Data</h3>
            {pricing && pricing.success && pricing.data ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {Object.entries(pricing.data).slice(0, 5).map(([symbol, data]: [string, any]) => (
                  <div key={symbol} style={{ 
                    padding: '15px', 
                    backgroundColor: '#334155', 
                    borderRadius: '6px' 
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{symbol}</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                      ${typeof data.price === 'number' ? data.price.toLocaleString() : data.price}
                    </div>
                    <div style={{ 
                      color: data.change24h >= 0 ? '#10b981' : '#ef4444',
                      fontSize: '14px'
                    }}>
                      {data.change24h >= 0 ? '+' : ''}{data.change24h?.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Loading market data...</p>
            )}
          </div>

          {/* AI Analysis */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>🤖 AI Analysis</h3>
            {aiAnalysis && aiAnalysis.success ? (
              <div>
                <p>Status: <strong style={{ color: '#10b981' }}>
                  {aiAnalysis.data?.nebiusAIStatus || 'Connected'}
                </strong></p>
                <p>Buy Signals: <strong style={{ color: '#10b981' }}>
                  {aiAnalysis.data?.buySignals || 0}
                </strong></p>
                <p>Sell Signals: <strong style={{ color: '#ef4444' }}>
                  {aiAnalysis.data?.sellSignals || 0}
                </strong></p>
                <p>Hold Signals: <strong style={{ color: '#f59e0b' }}>
                  {aiAnalysis.data?.holdSignals || 0}
                </strong></p>
                {aiAnalysis.data?.bestOpportunity && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    backgroundColor: '#334155', 
                    borderRadius: '6px' 
                  }}>
                    <h4>🎯 Best Opportunity</h4>
                    <p><strong>{aiAnalysis.data.bestOpportunity.symbol}</strong> - {aiAnalysis.data.bestOpportunity.action}</p>
                    <p>Confidence: <strong>{(aiAnalysis.data.bestOpportunity.confidence * 100).toFixed(1)}%</strong></p>
                    <p style={{ fontSize: '14px', color: '#cbd5e1' }}>
                      {aiAnalysis.data.bestOpportunity.reasoning?.substring(0, 200)}...
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p>Loading AI analysis...</p>
            )}
          </div>

          {/* Enhanced Whale Detection Panel */}
          <WhaleManipulationPanel aiAnalysis={aiAnalysis} />

          {/* Market Health Indicators */}
          <MarketHealthIndicators 
            pricing={pricing} 
            aiAnalysis={aiAnalysis}
            balance={balance}
          />

          {/* Enhanced Position Manager */}
          <EnhancedPositionManager 
            balance={balance}
            aiAnalysis={aiAnalysis}
          />

          {/* Multi-Timeframe Analysis Dashboard */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>📊 Multi-Timeframe Analysis</h3>
            <div id="multi-timeframe-container">
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                Advanced multi-timeframe analysis provides comprehensive market insights across 1m, 5m, 15m, 1h, 4h, and 1d timeframes.
                This helps identify high-probability trading opportunities with better risk management.
              </p>
              <button 
                onClick={() => {
                  window.open('/api/ai/multi-timeframe?symbol=BTCUSDT&strategy=true', '_blank');
                }}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                View Multi-Timeframe Analysis
              </button>
            </div>
          </div>

          {/* Sentiment Analysis Dashboard */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>📰 Market Sentiment Analysis</h3>
            <div id="sentiment-container">
              <p style={{ color: '#cbd5e1', fontSize: '14px' }}>
                AI-powered sentiment analysis combines news articles and social media posts to gauge market mood.
                This helps identify sentiment-driven price movements and adjust position sizing accordingly.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
                <button 
                  onClick={() => {
                    window.open('/api/ai/sentiment?symbol=BTCUSDT&timeframe=4h&strategy=true', '_blank');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📰 View News Sentiment
                </button>
                <button 
                  onClick={() => {
                    window.open('/api/ai/sentiment?symbol=ETHUSDT&timeframe=4h&strategy=true', '_blank');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  💬 View Social Sentiment
                </button>
              </div>
            </div>
          </div>

          {/* News */}
          <div style={{ 
            padding: '20px', 
            margin: '20px 0', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>📰 Market News</h3>
            {news && news.success && news.data?.news ? (
              <div>
                {news.data.news.slice(0, 3).map((item: any, index: number) => (
                  <div key={index} style={{ 
                    marginBottom: '15px', 
                    paddingBottom: '15px', 
                    borderBottom: index < 2 ? '1px solid #334155' : 'none' 
                  }}>
                    <h4 style={{ fontSize: '16px', marginBottom: '5px' }}>{item.title}</h4>
                    <p style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '5px' }}>
                      {item.description}
                    </p>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {item.source} • {new Date(item.publishedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Loading news...</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            marginTop: '40px', 
            padding: '20px', 
            textAlign: 'center', 
            backgroundColor: '#1e293b', 
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h3>Pramilupu Trading AI</h3>
            <p style={{ color: '#64748b' }}>Powered by Nebius AI & Real-time Market Analysis</p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Dashboard loaded at: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}