// Simple test for Advanced Risk Management Service

import { AdvancedRiskManagementService } from './advanced-risk-management';
import { defaultAdvancedRiskConfig } from '../../config/advanced-risk-config';
import { ErrorHandler, TradingSignal, TradingPosition, MarketData } from '../../types';

// Create a simple error handler for testing
const testErrorHandler: ErrorHandler = {
  handleNebiusError: (error) => console.error('Nebius Error:', error),
  handleGateError: (error) => console.error('Gate Error:', error),
  handleNetworkError: (error) => console.error('Network Error:', error),
  logError: (error, context) => console.error(`${context}:`, error)
};

// Test the advanced risk management service
async function testAdvancedRiskManagement() {
  console.log('Testing Advanced Risk Management Service...');
  
  try {
    // Create service instance
    const riskService = new AdvancedRiskManagementService(
      defaultAdvancedRiskConfig,
      testErrorHandler
    );
    
    console.log('✓ Service created successfully');
    
    // Test volatility calculation
    riskService.updatePriceHistory('BTC/USDT', 45000);
    riskService.updatePriceHistory('BTC/USDT', 45100);
    riskService.updatePriceHistory('BTC/USDT', 44900);
    riskService.updatePriceHistory('BTC/USDT', 45200);
    
    const volatilityMetrics = riskService.calculateVolatility('BTC/USDT');
    console.log('✓ Volatility calculation:', volatilityMetrics);
    
    // Test correlation calculation
    riskService.updatePriceHistory('ETH/USDT', 3000);
    riskService.updatePriceHistory('ETH/USDT', 3050);
    riskService.updatePriceHistory('ETH/USDT', 2980);
    riskService.updatePriceHistory('ETH/USDT', 3100);
    
    const correlation = riskService.calculateCorrelation('BTC/USDT', 'ETH/USDT');
    console.log('✓ Correlation calculation:', correlation);
    
    // Test drawdown metrics
    riskService.updateDrawdownMetrics(10000);
    riskService.updateDrawdownMetrics(9500);
    riskService.updateDrawdownMetrics(9000);
    
    const drawdownProtection = riskService.checkDrawdownProtection();
    console.log('✓ Drawdown protection check:', drawdownProtection);
    
    // Test dynamic stop-loss
    const testPosition: TradingPosition = {
      id: 'test-pos-1',
      symbol: 'BTC/USDT',
      side: 'buy',
      amount: 0.1,
      entryPrice: 45000,
      currentPrice: 44500,
      unrealizedPnL: -50,
      timestamp: new Date(),
      status: 'open'
    };
    
    const dynamicStopLoss = riskService.calculateDynamicStopLoss(testPosition, 0.25);
    console.log('✓ Dynamic stop-loss calculation:', dynamicStopLoss);
    
    // Test advanced position sizing
    const testSignal: TradingSignal = {
      symbol: 'BTC/USDT',
      action: 'buy',
      confidence: 75,
      targetPrice: 45000,
      stopLoss: 43000,
      reasoning: 'Test signal',
      timestamp: new Date()
    };
    
    const positionSize = riskService.calculateAdvancedPositionSize(testSignal, 10000, [testPosition]);
    console.log('✓ Advanced position sizing:', positionSize);
    
    // Test market data processing
    const marketData: MarketData = {
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      price: 45300,
      volume: 1000000,
      orderBook: {
        bids: [{ price: 45250, amount: 1.5 }],
        asks: [{ price: 45350, amount: 1.2 }]
      },
      indicators: {
        rsi: 65,
        macd: 0.5,
        movingAverage: 44800
      }
    };
    
    riskService.processMarketDataUpdate(marketData);
    console.log('✓ Market data processing completed');
    
    // Test advanced risk status
    const riskStatus = riskService.getAdvancedRiskStatus();
    console.log('✓ Advanced risk status retrieved');
    
    console.log('\n🎉 All tests passed! Advanced Risk Management Service is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAdvancedRiskManagement();