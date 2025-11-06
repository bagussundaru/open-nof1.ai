// Advanced Monitoring Setup - Initialize and configure all monitoring services

import { PerformanceTracker } from './performance-tracker';
import { NotificationService } from './notification-service';
import { RealTimePerformanceMonitor, RealTimePerformanceConfig } from './real-time-performance-monitor';
import { AdvancedAlertingSystem, AlertDeliveryConfig, AlertChannel, AlertRule } from './advanced-alerting-system';
import { SystemHealthMonitor, SystemHealthConfig, APIHealthCheck } from './system-health-monitor';
import { AdvancedMonitoringIntegration, AdvancedMonitoringConfig } from './advanced-monitoring-integration';
import { NotificationConfig, AlertSeverity } from './types';
import { ErrorHandler, NebiusError, GateError, NetworkError } from '../../types';

/**
 * Setup and configure the complete advanced monitoring system
 */
export class MonitoringSetup {
  private monitoringIntegration?: AdvancedMonitoringIntegration;
  
  /**
   * Initialize the complete monitoring system
   */
  async initializeMonitoring(): Promise<AdvancedMonitoringIntegration> {
    console.log('🚀 Initializing Advanced Monitoring & Alerting System...');
    
    // Create error handler
    const errorHandler: ErrorHandler = {
      handleNebiusError: (error: NebiusError) => {
        console.error(`[NEBIUS ERROR] ${error.message}`, error.stack);
      },
      handleGateError: (error: GateError) => {
        console.error(`[GATE ERROR] ${error.message}`, error.stack);
      },
      handleNetworkError: (error: NetworkError) => {
        console.error(`[NETWORK ERROR] ${error.message}`, error.stack);
      },
      logError: (error: Error, context: string) => {
        console.error(`[${context}] ${error.message}`, error.stack);
      }
    };
    
    // Initialize performance tracker
    const performanceTracker = new PerformanceTracker(10000); // $10,000 starting balance
    
    // Configure monitoring system
    const monitoringConfig = this.createMonitoringConfig();
    
    // Create monitoring integration
    this.monitoringIntegration = new AdvancedMonitoringIntegration(
      performanceTracker,
      errorHandler,
      monitoringConfig
    );
    
    // Start monitoring
    await this.monitoringIntegration.start();
    
    console.log('✅ Advanced Monitoring System initialized successfully!');
    return this.monitoringIntegration;
  }
  
  /**
   * Create comprehensive monitoring configuration
   */
  private createMonitoringConfig(): AdvancedMonitoringConfig {
    return {
      performance: this.createPerformanceConfig(),
      alerting: this.createAlertingConfig(),
      systemHealth: this.createSystemHealthConfig(),
      notifications: this.createNotificationConfig(),
      integration: {
        enableCrossServiceAlerts: true,
        enablePerformanceCorrelation: true,
        enablePredictiveAlerts: true,
        dataRetentionDays: 30
      }
    };
  }
  
  /**
   * Create real-time performance monitoring configuration
   */
  private createPerformanceConfig(): RealTimePerformanceConfig {
    return {
      updateInterval: 5000, // 5 seconds
      alertThresholds: {
        dailyLossPercentage: 5.0,     // Alert if daily loss > 5%
        drawdownPercentage: 10.0,     // Alert if drawdown > 10%
        winRateThreshold: 40.0,       // Alert if win rate < 40%
        performanceDegradationThreshold: 5.0 // Alert if performance drops 5%
      },
      enableRealTimeAlerts: true,
      enablePerformanceDegradationDetection: true
    };
  }
  
  /**
   * Create advanced alerting system configuration
   */
  private createAlertingConfig(): AlertDeliveryConfig {
    const channels = new Map<string, AlertChannel>();
    const rules = new Map<string, AlertRule>();
    
    // Setup alert channels
    this.setupAlertChannels(channels);
    
    // Setup alert rules
    this.setupAlertRules(rules);
    
    return {
      channels,
      rules,
      globalSettings: {
        enableEscalation: true,
        maxRetries: 3,
        retryDelaySeconds: 30,
        enableRateLimiting: true,
        rateLimitPerMinute: 10
      }
    };
  }
  
  /**
   * Setup alert delivery channels
   */
  private setupAlertChannels(channels: Map<string, AlertChannel>): void {
    // Console logging (always available)
    channels.set('console', {
      type: 'webhook',
      enabled: true,
      priority: 1,
      config: {
        url: 'console://log',
        method: 'POST'
      }
    });
    
    // Email notifications (if configured)
    channels.set('email', {
      type: 'email',
      enabled: true,
      priority: 8,
      config: {
        to: 'admin@trading-bot.com',
        smtp: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false
        }
      }
    });
    
    // Webhook for external systems
    channels.set('webhook', {
      type: 'webhook',
      enabled: true,
      priority: 5,
      config: {
        url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    });
    
    // SMS for critical alerts (if configured)
    channels.set('sms', {
      type: 'sms',
      enabled: false, // Disabled by default
      priority: 10,
      config: {
        phoneNumber: '+1234567890',
        provider: 'twilio'
      }
    });
  }
  
