'use client';

import React, { useState, useEffect } from 'react';

interface EnhancedPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  pnlPercent: number;
  leverage: number;
  
  // Enhanced fields
  whaleRiskScore: number;
  dynamicLeverage: number;
  originalLeverage: number;
  exitStrategy: {
    stopLoss: number;
    takeProfitLevels: Array<{
      price: number;
      percentage: number;
      status: 'PENDING' | 'HIT' | 'CANCELLED';
    }>;
    trailingStop: {
      active: boolean;
      triggerPrice: number;
      currentStop: number;
    };
  };
  riskMetrics: {
    maxDrawdown: number;
    timeInPosition: number;
    volatilityRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    liquidationPrice: number;
    marginRatio: number;
  };
  whaleAlerts: Array<{
    timestamp: number;
    phase: string;
    action: string;
    message: string;
  }>;
}

interface EnhancedPositionManagerProps {
  positions?: EnhancedPosition[];
  balance?: any;
  aiAnalysis?: any;
}

export default function EnhancedPositionManager({ positions, balance, aiAnalysis }: EnhancedPositionManagerProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  // Mock enhanced position data
  const mockPositions: EnhancedPosition[] = positions || [
    {
      symbol: 'ETHUSDT',
      side: 'LONG',
      size: 0.008,
      entryPrice: 3299.99,
      markPrice: 3339.32,
      pnl: 0.31,
      pnlPercent: 1.16,
      leverage: 2,
      whaleRiskScore: 35,
      dynamicLeverage: 3,
      originalLeverage: 5,
      exitStrategy: {
        stopLoss: 3135.00,
        takeProfitLevels: [
          { price: 3465.00, percentage: 33, status: 'PENDING' },
          { price: 3630.00, percentage: 33, status: 'PENDING' },
          { price: 3795.00, percentage: 34, status: 'PENDING' }
        ],
        trailingStop: {
          active: false,
          triggerPrice: 3465.00,
          currentStop: 3135.00
        }
      },
      riskMetrics: {
        maxDrawdown: -2.5,
        timeInPosition: 45, // minutes
        volatilityRisk: 'MEDIUM',
        liquidationPrice: 2475.00,
        marginRatio: 0.15
      },
      whaleAlerts: [
        {
          timestamp: Date.now() - 15 * 60 * 1000,
          phase: 'SETUP',
          action: 'LEVERAGE_REDUCED',
          message: 'Leverage reduced from 5x to 3x due to whale setup detection'
        }
      ]
    }
  ];

  const getRiskColor = (risk: string | number) => {
    if (typeof risk === 'number') {
      if (risk >= 80) return '#dc2626';
      if (risk >= 60) return '#ef4444';
      if (risk >= 40) return '#f59e0b';
      return '#10b981';
    }
    
    switch (risk) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      case 'EXTREME': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">📊</div>
        <div>
          <h3 className="text-lg font-semibold text-white">Enhanced Position Management</h3>
          <p className="text-sm text-gray-400">Whale-aware position monitoring and risk management</p>
        </div>
      </div>

      {mockPositions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📈</div>
          <p className="text-gray-400">No active positions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockPositions.map((position, index) => (
            <div key={position.symbol} className="bg-slate-700 rounded-lg p-4">
              {/* Position Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-white text-lg">{position.symbol}</div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    position.side === 'LONG' 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-red-900 text-red-300'
                  }`}>
                    {position.side}
                  </span>
                  <span className="text-sm text-gray-400">
                    {position.size} @ ${position.entryPrice.toFixed(2)}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">
                    ({position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              {/* Whale Risk & Leverage */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-600 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Whale Risk</div>
                  <div 
                    className="text-lg font-bold"
                    style={{ color: getRiskColor(position.whaleRiskScore) }}
                  >
                    {position.whaleRiskScore}%
                  </div>
                </div>
                <div className="bg-slate-600 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Leverage</div>
                  <div className="text-lg font-bold text-white">
                    {position.dynamicLeverage}x
                    {position.dynamicLeverage !== position.originalLeverage && (
                      <span className="text-xs text-yellow-400 ml-1">
                        (was {position.originalLeverage}x)
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-slate-600 rounded p-3">
                  <div className="text-xs text-gray-400 mb-1">Time</div>
                  <div className="text-lg font-bold text-white">
                    {formatTime(position.riskMetrics.timeInPosition)}
                  </div>
                </div>
              </div>

              {/* Exit Strategy */}
              <div className="mb-4">
                <div className="text-sm font-medium text-white mb-2">Exit Strategy</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-600 rounded p-3">
                    <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
                    <div className="text-sm font-bold text-red-400">
                      ${position.exitStrategy.stopLoss.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(((position.exitStrategy.stopLoss - position.entryPrice) / position.entryPrice) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-slate-600 rounded p-3">
                    <div className="text-xs text-gray-400 mb-1">Liquidation</div>
                    <div className="text-sm font-bold text-red-500">
                      ${position.riskMetrics.liquidationPrice.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Margin: {(position.riskMetrics.marginRatio * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Take Profit Levels */}
              <div className="mb-4">
                <div className="text-sm font-medium text-white mb-2">Take Profit Levels</div>
                <div className="space-y-2">
                  {position.exitStrategy.takeProfitLevels.map((tp, tpIndex) => (
                    <div key={tpIndex} className="flex items-center justify-between bg-slate-600 rounded p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">TP{tpIndex + 1}</span>
                        <span className="text-sm text-white">${tp.price.toFixed(2)}</span>
                        <span className="text-xs text-gray-400">({tp.percentage}%)</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        tp.status === 'HIT' ? 'bg-green-900 text-green-300' :
                        tp.status === 'CANCELLED' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'
                      }`}>
                        {tp.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Whale Alerts */}
              {position.whaleAlerts.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-white mb-2">Recent Whale Alerts</div>
                  <div className="space-y-2">
                    {position.whaleAlerts.slice(0, 3).map((alert, alertIndex) => (
                      <div key={alertIndex} className="bg-slate-600 rounded p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-yellow-400">{alert.phase}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <span className="text-xs text-blue-400">{alert.action}</span>
                        </div>
                        <div className="text-xs text-gray-300 mt-1">
                          {alert.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-600">
                <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded transition-colors">
                  Close Position
                </button>
                <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-2 px-3 rounded transition-colors">
                  Adjust Stop Loss
                </button>
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded transition-colors">
                  Scale Out
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}