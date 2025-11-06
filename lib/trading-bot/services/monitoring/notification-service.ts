// Notification Service - Real-time notifications and alert system
// Implements real-time notifications for significant events and
// alert system for critical errors and safe mode activation

import { EventEmitter } from 'events';
import { 
  AlertMessage, 
  AlertSeverity, 
  NotificationConfig, 
  RealTimeUpdate 
} from './types';
import { 
  TradingPosition, 
  TradeExecution, 
  TradingSignal,
  ErrorHandler 
} from '../../types';

export class NotificationService extends EventEmitter {
  private config: NotificationConfig;
  private errorHandler: ErrorHandler;
  private alerts: Map<string, AlertMessage> = new Map();
  private isRunning: boolean = false;
  
  // Alert thresholds and counters
  private errorCount: number = 0;
  private lastErrorReset: Date = new Date();
  private readonly ERROR_RESET_INTERVAL_MS = 3600000; // 1 hour

  constructor(config: NotificationConfig, errorHandler: ErrorHandler) {
    super();
    this.config = config;
    this.errorHandler = errorHandler;
  }

  /**
   * Start notification service
   * Requirements: 5.4, 5.5, 7.4
   */
  async startNotificationService(): Promise<void> {
    if (this.isRunning) {
      console.log('Notification service is already running');
      return;
    }

    try {
      console.log('Starting notification service...');
      
      // Reset error tracking
      this.resetErrorTracking();
      
      this.isRunning = true;
      
      // Send startup notification
      await this.sendSystemNotification(
        'System Started',
        'Trading bot notification system has been started',
        'info'
      );
      
      this.emit('serviceStarted', {
        timestamp: new Date(),
        config: this.config
      });
      
      console.log('Notification service started successfully');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Start notification service');
      throw error;
    }
  }

  /**
   * Stop notification service
   */
  async stopNotificationService(): Promise<void> {
    if (!this.isRunning) {
      console.log('Notification service is not running');
      return;
    }

    try {
      // Send shutdown notification
      await this.sendSystemNotification(
        'System Stopping',
        'Trading bot notification system is shutting down',
        'warning'
      );
      
      this.isRunning = false;
      
      this.emit('serviceStopped', {
        timestamp: new Date()
      });
      
      console.log('Notification service stopped');
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Stop notification service');
    }
  }

  /**
   * Send real-time notification for significant trading events
   * Requirements: 5.5
   */
  async sendTradingNotification(
    title: string,
    message: string,
    severity: AlertSeverity = 'info',
    data?: any
  ): Promise<void> {
    if (!this.config.enableTradeAlerts && severity === 'info') {
      return;
    }

    try {
      const alert = this.createAlert(title, message, severity, data);
      
      // Store alert
      this.alerts.set(alert.id, alert);
      
      // Emit real-time notification
      this.emit('tradingNotification', alert);
      
      // Log the notification
      this.logNotification(alert);
      
      console.log(`Trading notification: [${severity.toUpperCase()}] ${title} - ${message}`);
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Send trading notification');
    }
  }

  /**
   * Send system notification
   * Requirements: 7.4
   */
  async sendSystemNotification(
    title: string,
    message: string,
    severity: AlertSeverity = 'info',
    data?: any
  ): Promise<void> {
    try {
      const alert = this.createAlert(title, message, severity, data);
      
      // Store alert
      this.alerts.set(alert.id, alert);
      
      // Emit system notification
      this.emit('systemNotification', alert);
      
      // Log the notification
      this.logNotification(alert);
      
      console.log(`System notification: [${severity.toUpperCase()}] ${title} - ${message}`);
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Send system notification');
    }
  }

  /**
   * Send critical error alert and activate safe mode if needed
   * Requirements: 7.4
   */
  async sendCriticalAlert(
    title: string,
    message: string,
    error?: Error,
    activateSafeMode: boolean = false
  ): Promise<void> {
    if (!this.config.enableErrorAlerts) {
      return;
    }

    try {
      this.errorCount++;
      
      const alert = this.createAlert(
        title,
        message,
        'critical',
        {
          error: error?.message,
          stack: error?.stack,
          errorCount: this.errorCount,
          activateSafeMode
        }
      );
      
      // Store alert
      this.alerts.set(alert.id, alert);
      
      // Emit critical alert
      this.emit('criticalAlert', alert);
      
      // Log the critical alert
      this.logNotification(alert);
      
      // Check if error rate threshold exceeded
      if (this.isErrorRateExceeded()) {
        await this.sendSystemNotification(
          'High Error Rate Detected',
          `Error rate threshold exceeded: ${this.errorCount} errors in the last hour`,
          'critical'
        );
      }
      
      // Activate safe mode if requested
      if (activateSafeMode) {
        await this.activateSafeMode(title, message);
      }
      
      console.log(`CRITICAL ALERT: [${title}] ${message}`);
      
    } catch (alertError) {
      this.errorHandler.logError(alertError as Error, 'Send critical alert');
    }
  }

  /**
   * Send performance alert
   * Requirements: 5.4
   */
  async sendPerformanceAlert(
    metric: string,
    currentValue: number,
    threshold: number,
    message: string
  ): Promise<void> {
    if (!this.config.enablePerformanceAlerts) {
      return;
    }

    try {
      const severity: AlertSeverity = currentValue > threshold * 1.5 ? 'critical' : 'warning';
      
      await this.sendSystemNotification(
        `Performance Alert: ${metric}`,
        message,
        severity,
        {
          metric,
          currentValue,
          threshold,
          deviation: ((currentValue - threshold) / threshold) * 100
        }
      );
      
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Send performance alert');
    }
  }