  /**
   * Setup alert rules
   */
  private setupAlertRules(rules: Map<string, AlertRule>): void {
    // Critical trading loss rule
    rules.set('critical_loss', {
      id: 'critical_loss',
      name: 'Critical Trading Loss',
      condition: {
        type: 'threshold',
        metric: 'dailyPnLPercentage',
        operator: '<=',
        value: -10 // Alert if daily loss >= 10%
      },
      channels: ['console', 'email', 'webhook', 'sms'],
      enabled: true,
      cooldownMinutes: 60,
      escalationRules: [
        {
          delayMinutes: 15,
          channels: ['sms'],
          severity: 'critical',
          message: 'URGENT: Trading loss exceeds 10% - immediate attention required!'
        }
      ]
    });
    
    // High drawdown rule
    rules.set('high_drawdown', {
      id: 'high_drawdown',
      name: 'High Drawdown Alert',
      condition: {
        type: 'threshold',
        metric: 'currentDrawdown',
        operator: '>=',
        value: 15 // Alert if drawdown >= 15%
      },
      channels: ['console', 'email', 'webhook'],
      enabled: true,
      cooldownMinutes: 30
    });
    
    // System health degradation
    rules.set('system_health', {
      id: 'system_health',
      name: 'System Health Degradation',
      condition: {
        type: 'pattern',
        metric: 'severity',
        operator: '=',
        value: 'error'
      },
      channels: ['console', 'webhook'],
      enabled: true,
      cooldownMinutes: 10
    });
    
    // Performance degradation
    rules.set('performance_degradation', {
      id: 'performance_degradation',
      name: 'Performance Degradation',
      condition: {
        type: 'threshold',
        metric: 'winRate',
        operator: '<',
        value: 30 // Alert if win rate < 30%
      },
      channels: ['console', 'email'],
      enabled: true,
      cooldownMinutes: 120
    });
  }
  
  /**
   * Create system health monitoring configuration
   */
  private createSystemHealthConfig(): SystemHealthConfig {
    return {
      checkInterval: 30000, // 30 seconds
      resourceThresholds: {
        cpuUsage: 80,      // Alert if CPU > 80%
        memoryUsage: 85,   // Alert if memory > 85%
        diskUsage: 90,     // Alert if disk > 90%
        responseTime: 5000 // Alert if response time > 5s
      },
      apiHealthChecks: this.createAPIHealthChecks(),
      enableAutoFailover: true,
      failoverThresholds: {
        consecutiveFailures: 3,
        errorRate: 20 // 20% error rate
      }
    };
  }
  
  /**
   * Create API health check configurations
   */
  private createAPIHealthChecks(): APIHealthCheck[] {
    return [
      {
        name: 'nebius_ai',
        url: 'https://api.nebius.ai/health',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200
      },
      {
        name: 'gate_exchange',
        url: 'https://api.gateio.ws/api/v4/spot/currencies',
        method: 'GET',
        timeout: 3000,
        expectedStatus: 200
      },
      {
        name: 'market_data',
        url: 'https://api.binance.com/api/v3/ping',
        method: 'GET',
        timeout: 2000,
        expectedStatus: 200
      }
    ];
  }
  
  /**
   * Create notification service configuration
   */
  private createNotificationConfig(): NotificationConfig {
    return {
      enableRealTimeUpdates: true,
      enableTradeAlerts: true,
      enableErrorAlerts: true,
      enablePerformanceAlerts: true,
      alertThresholds: {
        dailyLossPercentage: 5.0,
        errorRatePercentage: 10.0,
        responseTimeMs: 5000
      }
    };
  }
  
  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard() {
    if (!this.monitoringIntegration) {
      throw new Error('Monitoring system not initialized');
    }
    
    return await this.monitoringIntegration.getMonitoringDashboard();
  }
  
  /**
   * Get monitoring status
   */
  getMonitoringStatus() {
    if (!this.monitoringIntegration) {
      return { isRunning: false, error: 'Not initialized' };
    }
    
    return this.monitoringIntegration.getMonitoringStatus();
  }
  
  /**
   * Stop monitoring system
   */
  async stopMonitoring(): Promise<void> {
    if (this.monitoringIntegration) {
      await this.monitoringIntegration.stop();
      console.log('🛑 Advanced Monitoring System stopped');
    }
  }
  
  /**
   * Add custom alert channel
   */
  addCustomAlertChannel(channelId: string, channel: AlertChannel): void {
    if (this.monitoringIntegration) {
      this.monitoringIntegration.addAlertChannel(channelId, channel);
      console.log(`✅ Added custom alert channel: ${channelId}`);
    }
  }
  
  /**
   * Add custom alert rule
   */
  addCustomAlertRule(rule: AlertRule): void {
    if (this.monitoringIntegration) {
      this.monitoringIntegration.addAlertRule(rule);
      console.log(`✅ Added custom alert rule: ${rule.name}`);
    }
  }
}

// Export singleton instance
export const monitoringSetup = new MonitoringSetup();