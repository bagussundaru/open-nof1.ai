// Real-time Performance Monitor - Advanced monitoring with real-time P&L tracking and alerts

import { EventEmitter } from 'events';
import { PerformanceTracker } from './performance-tracker';
import { 
  PerformanceMetrics, 
  TradingActivityLog, 
  AlertMessage, 
  AlertSeverity,
  RealTimeUpdate 
} from './types';
import { 
  TradingPosition, 
  TradeExecution 
} from '../../types';

export interface RealTimePerformanceConfig {
  updateInterval: number; // milliseconds
  alertThresholds: {
    dailyLossPercentage: number;
    drawdownPercentage: number;
    winRateThreshold: number;
    performanceDegradationThreshold: number;
  };
  enableRealTimeAlerts: boolean;
  enablePerformanceDegradationDetection: boolean;
}

export interface PerformanceDegradationAlert {
  type: 'performance_degradation';
  metric: string;
  currentValue: number;
  previousValue: number;
  threshold: number;
  severity: AlertSeverity;
  timestamp: Date;
}

export interface RiskMetrics {
  currentDrawdown: number;
  dailyPnL: number;
  dailyPnLPercentage: number;
  positionRisk: number;
  portfolioValue: number;
  riskAdjustedReturn: number;
  volatility: number;
  valueAtRisk: number; // 95% VaR
}

export class RealTimePerformanceMonitor extends EventEmitter {
  private performanceTracker: PerformanceTracker;
  private config: RealTimePerformanceConfig;
  private isRunning: boolean = false;
  private updateTimer?: NodeJS.Timeout;
  private lastMetrics?: PerformanceMetrics;
  private dailyStartBalance: number = 0;
  private dailyStartTime: Date = new Date();
  private performanceHistory: PerformanceMetrics[] = [];
  private riskMetricsHistory: RiskMetrics[] = [];

  constructor(
    performanceTracker: PerformanceTracker,
    config: RealTimePerformanceConfig
  ) {
    super();
    this.performanceTracker = performanceTracker;
    this.config = config;
    this.dailyStartBalance = performanceTracker['startingBalance'] || 10000;
    this.resetDailyTracking();
  }

  /**
   * Start real-time performance monitoring
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.resetDailyTracking();
    
    // Start periodic updates
    this.updateTimer = setInterval(() => {
      this.updatePerformanceMetrics();
    }, this.config.updateInterval);

    this.emit('monitoring_started');
  }

  /**
   * Stop real-time performance monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this.emit('monitoring_stopped');
  }

  /**
   * Update performance metrics and check for alerts
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      const currentMetrics = await this.performanceTracker.getPerformanceMetrics();
      const riskMetrics = await this.calculateRiskMetrics(currentMetrics);
      
      // Store metrics history
      this.performanceHistory.push(currentMetrics);
      this.riskMetricsHistory.push(riskMetrics);
      
      // Keep only last 100 entries
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
        this.riskMetricsHistory = this.riskMetricsHistory.slice(-100);
      }

      // Check for performance degradation
      if (this.config.enablePerformanceDegradationDetection && this.lastMetrics) {
        this.checkPerformanceDegradation(currentMetrics, this.lastMetrics);
      }

      // Check risk thresholds
      this.checkRiskThresholds(riskMetrics);

      // Emit real-time update
      const update: RealTimeUpdate = {
        type: 'performance_update',
        timestamp: new Date(),
        data: {
          performance: currentMetrics,
          risk: riskMetrics
        }
      };
      
      this.emit('performance_update', update);
      this.lastMetrics = currentMetrics;

    } catch (error) {
      this.emit('monitoring_error', error);
    }
  }

  /**
   * Calculate comprehensive risk metrics
   */
  private async calculateRiskMetrics(performance: PerformanceMetrics): Promise<RiskMetrics> {
    // Calculate daily P&L
    const dailyPnL = performance.currentBalance - this.dailyStartBalance;
    const dailyPnLPercentage = this.dailyStartBalance > 0 ? 
      (dailyPnL / this.dailyStartBalance) * 100 : 0;

    // Calculate current drawdown from peak
    const currentDrawdown = performance.maxDrawdown;

    // Calculate portfolio value (current balance + unrealized P&L)
    const portfolioValue = performance.currentBalance;

    // Calculate position risk (simplified as percentage of portfolio in positions)
    const positionRisk = this.calculatePositionRisk(portfolioValue);

    // Calculate risk-adjusted return (Sharpe ratio)
    const riskAdjustedReturn = performance.sharpeRatio;

    // Calculate volatility from recent performance
    const volatility = this.calculateVolatility();

    // Calculate Value at Risk (95% confidence)
    const valueAtRisk = this.calculateValueAtRisk(portfolioValue, volatility);

    return {
      currentDrawdown,
      dailyPnL,
      dailyPnLPercentage,
      positionRisk,
      portfolioValue,
      riskAdjustedReturn,
      volatility,
      valueAtRisk
    };
  }

  /**
   * Calculate position risk as percentage of portfolio
   */
  private calculatePositionRisk(portfolioValue: number): number {
    // This would need access to current positions
    // For now, return a placeholder calculation
    return 0; // TODO: Implement based on actual position data
  }

  /**
   * Calculate portfolio volatility from recent performance
   */
  private calculateVolatility(): number {
    if (this.performanceHistory.length < 2) {
      return 0;
    }

    // Calculate returns from recent performance history
    const returns: number[] = [];
    for (let i = 1; i < this.performanceHistory.length; i++) {
      const prevBalance = this.performanceHistory[i - 1].currentBalance;
      const currentBalance = this.performanceHistory[i].currentBalance;
      
      if (prevBalance > 0) {
        const returnRate = (currentBalance - prevBalance) / prevBalance;
        returns.push(returnRate);
      }
    }

    if (returns.length < 2) {
      return 0;
    }

    // Calculate standard deviation of returns
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * 100; // Return as percentage
  }

