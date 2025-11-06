// Advanced Alerting System - Multi-channel alert delivery with prioritization and escalation

import { EventEmitter } from 'events';
import { NotificationService } from './notification-service';
import { 
  AlertMessage, 
  AlertSeverity, 
  RealTimeUpdate 
} from './types';

export interface AlertChannel {
  type: 'email' | 'sms' | 'webhook' | 'push' | 'slack' | 'discord';
  enabled: boolean;
  config: Record<string, any>;
  priority: number; // 1-10, higher = more priority
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  channels: string[]; // Channel IDs
  enabled: boolean;
  cooldownMinutes: number;
  escalationRules?: EscalationRule[];
}

export interface AlertCondition {
  type: 'threshold' | 'pattern' | 'custom';
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number | string;
  timeWindow?: number; // minutes
  customFunction?: (data: any) => boolean;
}

export interface EscalationRule {
  delayMinutes: number;
  channels: string[];
  severity: AlertSeverity;
  message?: string;
}

export interface AlertDeliveryConfig {
  channels: Map<string, AlertChannel>;
  rules: Map<string, AlertRule>;
  globalSettings: {
    enableEscalation: boolean;
    maxRetries: number;
    retryDelaySeconds: number;
    enableRateLimiting: boolean;
    rateLimitPerMinute: number;
  };
}

export interface AlertDeliveryResult {
  alertId: string;
  channelId: string;
  channelType: string;
  success: boolean;
  timestamp: Date;
  error?: string;
  retryCount: number;
}

export interface PendingEscalation {
  alertId: string;
  ruleId: string;
  escalationLevel: number;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
}

export class AdvancedAlertingSystem extends EventEmitter {
  private notificationService: NotificationService;
  private config: AlertDeliveryConfig;
  private deliveryHistory: AlertDeliveryResult[] = [];
  private pendingEscalations: Map<string, PendingEscalation> = new Map();
  private rateLimitTracker: Map<string, number[]> = new Map();
  private lastAlertTimes: Map<string, Date> = new Map();

  constructor(
    notificationService: NotificationService,
    config: AlertDeliveryConfig
  ) {
    super();
    this.notificationService = notificationService;
    this.config = config;
    this.setupNotificationListeners();
  }

  /**
   * Setup listeners for notification service events
   */
  private setupNotificationListeners(): void {
    this.notificationService.on('tradingNotification', (alert: AlertMessage) => {
      this.processAlert(alert, 'trading');
    });

    this.notificationService.on('systemNotification', (alert: AlertMessage) => {
      this.processAlert(alert, 'system');
    });

    this.notificationService.on('criticalAlert', (alert: AlertMessage) => {
      this.processAlert(alert, 'critical');
    });

    this.notificationService.on('safeModeActivated', (alert: AlertMessage) => {
      this.processAlert(alert, 'emergency');
    });
  }

  /**
   * Process incoming alert and determine delivery channels
   */
  private async processAlert(alert: AlertMessage, category: string): Promise<void> {
    try {
      // Find matching rules for this alert
      const matchingRules = this.findMatchingRules(alert, category);
      
      if (matchingRules.length === 0) {
        // Use default channels based on severity
        await this.deliverToDefaultChannels(alert);
        return;
      }

      // Process each matching rule
      for (const rule of matchingRules) {
        await this.processAlertRule(alert, rule);
      }

    } catch (error) {
      console.error('Error processing alert:', error);
      this.emit('alert_processing_error', { alert, error });
    }
  }

  /**
   * Find rules that match the alert
   */
  private findMatchingRules(alert: AlertMessage, category: string): AlertRule[] {
    const matchingRules: AlertRule[] = [];

    for (const rule of Array.from(this.config.rules.values())) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(rule.id)) continue;

      // Check if rule condition matches
      if (this.evaluateRuleCondition(rule.condition, alert, category)) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  /**
   * Evaluate if a rule condition matches the alert
   */
  private evaluateRuleCondition(
    condition: AlertCondition, 
    alert: AlertMessage, 
    category: string
  ): boolean {
    switch (condition.type) {
      case 'threshold':
        return this.evaluateThresholdCondition(condition, alert);
      
      case 'pattern':
        return this.evaluatePatternCondition(condition, alert, category);
      
      case 'custom':
        return condition.customFunction ? condition.customFunction(alert) : false;
      
      default:
        return false;
    }
  }

