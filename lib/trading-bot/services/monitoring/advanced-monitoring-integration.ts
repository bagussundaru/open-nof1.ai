// Advanced Monitoring Integration - Orchestrates all monitoring components

import { EventEmitter } from 'events';
import { PerformanceTracker } from './performance-tracker';
import { NotificationService } from './notification-service';
import { RealTimePerformanceMonitor, RealTimePerformanceConfig } from './real-time-performance-monitor';
import { AdvancedAlertingSystem, AlertDeliveryConfig, AlertChannel, AlertRule } from './advanced-alerting-system';
import { SystemHealthMonitor, SystemHealthConfig } from './system-health-monitor';
import { 
  PerformanceMetrics, 
  SystemHealthStatus, 
  NotificationConfig,
  AlertMessage,
  RealTimeUpdate
} from './types';
import { ErrorHandler } from '../../types';

export interface AdvancedMonitoringConfig {
  performance: RealTimePerformanceConfig;
  alerting: AlertDeliveryConfig;
  systemHealth: SystemHealthConfig;
  notifications: NotificationConfig;
  integration: {
    enableCrossServiceAlerts: boolean;
    enablePerformanceCorrelation: boolean;
    enablePredictiveAlerts: boolean;
    dataRetentionDays: number;
  };
}

export interface MonitoringDashboard {
  performance: PerformanceMetrics;
  systemHealth: SystemHealthStatus;
  alerts: AlertMessage[];
  recentUpdates: RealTimeUpdate[];
  statistics: {
    alertsToday: number;
    systemUptime: number;
    averagePerformance: number;
    healthScore: number;
  };
}

export class AdvancedMonitoringIntegration extends EventEmitter {
  private performanceTracker: PerformanceTracker;
  private notificationService: NotificationService;
  private performanceMonitor: RealTimePerformanceMonitor;
  private alertingSystem: AdvancedAlertingSystem;
  private healthMonitor: SystemHealthMonitor;
  
  private config: AdvancedMonitoringConfig;
  private isRunning: boolean = false;
  private recentUpdates: RealTimeUpdate[] = [];
  private correlationData: Map<string, any> = new Map();

