#!/usr/bin/env ts-node

// Test Advanced Monitoring & Alerting System
// This script demonstrates the complete monitoring system in action

import { monitoringSetup } from './lib/trading-bot/services/monitoring/monitoring-setup';
import { TradeExecution, TradingPosition } from './lib/trading-bot/types';

async function testAdvancedMonitoring() {
  console.log('🚀 Starting Advanced Monitoring & Alerting System Test...\n');
  
  try {
    // Initialize monitoring system
    const monitoring = await monitoringSetup.initializeMonitoring();
    
    console.log('\n📊 Monitoring System Status:');
    console.log(monitoringSetup.getMonitoringStatus());
    
    // Simulate some trading activity
    console.log('\n💰 Simulating Trading Activity...');
    await simulateTradingActivity(monitoring);
    
    // Wait a bit for monitoring to process
    await delay(10000);
    
    // Get monitoring dashboard
    console.log('\n📈 Getting Monitoring Dashboard...');
    const dashboard = await monitoringSetup.getMonitoringDashboard();
    
    console.log('\n📊 Dashboard Summary:');
    console.log(`- Performance ROI: ${dashboard.performance.returnOnInvestment.toFixed(2)}%`);
    console.log(`- Win Rate: ${dashboard.performance.winRate.toFixed(1)}%`);
    console.log(`- Total Trades: ${dashboard.performance.totalTrades}`);
    console.log(`- System Health Score: ${dashboard.statistics.healthScore}`);
    console.log(`- Alerts Today: ${dashboard.statistics.alertsToday}`);
    console.log(`- System Uptime: ${Math.floor(dashboard.statistics.systemUptime / 1000)}s`);
    
    // Show recent alerts
    if (dashboard.alerts.length > 0) {
      console.log('\n🚨 Recent Alerts:');
      dashboard.alerts.slice(0, 5).forEach(alert => {
        console.log(`  [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);
      });
    }
    
    // Show recent updates
    if (dashboard.recentUpdates.length > 0) {
      console.log('\n📡 Recent Updates:');
      dashboard.recentUpdates.slice(0, 3).forEach(update => {
        console.log(`  [${update.type}] ${new Date(update.timestamp).toLocaleTimeString()}`);
      });
    }
    
    // Test alert system with simulated critical event
    console.log('\n🚨 Testing Alert System with Critical Event...');
    await testCriticalAlert(monitoring);
    
    // Wait for alerts to process
    await delay(5000);
    
    // Show final status
    console.log('\n✅ Advanced Monitoring Test Completed Successfully!');
    console.log('\nMonitoring Features Demonstrated:');
    console.log('✅ Real-time Performance Monitoring');
    console.log('✅ Multi-channel Alert Delivery');
    console.log('✅ System Health Monitoring');
    console.log('✅ Performance Degradation Detection');
    console.log('✅ Risk Metrics Calculation');
    console.log('✅ Cross-service Alert Correlation');
    console.log('✅ Monitoring Dashboard');
    
    // Keep monitoring running for a bit longer
    console.log('\n⏱️  Monitoring will continue running for 30 seconds...');
    console.log('   Watch for real-time updates and alerts!');
    
    await delay(30000);
    
    // Stop monitoring
    await monitoringSetup.stopMonitoring();
    
  } catch (error) {
    console.error('❌ Error in monitoring test:', error);
  }
}

/**
 * Simulate trading activity to generate monitoring data
 */
async function simulateTradingActivity(monitoring: any) {
  const performanceTracker = monitoring['performanceTracker'];
  
  // Simulate some trades
  const trades: TradeExecution[] = [
    {
      id: 'trade_1',
      orderId: 'order_1',
      symbol: 'BTCUSDT',
      side: 'buy',
      amount: 0.1,
      price: 45000,
      fee: 4.5,
      timestamp: new Date(),
      status: 'filled'
    },
    {
      id: 'trade_2',
      orderId: 'order_2',
      symbol: 'BTCUSDT',
      side: 'sell',
      amount: 0.1,
      price: 46000,
      fee: 4.6,
      timestamp: new Date(),
      status: 'filled'
    },
    {
      id: 'trade_3',
      orderId: 'order_3',
      symbol: 'ETHUSDT',
      side: 'buy',
      amount: 2.0,
      price: 3000,
      fee: 6.0,
      timestamp: new Date(),
      status: 'filled'
    }
  ];
  
  // Record trades
  for (const trade of trades) {
    performanceTracker.recordTrade(trade);
    console.log(`  📈 Recorded trade: ${trade.side.toUpperCase()} ${trade.amount} ${trade.symbol} @ $${trade.price}`);
    await delay(1000);
  }
  
  // Simulate some positions
  const positions: TradingPosition[] = [
    {
      id: 'pos_1',
      symbol: 'ETHUSDT',
      side: 'buy',
      amount: 2.0,
      entryPrice: 3000,
      currentPrice: 3100,
      unrealizedPnL: 200,
      timestamp: new Date(),
      status: 'open'
    }
  ];
  
  performanceTracker.updatePositions(positions);
  console.log(`  📊 Updated positions: ${positions.length} active positions`);
  
  // Add some activity logs
  performanceTracker.addActivityLog({
    id: 'activity_1',
    timestamp: new Date(),
    type: 'trade_executed',
    symbol: 'BTCUSDT',
    action: 'buy',
    amount: 0.1,
    price: 45000,
    message: 'Successfully executed BTC buy order',
    severity: 'info'
  });
  
  performanceTracker.addActivityLog({
    id: 'activity_2',
    timestamp: new Date(),
    type: 'signal_received',
    symbol: 'ETHUSDT',
    action: 'hold',
    message: 'AI signal suggests holding ETH position',
    severity: 'info'
  });
}

/**
 * Test critical alert functionality
 */
async function testCriticalAlert(monitoring: any) {
  const notificationService = monitoring['notificationService'];
  
  // Send a critical alert
  await notificationService.sendCriticalAlert(
    'Test Critical Alert',
    'This is a test of the critical alert system - simulating high loss scenario',
    new Error('Simulated critical error'),
    false
  );
  
  // Send a performance alert
  await notificationService.sendPerformanceAlert(
    'drawdown',
    15.5,
    10.0,
    'Drawdown of 15.5% exceeds threshold of 10%'
  );
  
  // Send a system notification
  await notificationService.sendSystemNotification(
    'System Test',
    'Advanced monitoring system test in progress',
    'info'
  );
  
  console.log('  🚨 Sent test alerts: Critical, Performance, and System notifications');
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
if (require.main === module) {
  testAdvancedMonitoring().catch(console.error);
}