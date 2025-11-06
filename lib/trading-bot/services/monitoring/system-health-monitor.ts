// System Health Monitor - Comprehensive system resource and API health monitoring

import { EventEmitter } from 'events';
import { SystemHealthStatus, ServiceStatus, AlertMessage } from './types';
import { NotificationService } from './notification-service';

export interface SystemResourceMetrics {
  cpu: {
    usage: number; // percentage
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    usage: number; // percentage
    heap: {
      used: number;
      total: number;
    };
  };
  disk: {
    used: number; // bytes
    total: number; // bytes
    usage: number; // percentage
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
  };
}

export interface APIHealthCheck {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  expectedStatus?: number;
  headers?: Record<string, string>;
  body?: any;
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  timestamp: Date;
  error?: string;
  details?: any;
}

export interface SystemHealthConfig {
  checkInterval: number; // milliseconds
  resourceThresholds: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
    responseTime: number; // milliseconds
  };
  apiHealthChecks: APIHealthCheck[];
  enableAutoFailover: boolean;
  failoverThresholds: {
    consecutiveFailures: number;
    errorRate: number; // percentage
  };
}

export interface FailoverAction {
  type: 'restart_service' | 'switch_endpoint' | 'enable_backup' | 'alert_only';
  target: string;
  config?: any;
}

export class SystemHealthMonitor extends EventEmitter {
  private config: SystemHealthConfig;
  private notificationService: NotificationService;
  private isRunning: boolean = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private resourceCheckTimer?: NodeJS.Timeout;
  
  private currentHealth: SystemHealthStatus;
  private healthHistory: HealthCheckResult[] = [];
  private resourceHistory: SystemResourceMetrics[] = [];
  private failureCounters: Map<string, number> = new Map();
  private lastHealthCheck: Date = new Date();

  constructor(
    config: SystemHealthConfig,
    notificationService: NotificationService
  ) {
    super();
    this.config = config;
    this.notificationService = notificationService;
    
    this.currentHealth = this.initializeHealthStatus();
  }

  /**
   * Initialize default health status
   */
  private initializeHealthStatus(): SystemHealthStatus {
    return {
      isRunning: false,
      uptime: 0,
      lastUpdate: new Date(),
      services: {
        nebiusAI: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' },
        gateExchange: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' },
        marketData: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' },
        riskManagement: { isConnected: false, lastPing: new Date(), responseTime: 0, errorCount: 0, status: 'down' }
      },
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      errorRate: 0
    };
  }