  /**
   * Notify trade execution
   */
  async notifyTradeExecution(trade: TradeExecution): Promise<void> {
    const title = `Trade Executed: ${trade.symbol}`;
    const message = `${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol} at ${trade.price}`;
    
    await this.sendTradingNotification(title, message, 'info', trade);
  }

  /**
   * Notify position update
   */
  async notifyPositionUpdate(position: TradingPosition, action: 'opened' | 'closed'): Promise<void> {
    const title = `Position ${action.charAt(0).toUpperCase() + action.slice(1)}: ${position.symbol}`;
    const message = `${position.side.toUpperCase()} position ${action}: ${position.amount} ${position.symbol}`;
    const severity: AlertSeverity = action === 'closed' && position.unrealizedPnL < 0 ? 'warning' : 'info';
    
    await this.sendTradingNotification(title, message, severity, position);
  }

  /**
   * Notify signal received
   */
  async notifySignalReceived(signal: TradingSignal): Promise<void> {
    if (signal.action === 'hold') return;
    
    const title = `AI Signal: ${signal.symbol}`;
    const message = `${signal.action.toUpperCase()} signal for ${signal.symbol} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`;
    
    await this.sendTradingNotification(title, message, 'info', signal);
  }

  /**
   * Notify risk management event
   */
  async notifyRiskEvent(
    eventType: 'stop_loss' | 'daily_limit' | 'emergency_stop' | 'position_limit',
    symbol: string,
    message: string
  ): Promise<void> {
    const title = `Risk Management: ${eventType.replace('_', ' ').toUpperCase()}`;
    const severity: AlertSeverity = eventType === 'emergency_stop' ? 'critical' : 'warning';
    
    await this.sendTradingNotification(title, `${symbol}: ${message}`, severity, {
      eventType,
      symbol
    });
  }

  /**
   * Activate safe mode
   */
  private async activateSafeMode(reason: string, details: string): Promise<void> {
    const title = 'SAFE MODE ACTIVATED';
    const message = `Trading has been halted due to: ${reason}. ${details}`;
    
    // Create critical safe mode alert
    const alert = this.createAlert(title, message, 'critical', {
      reason,
      details,
      activatedAt: new Date(),
      safeMode: true
    });
    
    this.alerts.set(alert.id, alert);
    
    // Emit safe mode activation
    this.emit('safeModeActivated', alert);
    
    console.log(`🚨 SAFE MODE ACTIVATED: ${reason}`);
  }

  /**
   * Create alert message
   */
  private createAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    data?: any
  ): AlertMessage {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      title,
      message,
      data,
      acknowledged: false
    };
  }

  /**
   * Log notification to activity log
   */
  private logNotification(alert: AlertMessage): void {
    try {
      const logLevel = this.getLogLevel(alert.severity);
      const logMessage = `[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`;
      
      // Log to error handler
      if (alert.severity === 'error' || alert.severity === 'critical') {
        this.errorHandler.logError(new Error(logMessage), 'Notification');
      } else {
        console.log(`[NOTIFICATION] ${logMessage}`);
      }
      
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Get log level for severity
   */
  private getLogLevel(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'ERROR';
      case 'error': return 'ERROR';
      case 'warning': return 'WARN';
      case 'info': return 'INFO';
      default: return 'INFO';
    }
  }

  /**
   * Check if error rate threshold is exceeded
   */
  private isErrorRateExceeded(): boolean {
    const now = new Date();
    const timeSinceReset = now.getTime() - this.lastErrorReset.getTime();
    
    // Reset error count if more than 1 hour has passed
    if (timeSinceReset > this.ERROR_RESET_INTERVAL_MS) {
      this.resetErrorTracking();
      return false;
    }
    
    // Calculate error rate per hour
    const errorRatePerHour = (this.errorCount / timeSinceReset) * this.ERROR_RESET_INTERVAL_MS;
    
    return errorRatePerHour > this.config.alertThresholds.errorRatePercentage;
  }

  /**
   * Reset error tracking
   */
  private resetErrorTracking(): void {
    this.errorCount = 0;
    this.lastErrorReset = new Date();
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): AlertMessage[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): AlertMessage[] {
    return this.getAllAlerts().filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    let clearedCount = 0;
    
    for (const id of Array.from(this.alerts.keys())) {
      const alert = this.alerts.get(id)!;
      if (alert.timestamp < cutoffTime && alert.acknowledged) {
        this.alerts.delete(id);
        clearedCount++;
      }
    }
    
    return clearedCount;
  }

  /**
   * Update notification configuration
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.emit('configUpdated', this.config);
  }

  /**
   * Get notification statistics
   */
  getNotificationStatistics(): {
    totalAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    unacknowledgedCount: number;
    errorRate: number;
  } {
    const alerts = this.getAllAlerts();
    const alertsBySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };
    
    for (const alert of alerts) {
      alertsBySeverity[alert.severity]++;
    }
    
    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
    
    // Calculate current error rate
    const now = new Date();
    const timeSinceReset = now.getTime() - this.lastErrorReset.getTime();
    const errorRate = timeSinceReset > 0 ? 
      (this.errorCount / timeSinceReset) * this.ERROR_RESET_INTERVAL_MS : 0;
    
    return {
      totalAlerts: alerts.length,
      alertsBySeverity,
      unacknowledgedCount,
      errorRate
    };
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }
}