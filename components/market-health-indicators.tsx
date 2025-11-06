'use client';

import React, { useState, useEffect } from 'react';

interface MarketHealthData {
  fundingRate: {
    current: number;
    history: number[];
    nextFundingTime: string;
    risk: 'NORMAL' | 'ELEVATED' | 'EXTREME';
  };
  openInterest: {
    total: number;
    change24h: number;
    exchanges: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
  };
  longShortRatio: {
    current: number;
    topTrader: number;
    retail: number;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  cvd: {
    current: number;
    change1h: number;
    change24h: number;
    pressure: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  liquidations: {
    totalLongs: number;
    totalShorts: number;
    netLiquidation: number;
    hourlyRate: number;
  };
}

interface MarketHealthIndicatorsProps {
  data?: MarketHealthData;
  symbol?: string;
  pricing?: any;
  aiAnalysis?: any;
  balance?: any;
}

export default function MarketHealthIndicators({ data, symbol = 'BTCUSDT', pricing, aiAnalysis, balance }: MarketHealthIndicatorsProps) {
  const [activeTab, setActiveTab] = useState('funding');
  const [enhancedData, setEnhancedData] = useState<any>(null);

  useEffect(() => {
    // Fetch enhanced market data
    const fetchEnhancedData = async () => {
      try {
        const response = await fetch(`/api/enhanced-data?symbol=${symbol}`);
        const result = await response.json();
        if (result.success) {
          setEnhancedData(result.data);
        }
      } catch (error) {
        console.error('Error fetching enhanced data:', error);
      }
    };

    fetchEnhancedData();
    const interval = setInterval(fetchEnhancedData, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [symbol]);

  // Mock data if none provided
  const healthData = data || {
    fundingRate: {
      current: 0.0456,
      history: [0.0123, 0.0234, 0.0345, 0.0456, 0.0523, 0.0612],
      nextFundingTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      risk: 'NORMAL' as const
    },
    openInterest: {
      total: 45231.5,
      change24h: 12.5,
      exchanges: [
        { name: 'Binance', value: 25000, percentage: 55.3 },
        { name: 'OKX', value: 12000, percentage: 26.5 },
        { name: 'Bybit', value: 8231.5, percentage: 18.2 }
      ]
    },
    longShortRatio: {
      current: 2.3,
      topTrader: 1.8,
      retail: 2.7,
      sentiment: 'BULLISH' as const
    },
    cvd: {
      current: 2350000,
      change1h: 150000,
      change24h: 890000,
      pressure: 'BULLISH' as const
    },
    liquidations: {
      totalLongs: 15000000,
      totalShorts: 8000000,
      netLiquidation: 7000000,
      hourlyRate: 2500000
    }
  };

  const getFundingRiskColor = (risk: string) => {
    switch (risk) {
      case 'NORMAL': return '#10b981';
      case 'ELEVATED': return '#f59e0b';
      case 'EXTREME': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH': return '#10b981';
      case 'BEARISH': return '#ef4444';
      case 'NEUTRAL': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(decimals);
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(4)}%`;
  };

  const MiniChart = ({ data, color = '#3b82f6' }: { data: number[]; color?: string }) => {
    if (!data || data.length === 0) return <div className="h-8 bg-slate-700 rounded"></div>;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="h-8 flex items-end gap-1">
        {data.map((value, index) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={index}
              className="flex-1 rounded-sm"
              style={{
                backgroundColor: color,
                height: `${Math.max(height, 5)}%`,
                opacity: 0.7 + (height / 100) * 0.3
              }}
            />
          );
        })}
      </div>
    );
  };

  const tabs = [
    { id: 'funding', label: 'Funding Rate', icon: '💰' },
    { id: 'oi', label: 'Open Interest', icon: '📊' },
    { id: 'ratio', label: 'Long/Short', icon: '⚖️' },
    { id: 'cvd', label: 'CVD', icon: '📈' },
    { id: 'liquidations', label: 'Liquidations', icon: '💥' }
  ];

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">🏥</div>
        <div>
          <h3 className="text-lg font-semibold text-white">Market Health Indicators</h3>
          <p className="text-sm text-gray-400">{symbol} - Real-time market condition monitoring</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {activeTab === 'funding' && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Current Rate</div>
                <div 
                  className="text-2xl font-bold"
                  style={{ color: getFundingRiskColor(healthData.fundingRate.risk) }}
                >
                  {formatPercentage(healthData.fundingRate.current)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Risk: {healthData.fundingRate.risk}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Next Funding</div>
                <div className="text-lg font-semibold text-white">
                  {new Date(healthData.fundingRate.nextFundingTime).toLocaleTimeString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((new Date(healthData.fundingRate.nextFundingTime).getTime() - Date.now()) / (1000 * 60))} min
                </div>
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-3">Funding Rate History</div>
              <MiniChart 
                data={healthData.fundingRate.history} 
                color={getFundingRiskColor(healthData.fundingRate.risk)} 
              />
            </div>
          </div>
        )}

        {activeTab === 'oi' && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total OI</div>
                <div className="text-2xl font-bold text-white">
                  {formatNumber(healthData.openInterest.total)}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">24h Change</div>
                <div className={`text-2xl font-bold ${
                  healthData.openInterest.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {healthData.openInterest.change24h >= 0 ? '+' : ''}{healthData.openInterest.change24h.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-3">Exchange Distribution</div>
              <div className="space-y-2">
                {healthData.openInterest.exchanges.map((exchange, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{exchange.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${exchange.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-white w-12 text-right">
                        {exchange.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ratio' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Overall</div>
                <div 
                  className="text-xl font-bold"
                  style={{ color: getSentimentColor(healthData.longShortRatio.sentiment) }}
                >
                  {healthData.longShortRatio.current.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Top Trader</div>
                <div className="text-xl font-bold text-white">
                  {healthData.longShortRatio.topTrader.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Retail</div>
                <div className="text-xl font-bold text-white">
                  {healthData.longShortRatio.retail.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Market Sentiment</div>
              <div 
                className="text-lg font-semibold"
                style={{ color: getSentimentColor(healthData.longShortRatio.sentiment) }}
              >
                {healthData.longShortRatio.sentiment}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {healthData.longShortRatio.current > 2.5 ? 'Retail overleveraged - Whale setup risk' :
                 healthData.longShortRatio.current > 2.0 ? 'High long bias - Monitor for manipulation' :
                 'Balanced positioning'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cvd' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Current CVD</div>
                <div className="text-lg font-bold text-white">
                  {formatNumber(healthData.cvd.current)}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">1h Change</div>
                <div className={`text-lg font-bold ${
                  healthData.cvd.change1h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {healthData.cvd.change1h >= 0 ? '+' : ''}{formatNumber(healthData.cvd.change1h)}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">24h Change</div>
                <div className={`text-lg font-bold ${
                  healthData.cvd.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {healthData.cvd.change24h >= 0 ? '+' : ''}{formatNumber(healthData.cvd.change24h)}
                </div>
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-2">Delta Pressure</div>
              <div 
                className="text-lg font-semibold"
                style={{ color: getSentimentColor(healthData.cvd.pressure) }}
              >
                {healthData.cvd.pressure}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {healthData.cvd.pressure === 'BULLISH' ? 'More aggressive buying than selling' :
                 healthData.cvd.pressure === 'BEARISH' ? 'More aggressive selling than buying' :
                 'Balanced buy/sell pressure'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'liquidations' && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Longs Liquidated</div>
                <div className="text-xl font-bold text-red-400">
                  ${formatNumber(healthData.liquidations.totalLongs)}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Shorts Liquidated</div>
                <div className="text-xl font-bold text-green-400">
                  ${formatNumber(healthData.liquidations.totalShorts)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Net Liquidation</div>
                <div className={`text-xl font-bold ${
                  healthData.liquidations.netLiquidation >= 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  ${formatNumber(Math.abs(healthData.liquidations.netLiquidation))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {healthData.liquidations.netLiquidation >= 0 ? 'More longs liquidated' : 'More shorts liquidated'}
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Hourly Rate</div>
                <div className="text-xl font-bold text-white">
                  ${formatNumber(healthData.liquidations.hourlyRate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {healthData.liquidations.hourlyRate > 10000000 ? 'High liquidation activity' : 'Normal activity'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}