  /**
   * Start system health monitoring
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.currentHealth.isRunning = true;
    this.lastHealthCheck = new Date();

    // Start periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);

    // Start resource monitoring (more frequent)
    this.resourceCheckTimer = setInterval(() => {
      this.checkSystemResources();
    }, Math.min(this.config.checkInterval / 2, 5000));

    this.emit('health_monitoring_started');
    console.log('System health monitoring started');
  }

  /**
   * Stop system health monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.currentHealth.isRunning = false;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.resourceCheckTimer) {
      clearInterval(this.resourceCheckTimer);
      this.resourceCheckTimer = undefined;
    }

    this.emit('health_monitoring_stopped');
    console.log('System health monitoring stopped');
  }

  /**
   * Perform comprehensive health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check API endpoints
      const apiResults = await this.checkAPIHealth();
      
      // Update service statuses
      this.updateServiceStatuses(apiResults);
      
      // Check for failures and trigger failover if needed
      if (this.config.enableAutoFailover) {
        await this.checkFailoverConditions(apiResults);
      }
      
      // Update overall health status
      this.updateOverallHealth();
      
      // Store results in history
      this.healthHistory.push(...apiResults);
      this.trimHistory();
      
      const checkDuration = Date.now() - startTime;
      this.lastHealthCheck = new Date();
      
      this.emit('health_check_completed', {
        duration: checkDuration,
        results: apiResults,
        overallHealth: this.currentHealth
      });

    } catch (error) {
      console.error('Health check failed:', error);
      this.emit('health_check_error', error);
    }
  }

  /**
   * Check API health for all configured endpoints
   */
  private async checkAPIHealth(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (const healthCheck of this.config.apiHealthChecks) {
      const result = await this.performSingleHealthCheck(healthCheck);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Perform single API health check
   */
  private async performSingleHealthCheck(healthCheck: APIHealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Mock API health check - in real implementation, use fetch or axios
      await this.delay(Math.random() * 100 + 50); // Simulate network delay
      
      const responseTime = Date.now() - startTime;
      const isHealthy = responseTime < this.config.resourceThresholds.responseTime;
      
      // Simulate occasional failures for testing
      const simulateFailure = Math.random() < 0.05; // 5% failure rate
      
      if (simulateFailure) {
        throw new Error('Simulated API failure');
      }
      
      return {
        name: healthCheck.name,
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date(),
        details: {
          url: healthCheck.url,
          method: healthCheck.method
        }
      };
      
    } catch (error) {
      return {
        name: healthCheck.name,
        status: 'down',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        error: (error as Error).message,
        details: {
          url: healthCheck.url,
          method: healthCheck.method
        }
      };
    }
  }

  /**
   * Check system resources (CPU, memory, disk)
   */
  private async checkSystemResources(): Promise<void> {
    try {
      const resources = await this.getSystemResourceMetrics();
      
      // Store in history
      this.resourceHistory.push(resources);
      if (this.resourceHistory.length > 100) {
        this.resourceHistory = this.resourceHistory.slice(-100);
      }
      
      // Update current health status
      this.currentHealth.cpuUsage = resources.cpu.usage;
      this.currentHealth.memoryUsage = resources.memory.usage;
      
      // Check thresholds and alert if needed
      await this.checkResourceThresholds(resources);
      
      this.emit('resource_metrics_updated', resources);
      
    } catch (error) {
      console.error('Resource check failed:', error);
      this.emit('resource_check_error', error);
    }
  }

  /**
   * Get system resource metrics
   */
  private async getSystemResourceMetrics(): Promise<SystemResourceMetrics> {
    // Mock system metrics - in real implementation, use os module or system monitoring libraries
    
    // Simulate realistic CPU usage
    const cpuUsage = Math.random() * 30 + 10; // 10-40%
    
    // Simulate memory usage
    const memoryTotal = 8 * 1024 * 1024 * 1024; // 8GB
    const memoryUsed = memoryTotal * (Math.random() * 0.4 + 0.3); // 30-70%
    const memoryUsage = (memoryUsed / memoryTotal) * 100;
    
    // Simulate heap usage
    const heapTotal = 512 * 1024 * 1024; // 512MB
    const heapUsed = heapTotal * (Math.random() * 0.6 + 0.2); // 20-80%
    
    // Simulate disk usage
    const diskTotal = 100 * 1024 * 1024 * 1024; // 100GB
    const diskUsed = diskTotal * (Math.random() * 0.3 + 0.4); // 40-70%
    const diskUsage = (diskUsed / diskTotal) * 100;
    
    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: [1.2, 1.5, 1.8],
        cores: 4
      },
      memory: {
        used: memoryUsed,
        total: memoryTotal,
        usage: memoryUsage,
        heap: {
          used: heapUsed,
          total: heapTotal
        }
      },
      disk: {
        used: diskUsed,
        total: diskTotal,
        usage: diskUsage
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        packetsIn: Math.floor(Math.random() * 10000),
        packetsOut: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 5)
      }
    };
  }

  /**
   * Check resource thresholds and send alerts
   */
  private async checkResourceThresholds(resources: SystemResourceMetrics): Promise<void> {
    const thresholds = this.config.resourceThresholds;
    
    // Check CPU usage
    if (resources.cpu.usage > thresholds.cpuUsage) {
      await this.notificationService.sendSystemNotification(
        'High CPU Usage',
        `CPU usage is ${resources.cpu.usage.toFixed(1)}%, exceeding threshold of ${thresholds.cpuUsage}%`,
        'warning',
        { cpuUsage: resources.cpu.usage, threshold: thresholds.cpuUsage }
      );
    }
    
    // Check memory usage
    if (resources.memory.usage > thresholds.memoryUsage) {
      await this.notificationService.sendSystemNotification(
        'High Memory Usage',
        `Memory usage is ${resources.memory.usage.toFixed(1)}%, exceeding threshold of ${thresholds.memoryUsage}%`,
        'warning',
        { memoryUsage: resources.memory.usage, threshold: thresholds.memoryUsage }
      );
    }
    
    // Check disk usage
    if (resources.disk.usage > thresholds.diskUsage) {
      await this.notificationService.sendSystemNotification(
        'High Disk Usage',
        `Disk usage is ${resources.disk.usage.toFixed(1)}%, exceeding threshold of ${thresholds.diskUsage}%`,
        'error',
        { diskUsage: resources.disk.usage, threshold: thresholds.diskUsage }
      );
    }
  }

  /**
   * Update service statuses based on health check results
   */
  private updateServiceStatuses(results: HealthCheckResult[]): void {
    for (const result of results) {
      let serviceKey: keyof typeof this.currentHealth.services;
      
      // Map health check names to service keys
      switch (result.name.toLowerCase()) {
        case 'nebius':
        case 'nebius_ai':
          serviceKey = 'nebiusAI';
          break;
        case 'gate':
        case 'gate_exchange':
          serviceKey = 'gateExchange';
          break;
        case 'market_data':
          serviceKey = 'marketData';
          break;
        case 'risk_management':
          serviceKey = 'riskManagement';
          break;
        default:
          continue; // Skip unknown services
      }
      
      const service = this.currentHealth.services[serviceKey];
      service.status = result.status;
      service.responseTime = result.responseTime;
      service.lastPing = result.timestamp;
      service.isConnected = result.status !== 'down';
      
      if (result.error) {
        service.errorCount++;
      }
    }
  }

  /**
   * Check failover conditions and trigger if needed
   */
  private async checkFailoverConditions(results: HealthCheckResult[]): Promise<void> {
    for (const result of results) {
      const failureCount = this.failureCounters.get(result.name) || 0;
      
      if (result.status === 'down') {
        this.failureCounters.set(result.name, failureCount + 1);
        
        // Check if consecutive failure threshold is reached
        if (failureCount + 1 >= this.config.failoverThresholds.consecutiveFailures) {
          await this.triggerFailover(result.name, 'consecutive_failures');
        }
      } else {
        // Reset failure counter on successful check
        this.failureCounters.set(result.name, 0);
      }
    }
  }

  /**
   * Trigger failover action
   */
  private async triggerFailover(serviceName: string, reason: string): Promise<void> {
    console.log(`🔄 Triggering failover for ${serviceName} due to: ${reason}`);
    
    // Send critical alert
    await this.notificationService.sendCriticalAlert(
      'Service Failover Triggered',
      `Failover activated for ${serviceName} due to ${reason}`,
      undefined,
      false
    );
    
    // Execute failover action based on service type
    const failoverAction = this.getFailoverAction(serviceName);
    await this.executeFailoverAction(failoverAction);
    
    this.emit('failover_triggered', {
      serviceName,
      reason,
      action: failoverAction,
      timestamp: new Date()
    });
  }

  /**
   * Get appropriate failover action for service
   */
  private getFailoverAction(serviceName: string): FailoverAction {
    switch (serviceName.toLowerCase()) {
      case 'nebius':
      case 'nebius_ai':
        return {
          type: 'switch_endpoint',
          target: 'nebius_backup',
          config: { backupUrl: 'https://backup-nebius-api.example.com' }
        };
      
      case 'gate':
      case 'gate_exchange':
        return {
          type: 'enable_backup',
          target: 'gate_backup',
          config: { backupExchange: 'binance_testnet' }
        };
      
      default:
        return {
          type: 'alert_only',
          target: serviceName
        };
    }
  }

  /**
   * Execute failover action
   */
  private async executeFailoverAction(action: FailoverAction): Promise<void> {
    switch (action.type) {
      case 'restart_service':
        console.log(`🔄 Restarting service: ${action.target}`);
        // In real implementation, restart the service
        break;
      
      case 'switch_endpoint':
        console.log(`🔄 Switching to backup endpoint: ${action.config?.backupUrl}`);
        // In real implementation, update service configuration
        break;
      
      case 'enable_backup':
        console.log(`🔄 Enabling backup system: ${action.config?.backupExchange}`);
        // In real implementation, activate backup service
        break;
      
      case 'alert_only':
        console.log(`⚠️ Alert only for: ${action.target}`);
        break;
    }
    
    // Simulate failover delay
    await this.delay(1000);
  }

  /**
   * Update overall health status
   */
  private updateOverallHealth(): void {
    const services = Object.values(this.currentHealth.services);
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    
    // Calculate error rate
    const recentResults = this.healthHistory.slice(-20); // Last 20 checks
    const errorCount = recentResults.filter(r => r.status === 'down').length;
    this.currentHealth.errorRate = recentResults.length > 0 ? 
      (errorCount / recentResults.length) * 100 : 0;
    
    // Calculate average network latency
    const recentLatencies = recentResults
      .filter(r => r.status !== 'down')
      .map(r => r.responseTime);
    
    this.currentHealth.networkLatency = recentLatencies.length > 0 ?
      recentLatencies.reduce((sum, lat) => sum + lat, 0) / recentLatencies.length : 0;
    
    // Update uptime
    this.currentHealth.uptime = Date.now() - this.lastHealthCheck.getTime();
    this.currentHealth.lastUpdate = new Date();
  }

  /**
   * Trim history to prevent memory leaks
   */
  private trimHistory(): void {
    if (this.healthHistory.length > 1000) {
      this.healthHistory = this.healthHistory.slice(-1000);
    }
  }

  /**
   * Get current system health status
   */
  getCurrentHealth(): SystemHealthStatus {
    return { ...this.currentHealth };
  }

  /**
   * Get health history
   */
  getHealthHistory(limit?: number): HealthCheckResult[] {
    return limit ? this.healthHistory.slice(-limit) : [...this.healthHistory];
  }

  /**
   * Get resource history
   */
  getResourceHistory(limit?: number): SystemResourceMetrics[] {
    return limit ? this.resourceHistory.slice(-limit) : [...this.resourceHistory];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SystemHealthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new config if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Force health check
   */
  async forceHealthCheck(): Promise<HealthCheckResult[]> {
    return this.checkAPIHealth();
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStatistics(): {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    downChecks: number;
    averageResponseTime: number;
    uptime: number;
  } {
    const total = this.healthHistory.length;
    const healthy = this.healthHistory.filter(h => h.status === 'healthy').length;
    const degraded = this.healthHistory.filter(h => h.status === 'degraded').length;
    const down = this.healthHistory.filter(h => h.status === 'down').length;
    
    const avgResponseTime = total > 0 ?
      this.healthHistory.reduce((sum, h) => sum + h.responseTime, 0) / total : 0;
    
    return {
      totalChecks: total,
      healthyChecks: healthy,
      degradedChecks: degraded,
      downChecks: down,
      averageResponseTime: avgResponseTime,
      uptime: this.currentHealth.uptime
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}