  /**
   * Evaluate threshold-based condition
   */
  private evaluateThresholdCondition(condition: AlertCondition, alert: AlertMessage): boolean {
    if (!alert.data || typeof alert.data[condition.metric] === 'undefined') {
      return false;
    }

    const value = alert.data[condition.metric];
    const threshold = condition.value;

    switch (condition.operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '=': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Evaluate pattern-based condition
   */
  private evaluatePatternCondition(
    condition: AlertCondition, 
    alert: AlertMessage, 
    category: string
  ): boolean {
    // Check severity pattern
    if (condition.metric === 'severity') {
      return alert.severity === condition.value;
    }

    // Check category pattern
    if (condition.metric === 'category') {
      return category === condition.value;
    }

    // Check message pattern
    if (condition.metric === 'message') {
      return alert.message.includes(condition.value as string);
    }

    return false;
  }

  /**
   * Process alert according to rule
   */
  private async processAlertRule(alert: AlertMessage, rule: AlertRule): Promise<void> {
    // Update cooldown
    this.lastAlertTimes.set(rule.id, new Date());

    // Deliver to rule channels
    await this.deliverToChannels(alert, rule.channels);

    // Setup escalation if configured
    if (rule.escalationRules && rule.escalationRules.length > 0) {
      this.setupEscalation(alert, rule);
    }
  }

  /**
   * Deliver alert to default channels based on severity
   */
  private async deliverToDefaultChannels(alert: AlertMessage): Promise<void> {
    const defaultChannels: string[] = [];

    // Select channels based on severity
    switch (alert.severity) {
      case 'critical':
        defaultChannels.push('email', 'sms', 'webhook');
        break;
      case 'error':
        defaultChannels.push('email', 'webhook');
        break;
      case 'warning':
        defaultChannels.push('webhook');
        break;
      case 'info':
        defaultChannels.push('webhook');
        break;
    }

    await this.deliverToChannels(alert, defaultChannels);
  }

  /**
   * Deliver alert to specified channels
   */
  private async deliverToChannels(alert: AlertMessage, channelIds: string[]): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    for (const channelId of channelIds) {
      const channel = this.config.channels.get(channelId);
      if (channel && channel.enabled) {
        // Check rate limiting
        if (this.isRateLimited(channelId)) {
          console.warn(`Channel ${channelId} is rate limited, skipping delivery`);
          continue;
        }

        deliveryPromises.push(this.deliverToChannel(alert, channel, channelId));
      }
    }

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver alert to a specific channel
   */
  private async deliverToChannel(
    alert: AlertMessage, 
    channel: AlertChannel, 
    channelId: string
  ): Promise<void> {
    let retryCount = 0;
    const maxRetries = this.config.globalSettings.maxRetries;

    while (retryCount <= maxRetries) {
      try {
        const success = await this.executeChannelDelivery(alert, channel);
        
        const result: AlertDeliveryResult = {
          alertId: alert.id,
          channelId,
          channelType: channel.type,
          success,
          timestamp: new Date(),
          retryCount
        };

        this.deliveryHistory.push(result);
        this.updateRateLimit(channelId);

        if (success) {
          this.emit('alert_delivered', result);
          return;
        } else {
          throw new Error('Delivery failed');
        }

      } catch (error) {
        retryCount++;
        
        const result: AlertDeliveryResult = {
          alertId: alert.id,
          channelId,
          channelType: channel.type,
          success: false,
          timestamp: new Date(),
          error: (error as Error).message,
          retryCount
        };

        this.deliveryHistory.push(result);

        if (retryCount <= maxRetries) {
          // Wait before retry
          await this.delay(this.config.globalSettings.retryDelaySeconds * 1000);
        } else {
          this.emit('alert_delivery_failed', result);
          break;
        }
      }
    }
  }

  /**
   * Execute delivery to specific channel type
   */
  private async executeChannelDelivery(alert: AlertMessage, channel: AlertChannel): Promise<boolean> {
    switch (channel.type) {
      case 'email':
        return this.deliverEmail(alert, channel.config);
      
      case 'sms':
        return this.deliverSMS(alert, channel.config);
      
      case 'webhook':
        return this.deliverWebhook(alert, channel.config);
      
      case 'push':
        return this.deliverPushNotification(alert, channel.config);
      
      case 'slack':
        return this.deliverSlack(alert, channel.config);
      
      case 'discord':
        return this.deliverDiscord(alert, channel.config);
      
      default:
        console.warn(`Unknown channel type: ${channel.type}`);
        return false;
    }
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(alert: AlertMessage, config: any): Promise<boolean> {
    // Mock email delivery - in real implementation, use nodemailer or similar
    console.log(`📧 EMAIL: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`   To: ${config.to}`);
    console.log(`   Message: ${alert.message}`);
    
    // Simulate network delay
    await this.delay(100);
    
    return true;
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMS(alert: AlertMessage, config: any): Promise<boolean> {
    // Mock SMS delivery - in real implementation, use Twilio or similar
    console.log(`📱 SMS: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`   To: ${config.phoneNumber}`);
    console.log(`   Message: ${alert.message.substring(0, 160)}`);
    
    // Simulate network delay
    await this.delay(200);
    
    return true;
  }

  /**
   * Deliver webhook notification
   */
  private async deliverWebhook(alert: AlertMessage, config: any): Promise<boolean> {
    try {
      // Mock webhook delivery - in real implementation, use fetch or axios
      console.log(`🔗 WEBHOOK: ${config.url}`);
      console.log(`   Payload:`, {
        alert_id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.timestamp,
        data: alert.data
      });
      
      // Simulate network delay
      await this.delay(150);
      
      return true;
    } catch (error) {
      console.error('Webhook delivery failed:', error);
      return false;
    }
  }

  /**
   * Deliver push notification
   */
  private async deliverPushNotification(alert: AlertMessage, config: any): Promise<boolean> {
    // Mock push notification - in real implementation, use FCM or similar
    console.log(`🔔 PUSH: [${alert.severity.toUpperCase()}] ${alert.title}`);
    console.log(`   Device: ${config.deviceToken}`);
    console.log(`   Message: ${alert.message}`);
    
    await this.delay(100);
    return true;
  }

  /**
   * Deliver Slack notification
   */
  private async deliverSlack(alert: AlertMessage, config: any): Promise<boolean> {
    // Mock Slack delivery - in real implementation, use Slack Web API
    const emoji = this.getSeverityEmoji(alert.severity);
    console.log(`💬 SLACK: ${config.channel}`);
    console.log(`   ${emoji} *${alert.title}*`);
    console.log(`   ${alert.message}`);
    
    await this.delay(120);
    return true;
  }

  /**
   * Deliver Discord notification
   */
  private async deliverDiscord(alert: AlertMessage, config: any): Promise<boolean> {
    // Mock Discord delivery - in real implementation, use Discord webhook
    console.log(`🎮 DISCORD: ${config.webhookUrl}`);
    console.log(`   **${alert.title}**`);
    console.log(`   ${alert.message}`);
    
    await this.delay(130);
    return true;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  /**
   * Setup escalation for alert
   */
  private setupEscalation(alert: AlertMessage, rule: AlertRule): void {
    if (!rule.escalationRules || !this.config.globalSettings.enableEscalation) {
      return;
    }

    for (let i = 0; i < rule.escalationRules.length; i++) {
      const escalationRule = rule.escalationRules[i];
      const escalationId = `${alert.id}_${rule.id}_${i}`;
      
      const timeoutId = setTimeout(() => {
        this.executeEscalation(alert, rule, escalationRule, i);
        this.pendingEscalations.delete(escalationId);
      }, escalationRule.delayMinutes * 60 * 1000);

      const pendingEscalation: PendingEscalation = {
        alertId: alert.id,
        ruleId: rule.id,
        escalationLevel: i,
        scheduledTime: new Date(Date.now() + escalationRule.delayMinutes * 60 * 1000),
        timeoutId
      };

      this.pendingEscalations.set(escalationId, pendingEscalation);
    }
  }

  /**
   * Execute escalation
   */
  private async executeEscalation(
    originalAlert: AlertMessage,
    rule: AlertRule,
    escalationRule: EscalationRule,
    level: number
  ): Promise<void> {
    const escalatedAlert: AlertMessage = {
      ...originalAlert,
      id: `${originalAlert.id}_escalated_${level}`,
      severity: escalationRule.severity,
      title: `ESCALATED: ${originalAlert.title}`,
      message: escalationRule.message || `Alert escalated (Level ${level + 1}): ${originalAlert.message}`,
      timestamp: new Date(),
      data: {
        ...originalAlert.data,
        escalation: {
          level: level + 1,
          originalAlertId: originalAlert.id,
          ruleId: rule.id
        }
      }
    };

    await this.deliverToChannels(escalatedAlert, escalationRule.channels);
    this.emit('alert_escalated', { originalAlert, escalatedAlert, level });
  }

  /**
   * Check if rule is in cooldown period
   */
  private isInCooldown(ruleId: string): boolean {
    const lastAlertTime = this.lastAlertTimes.get(ruleId);
    if (!lastAlertTime) return false;

    const rule = this.config.rules.get(ruleId);
    if (!rule) return false;

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    return Date.now() - lastAlertTime.getTime() < cooldownMs;
  }

  /**
   * Check if channel is rate limited
   */
  private isRateLimited(channelId: string): boolean {
    if (!this.config.globalSettings.enableRateLimiting) {
      return false;
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    let timestamps = this.rateLimitTracker.get(channelId) || [];
    timestamps = timestamps.filter(ts => ts > oneMinuteAgo);
    
    this.rateLimitTracker.set(channelId, timestamps);
    
    return timestamps.length >= this.config.globalSettings.rateLimitPerMinute;
  }

  /**
   * Update rate limit tracker
   */
  private updateRateLimit(channelId: string): void {
    const timestamps = this.rateLimitTracker.get(channelId) || [];
    timestamps.push(Date.now());
    this.rateLimitTracker.set(channelId, timestamps);
  }

  /**
   * Cancel pending escalations for alert
   */
  cancelEscalations(alertId: string): void {
    for (const escalationId of Array.from(this.pendingEscalations.keys())) {
      const escalation = this.pendingEscalations.get(escalationId)!;
      if (escalation.alertId === alertId) {
        clearTimeout(escalation.timeoutId);
        this.pendingEscalations.delete(escalationId);
      }
    }
  }

  /**
   * Add or update alert channel
   */
  addChannel(channelId: string, channel: AlertChannel): void {
    this.config.channels.set(channelId, channel);
    this.emit('channel_added', { channelId, channel });
  }

  /**
   * Add or update alert rule
   */
  addRule(rule: AlertRule): void {
    this.config.rules.set(rule.id, rule);
    this.emit('rule_added', rule);
  }

  /**
   * Remove alert channel
   */
  removeChannel(channelId: string): boolean {
    const removed = this.config.channels.delete(channelId);
    if (removed) {
      this.emit('channel_removed', channelId);
    }
    return removed;
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): boolean {
    const removed = this.config.rules.delete(ruleId);
    if (removed) {
      this.emit('rule_removed', ruleId);
    }
    return removed;
  }

  /**
   * Get delivery statistics
   */
  getDeliveryStatistics(): {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    deliveriesByChannel: Record<string, number>;
    averageRetries: number;
  } {
    const total = this.deliveryHistory.length;
    const successful = this.deliveryHistory.filter(d => d.success).length;
    const failed = total - successful;
    
    const byChannel: Record<string, number> = {};
    let totalRetries = 0;
    
    for (const delivery of this.deliveryHistory) {
      byChannel[delivery.channelType] = (byChannel[delivery.channelType] || 0) + 1;
      totalRetries += delivery.retryCount;
    }
    
    return {
      totalDeliveries: total,
      successfulDeliveries: successful,
      failedDeliveries: failed,
      deliveriesByChannel: byChannel,
      averageRetries: total > 0 ? totalRetries / total : 0
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}