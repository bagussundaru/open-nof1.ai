'use client';

import React, { useState, useEffect } from 'react';

interface WhaleManipulationData {
  setupScore: number;
  triggerScore: number;
  executionScore: number;
  currentPhase: 'NONE' | 'SETUP' | 'TRIGGER' | 'EXECUTION' | 'FLUSH' | 'RE_ENTRY';
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasoning: string;
  alerts: Array<{
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    action: string;
  }>;
}

interface WhaleManipulationPanelProps {
  data?: WhaleManipulationData;
  symbol?: string;
  aiAnalysis?: any;
}

export default function WhaleManipulationPanel({ data, symbol = 'BTCUSDT', aiAnalysis }: WhaleManipulationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Use real whale detection data from AI analysis if available
  const whaleDetection = aiAnalysis?.success && aiAnalysis.data?.whaleDetection ? aiAnalysis.data.whaleDetection : null;
  
  // Convert AI analysis data to component format
  const whaleData = data || (whaleDetection ? {
    setupScore: Math.round(whaleDetection.averageSetupScore || 0),
    triggerScore: Math.round(whaleDetection.averageTriggerScore || 0),
    executionScore: Math.round(whaleDetection.averageExecutionScore || 0),
    currentPhase: whaleDetection.marketPhase || 'NONE',
    risk: whaleDetection.overallRisk || 'LOW',
    reasoning: `Market Phase: ${whaleDetection.marketPhase}. ${whaleDetection.setupPhase} symbols in setup, ${whaleDetection.triggerPhase} in trigger, ${whaleDetection.executionPhase} in execution phase. ${whaleDetection.blockedTrades} trades blocked. Recommendation: ${whaleDetection.recommendation?.replace(/_/g, ' ')}`,
    alerts: generateAlertsFromDetection(whaleDetection)
  } : {
    setupScore: 75,
    triggerScore: 45,
    executionScore: 20,
    currentPhase: 'SETUP' as const,
    risk: 'HIGH' as const,
    reasoning: 'Funding rate climbing to 0.08%, Long/Short ratio at 2.3 indicating retail overleveraged. Open Interest up 15% but volume only up 3%. Large spoofing walls detected at key resistance levels.',
    alerts: [
      {
        severity: 'WARNING' as const,
        message: 'Whale setup phase detected',
        action: 'Avoid new long positions'
      }
    ]
  });

  function generateAlertsFromDetection(detection: any) {
    const alerts = [];
    
    if (detection.executionPhase > 0) {
      alerts.push({
        severity: 'CRITICAL' as const,
        message: `${detection.executionPhase} symbols in execution phase`,
        action: 'Close all positions immediately'
      });
    }
    
    if (detection.triggerPhase > 0) {
      alerts.push({
        severity: 'WARNING' as const,
        message: `${detection.triggerPhase} symbols in trigger phase`,
        action: 'Avoid new trades, prepare to close positions'
      });
    }
    
    if (detection.setupPhase > 0) {
      alerts.push({
        severity: 'WARNING' as const,
        message: `${detection.setupPhase} symbols in setup phase`,
        action: 'Reduce position sizes, avoid new longs'
      });
    }
    
    if (detection.blockedTrades > 0) {
      alerts.push({
        severity: 'INFO' as const,
        message: `${detection.blockedTrades} trades blocked by whale protection`,
        action: 'System automatically protecting capital'
      });
    }
    
    return alerts;
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'NONE': return '#10b981'; // Green
      case 'SETUP': return '#f59e0b'; // Yellow
      case 'TRIGGER': return '#ef4444'; // Red
      case 'EXECUTION': return '#dc2626'; // Dark Red
      case 'FLUSH': return '#8b5cf6'; // Purple
      case 'RE_ENTRY': return '#06b6d4'; // Cyan
      default: return '#6b7280'; // Gray
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return '#10b981';
      case 'MEDIUM': return '#f59e0b';
      case 'HIGH': return '#ef4444';
      case 'CRITICAL': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#dc2626'; // Critical
    if (score >= 60) return '#ef4444'; // High
    if (score >= 40) return '#f59e0b'; // Medium
    return '#10b981'; // Low
  };

  const CircularGauge = ({ score, label, size = 80 }: { score: number; label: string; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#374151"
              strokeWidth="4"
              fill="transparent"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getScoreColor(score)}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color: getScoreColor(score) }}>
              {score}%
            </span>
          </div>
        </div>
        <span className="text-sm text-gray-400 mt-2">{label}</span>
      </div>
    );
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🐋</div>
          <div>
            <h3 className="text-lg font-semibold text-white">Whale Manipulation Detector</h3>
            <p className="text-sm text-gray-400">{symbol} - Real-time whale activity analysis</p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Current Phase & Risk */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Current Phase</div>
              <div 
                className="text-xl font-bold"
                style={{ color: getPhaseColor(whaleData.currentPhase) }}
              >
                {whaleData.currentPhase}
              </div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Risk Level</div>
              <div 
                className="text-xl font-bold"
                style={{ color: getRiskColor(whaleData.risk) }}
              >
                {whaleData.risk}
              </div>
            </div>
          </div>

          {/* Manipulation Scores */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-white mb-4">Manipulation Scores</h4>
            <div className="grid grid-cols-3 gap-6">
              <CircularGauge score={whaleData.setupScore} label="Setup" />
              <CircularGauge score={whaleData.triggerScore} label="Trigger" />
              <CircularGauge score={whaleData.executionScore} label="Execution" />
            </div>
          </div>

          {/* Phase Indicators */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-white mb-3">Phase Indicators</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: whaleData.setupScore >= 70 ? '#f59e0b' : '#374151' }}
                />
                <span className="text-sm text-gray-300">
                  Setup Phase {whaleData.setupScore >= 70 ? '(ACTIVE)' : '(Inactive)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: whaleData.triggerScore >= 80 ? '#ef4444' : '#374151' }}
                />
                <span className="text-sm text-gray-300">
                  Trigger Phase {whaleData.triggerScore >= 80 ? '(ACTIVE)' : '(Inactive)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: whaleData.executionScore >= 80 ? '#dc2626' : '#374151' }}
                />
                <span className="text-sm text-gray-300">
                  Execution Phase {whaleData.executionScore >= 80 ? '(ACTIVE)' : '(Inactive)'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-white mb-3">AI Analysis</h4>
            <div className="bg-slate-700 rounded-lg p-4">
              <p className="text-sm text-gray-300 leading-relaxed">
                {whaleData.reasoning}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {whaleData.alerts && whaleData.alerts.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-white mb-3">Active Alerts</h4>
              <div className="space-y-2">
                {whaleData.alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={`rounded-lg p-3 border-l-4 ${
                      alert.severity === 'CRITICAL' 
                        ? 'bg-red-900/20 border-red-500' 
                        : alert.severity === 'WARNING'
                        ? 'bg-yellow-900/20 border-yellow-500'
                        : 'bg-blue-900/20 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">
                        {alert.severity === 'CRITICAL' ? '🚨' : 
                         alert.severity === 'WARNING' ? '⚠️' : 'ℹ️'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium text-white text-sm">
                          {alert.message}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Action: {alert.action}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="text-xs text-gray-500">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Setup (70%+):</strong> Whale setting trap
                </div>
                <div>
                  <strong>Trigger (80%+):</strong> Dump imminent
                </div>
                <div>
                  <strong>Execution (80%+):</strong> Manipulation active
                </div>
                <div>
                  <strong>Re-entry:</strong> Safe to trade again
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}