  constructor(
    performanceTracker: PerformanceTracker,
    errorHandler: ErrorHandler,
    config: AdvancedMonitoringConfig
  ) {
    super();
    
    this.performanceTracker = performanceTracker;
    this.config = config;
    
    // Initialize services
    this.notificationService = new NotificationService(config.notifications, errorHandler);
    this.performanceMonitor = new RealTimePerformanceMonitor(performanceTracker, config.performance);
    this.alertingSystem = new AdvancedAlertingSystem(this.notificationService, config.alerting);
    this.healthMonitor = new SystemHealthMonitor(config.systemHealth, this.notificationService);
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for cross-service integration
   */
  private setupEventListeners(): void {
    // Performance monitoring events
    this.performanceMonitor.on('performance_update', (update: RealTimeUpdate) => {
      this.handlePerformanceUpdate(update);
    });

    this.performanceMonitor.on('performance_degradation', (alert: any) => {
      this.handlePerformanceDegradation(alert);
    });

    this.performanceMonitor.on('risk_alert', (alert: AlertMessage) => {
      this.handleRiskAlert(alert);
    });

    // System health events
    this.healthMonitor.on('health_check_completed', (data: any) => {
      this.handleHealthCheckCompleted(data);
    });

    this.healthMonitor.on('failover_triggered', (data: any) => {
      this.handleFailoverTriggered(data);
    });

    this.healthMonitor.on('resource_metrics_updated', (metrics: any) => {
      this.handleResourceMetricsUpdated(metrics);
    });

    // Alerting system events
    this.alertingSystem.on('alert_delivered', (result: any) => {
      this.handleAlertDelivered(result);
    });

    this.alertingSystem.on('alert_delivery_failed', (result: any) => {
      this.handleAlertDeliveryFailed(result);
    });

    this.alertingSystem.on('alert_escalated', (data: any) => {
      this.handleAlertEscalated(data);
    });

    // Notification service events
    this.notificationService.on('criticalAlert', (alert: AlertMessage) => {
      this.handleCriticalAlert(alert);
    });

    this.notificationService.on('safeModeActivated', (alert: AlertMessage) => {
      this.handleSafeModeActivated(alert);
    });
  }

  /**
   * Start all monitoring services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Advanced monitoring is already running');
      return;
    }

    try {
      console.log('Starting advanced monitoring integration...');
      
      // Start services in order
      await this.notificationService.startNotificationService();
      this.performanceMonitor.start();
      this.healthMonitor.start();
      
      this.isRunning = true;
      
      // Send startup notification
      await this.notificationService.sendSystemNotification(
        'Advanced Monitoring Started',
        'All monitoring services have been initialized and are running',
        'info'
      );
      
      this.emit('monitoring_started');
      console.log('Advanced monitoring integration started successfully');
      
    } catch (error) {
      console.error('Failed to start advanced monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop all monitoring services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Advanced monitoring is not running');
      return;
    }

    try {
      console.log('Stopping advanced monitoring integration...');
      
      // Stop services in reverse order
      this.healthMonitor.stop();
      this.performanceMonitor.stop();
      await this.notificationService.stopNotificationService();
      
      this.isRunning = false;
      
      this.emit('monitoring_stopped');
      console.log('Advanced monitoring integration stopped');
      
    } catch (error) {
      console.error('Error stopping advanced monitoring:', error);
    }
  }

  /**
   * Handle performance update events
   */
  private handlePerformanceUpdate(update: RealTimeUpdate): void {
    this.addRecentUpdate(update);
    
    if (this.config.integration.enablePerformanceCorrelation) {
      this.correlatePerformanceData(update);
    }
    
    this.emit('performance_update', update);
  }

  /**
   * Handle performance degradation alerts
   */
  private async handlePerformanceDegradation(alert: any): Promise<void> {
    await this.notificationService.sendPerformanceAlert(
      alert.metric,
      alert.currentValue,
      alert.threshold,
      `Performance degradation detected: ${alert.metric} dropped from ${alert.previousValue} to ${alert.currentValue}`
    );
    
    if (this.config.integration.enablePredictiveAlerts) {
      await this.checkPredictiveAlerts(alert);
    }
  }

  /**
   * Handle risk alerts
   */
  private async handleRiskAlert(alert: AlertMessage): Promise<void> {
    // Risk alerts are already processed by notification service
    // Add additional correlation logic here if needed
    
    if (this.config.integration.enableCrossServiceAlerts) {
      await this.correlateCrossServiceRisks(alert);
    }
  }

  /**
   * Handle health check completion
   */
  private handleHealthCheckCompleted(data: any): void {
    const update: RealTimeUpdate = {
      type: 'system_alert',
      timestamp: new Date(),
      data: {
        type: 'health_check',
        results: data.results,
        duration: data.duration
      }
    };
    
    this.addRecentUpdate(update);
    this.emit('health_update', data);
  }

  /**
   * Handle failover events
   */
  private async handleFailoverTriggered(data: any): Promise<void> {
    await this.notificationService.sendCriticalAlert(
      'System Failover Activated',
      `Failover triggered for ${data.serviceName}: ${data.reason}`,
      undefined,
      false
    );
    
    const update: RealTimeUpdate = {
      type: 'system_alert',
      timestamp: new Date(),
      data: {
        type: 'failover',
        service: data.serviceName,
        reason: data.reason,
        action: data.action
      }
    };
    
    this.addRecentUpdate(update);
    this.emit('failover_event', data);
  }

  /**
   * Handle resource metrics updates
   */
  private handleResourceMetricsUpdated(metrics: any): void {
    if (this.config.integration.enablePerformanceCorrelation) {
      this.correlateResourceMetrics(metrics);
    }
  }

  /**
   * Handle successful alert delivery
   */
  private handleAlertDelivered(result: any): void {
    console.log(`✅ Alert delivered via ${result.channelType}: ${result.alertId}`);
  }

  /**
   * Handle failed alert delivery
   */
  private async handleAlertDeliveryFailed(result: any): Promise<void> {
    console.error(`❌ Alert delivery failed via ${result.channelType}: ${result.error}`);
    
    // Send notification about delivery failure
    await this.notificationService.sendSystemNotification(
      'Alert Delivery Failed',
      `Failed to deliver alert ${result.alertId} via ${result.channelType}: ${result.error}`,
      'error'
    );
  }

  /**
   * Handle alert escalation
   */
  private async handleAlertEscalated(data: any): Promise<void> {
    console.log(`🔺 Alert escalated to level ${data.level}: ${data.originalAlert.id}`);
    
    const update: RealTimeUpdate = {
      type: 'system_alert',
      timestamp: new Date(),
      data: {
        type: 'escalation',
        originalAlert: data.originalAlert,
        escalatedAlert: data.escalatedAlert,
        level: data.level
      }
    };
    
    this.addRecentUpdate(update);
  }

  /**
   * Handle critical alerts
   */
  private async handleCriticalAlert(alert: AlertMessage): Promise<void> {
    // Critical alerts get special handling
    const update: RealTimeUpdate = {
      type: 'system_alert',
      timestamp: new Date(),
      data: {
        type: 'critical',
        alert
      }
    };
    
    this.addRecentUpdate(update);
    this.emit('critical_alert', alert);
  }

  /**
   * Handle safe mode activation
   */
  private async handleSafeModeActivated(alert: AlertMessage): Promise<void> {
    // Emergency response - stop performance monitoring temporarily
    this.performanceMonitor.stop();
    
    const update: RealTimeUpdate = {
      type: 'system_alert',
      timestamp: new Date(),
      data: {
        type: 'safe_mode',
        alert
      }
    };
    
    this.addRecentUpdate(update);
    this.emit('safe_mode_activated', alert);
  }

  /**
   * Add update to recent updates list
   */
  private addRecentUpdate(update: RealTimeUpdate): void {
    this.recentUpdates.unshift(update);
    
    // Keep only last 50 updates
    if (this.recentUpdates.length > 50) {
      this.recentUpdates = this.recentUpdates.slice(0, 50);
    }
  }

  /**
   * Correlate performance data with system metrics
   */
  private correlatePerformanceData(update: RealTimeUpdate): void {
    // Store correlation data for analysis
    this.correlationData.set(`performance_${Date.now()}`, {
      timestamp: update.timestamp,
      performance: update.data.performance,
      risk: update.data.risk
    });
    
    // Keep only recent correlation data
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    for (const key of Array.from(this.correlationData.keys())) {
      const data = this.correlationData.get(key)!;
      if (data.timestamp.getTime() < cutoffTime) {
        this.correlationData.delete(key);
      }
    }
  }

  /**
   * Correlate resource metrics with performance
   */
  private correlateResourceMetrics(metrics: any): void {
    // Analyze correlation between system resources and trading performance
    // This could help predict performance issues before they occur
    
    this.correlationData.set(`resources_${Date.now()}`, {
      timestamp: new Date(),
      cpu: metrics.cpu.usage,
      memory: metrics.memory.usage,
      disk: metrics.disk.usage
    });
  }

  /**
   * Check for predictive alerts based on trends
   */
  private async checkPredictiveAlerts(alert: any): Promise<void> {
    // Analyze trends to predict future issues
    // This is a simplified implementation - real predictive analytics would be more complex
    
    const recentPerformance = Array.from(this.correlationData.values())
      .filter(data => data.performance)
      .slice(-10);
    
    if (recentPerformance.length >= 5) {
      const trend = this.calculateTrend(recentPerformance.map(p => p.performance.returnOnInvestment));
      
      if (trend < -5) { // Declining trend
        await this.notificationService.sendSystemNotification(
          'Predictive Alert: Performance Decline',
          'Performance trend analysis indicates potential continued decline',
          'warning',
          { trend, metric: 'returnOnInvestment' }
        );
      }
    }
  }

  /**
   * Correlate cross-service risks
   */
  private async correlateCrossServiceRisks(alert: AlertMessage): Promise<void> {
    // Check if risk alerts correlate with system health issues
    const currentHealth = this.healthMonitor.getCurrentHealth();
    
    if (currentHealth.errorRate > 10) { // High error rate
      await this.notificationService.sendSystemNotification(
        'Cross-Service Risk Correlation',
        'Risk alert detected during high system error rate - potential system-wide issue',
        'error',
        { riskAlert: alert.id, errorRate: currentHealth.errorRate }
      );
    }
  }

  /**
   * Calculate simple trend from array of values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  async getMonitoringDashboard(): Promise<MonitoringDashboard> {
    const performance = await this.performanceTracker.getPerformanceMetrics();
    const systemHealth = this.healthMonitor.getCurrentHealth();
    const alerts = this.notificationService.getUnacknowledgedAlerts();
    
    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const alertsToday = this.notificationService.getAllAlerts()
      .filter(alert => alert.timestamp >= today).length;
    
    const healthScore = this.calculateHealthScore(systemHealth, performance);
    
    return {
      performance,
      systemHealth,
      alerts,
      recentUpdates: this.recentUpdates.slice(0, 10),
      statistics: {
        alertsToday,
        systemUptime: systemHealth.uptime,
        averagePerformance: performance.returnOnInvestment,
        healthScore
      }
    };
  }

  /**
   * Calculate overall system health score (0-100)
   */
  private calculateHealthScore(health: SystemHealthStatus, performance: PerformanceMetrics): number {
    let score = 100;
    
    // Deduct points for system issues
    if (health.errorRate > 5) score -= 20;
    if (health.cpuUsage > 80) score -= 15;
    if (health.memoryUsage > 85) score -= 15;
    if (health.networkLatency > 1000) score -= 10;
    
    // Deduct points for performance issues
    if (performance.returnOnInvestment < -5) score -= 20;
    if (performance.maxDrawdown > 10) score -= 15;
    if (performance.winRate < 50) score -= 10;
    
    // Check service health
    const services = Object.values(health.services);
    const downServices = services.filter(s => s.status === 'down').length;
    score -= downServices * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Add custom alert channel
   */
  addAlertChannel(channelId: string, channel: AlertChannel): void {
    this.alertingSystem.addChannel(channelId, channel);
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertingSystem.addRule(rule);
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig: Partial<AdvancedMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update individual service configs
    if (newConfig.performance) {
      this.performanceMonitor.updateConfig(newConfig.performance);
    }
    
    if (newConfig.systemHealth) {
      this.healthMonitor.updateConfig(newConfig.systemHealth);
    }
    
    if (newConfig.notifications) {
      this.notificationService.updateConfig(newConfig.notifications);
    }
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): {
    isRunning: boolean;
    services: {
      performance: boolean;
      health: boolean;
      notifications: boolean;
    };
    uptime: number;
    lastUpdate: Date;
  } {
    return {
      isRunning: this.isRunning,
      services: {
        performance: this.performanceMonitor.getStatus().isRunning,
        health: this.healthMonitor.getCurrentHealth().isRunning,
        notifications: this.notificationService.isServiceRunning()
      },
      uptime: this.performanceTracker.getUptime(),
      lastUpdate: new Date()
    };
  }
}