  /**
   * Calculate Value at Risk (95% confidence level)
   */
  private calculateValueAtRisk(portfolioValue: number, volatility: number): number {
    // Simplified VaR calculation using normal distribution
    // 95% confidence level corresponds to 1.645 standard deviations
    const confidenceLevel = 1.645;
    return portfolioValue * (volatility / 100) * confidenceLevel;
  }

  /**
   * Check for performance degradation alerts
   */
  private checkPerformanceDegradation(
    current: PerformanceMetrics, 
    previous: PerformanceMetrics
  ): void {
    const threshold = this.config.alertThresholds.performanceDegradationThreshold;

    // Check win rate degradation
    if (current.winRate < previous.winRate - threshold) {
      this.emitPerformanceDegradationAlert(
        'win_rate',
        current.winRate,
        previous.winRate,
        threshold,
        'warning'
      );
    }

    // Check Sharpe ratio degradation
    if (current.sharpeRatio < previous.sharpeRatio - (threshold / 100)) {
      this.emitPerformanceDegradationAlert(
        'sharpe_ratio',
        current.sharpeRatio,
        previous.sharpeRatio,
        threshold / 100,
        'warning'
      );
    }

    // Check ROI degradation
    if (current.returnOnInvestment < previous.returnOnInvestment - threshold) {
      this.emitPerformanceDegradationAlert(
        'return_on_investment',
        current.returnOnInvestment,
        previous.returnOnInvestment,
        threshold,
        'warning'
      );
    }
  }

  /**
   * Check risk threshold violations
   */
  private checkRiskThresholds(riskMetrics: RiskMetrics): void {
    const thresholds = this.config.alertThresholds;

    // Check daily loss threshold
    if (riskMetrics.dailyPnLPercentage <= -thresholds.dailyLossPercentage) {
      this.emitRiskAlert(
        'daily_loss_threshold',
        `Daily loss of ${riskMetrics.dailyPnLPercentage.toFixed(2)}% exceeds threshold of ${thresholds.dailyLossPercentage}%`,
        'error',
        { dailyPnL: riskMetrics.dailyPnL, percentage: riskMetrics.dailyPnLPercentage }
      );
    }

    // Check drawdown threshold
    if (riskMetrics.currentDrawdown >= thresholds.drawdownPercentage) {
      this.emitRiskAlert(
        'drawdown_threshold',
        `Current drawdown of ${riskMetrics.currentDrawdown.toFixed(2)}% exceeds threshold of ${thresholds.drawdownPercentage}%`,
        'error',
        { drawdown: riskMetrics.currentDrawdown }
      );
    }

    // Check Value at Risk
    const varPercentage = (riskMetrics.valueAtRisk / riskMetrics.portfolioValue) * 100;
    if (varPercentage > 10) { // 10% VaR threshold
      this.emitRiskAlert(
        'value_at_risk',
        `Value at Risk of ${riskMetrics.valueAtRisk.toFixed(2)} (${varPercentage.toFixed(2)}%) is high`,
        'warning',
        { valueAtRisk: riskMetrics.valueAtRisk, percentage: varPercentage }
      );
    }
  }

  /**
   * Emit performance degradation alert
   */
  private emitPerformanceDegradationAlert(
    metric: string,
    currentValue: number,
    previousValue: number,
    threshold: number,
    severity: AlertSeverity
  ): void {
    const alert: PerformanceDegradationAlert = {
      type: 'performance_degradation',
      metric,
      currentValue,
      previousValue,
      threshold,
      severity,
      timestamp: new Date()
    };

    this.emit('performance_degradation', alert);
  }

  /**
   * Emit risk alert
   */
  private emitRiskAlert(
    type: string,
    message: string,
    severity: AlertSeverity,
    data?: any
  ): void {
    const alert: AlertMessage = {
      id: `risk_${type}_${Date.now()}`,
      timestamp: new Date(),
      severity,
      title: `Risk Alert: ${type.replace('_', ' ').toUpperCase()}`,
      message,
      data,
      acknowledged: false
    };

    this.emit('risk_alert', alert);
  }

  /**
   * Reset daily tracking (call at start of each trading day)
   */
  resetDailyTracking(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (this.dailyStartTime.getTime() !== today.getTime()) {
      this.dailyStartTime = today;
      // Get current balance as starting balance for the day
      this.performanceTracker.getPerformanceMetrics().then(metrics => {
        this.dailyStartBalance = metrics.currentBalance;
      });
    }
  }

  /**
   * Get current risk metrics
   */
  async getCurrentRiskMetrics(): Promise<RiskMetrics> {
    const performance = await this.performanceTracker.getPerformanceMetrics();
    return this.calculateRiskMetrics(performance);
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    return limit ? this.performanceHistory.slice(-limit) : [...this.performanceHistory];
  }

  /**
   * Get risk metrics history
   */
  getRiskMetricsHistory(limit?: number): RiskMetrics[] {
    return limit ? this.riskMetricsHistory.slice(-limit) : [...this.riskMetricsHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RealTimePerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new config if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isRunning: boolean;
    uptime: number;
    lastUpdate: Date | null;
    metricsCount: number;
  } {
    return {
      isRunning: this.isRunning,
      uptime: this.performanceTracker.getUptime(),
      lastUpdate: this.lastMetrics ? new Date() : null,
      metricsCount: this.performanceHistory.length
    };
  }
}