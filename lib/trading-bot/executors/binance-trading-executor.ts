import { BinanceFuturesClient, getBinanceClient } from '../../exchanges/binance-futures-client';
import { getNebiusAIService } from '../../ai/nebius-ai-service';
import { EnhancedDataCollector } from '../../market-data/enhanced-data-collector';
import { generateWhaleDetectionPrompt } from '../../ai/whale-detection-prompt';
import { 
  ENHANCED_TRADING_CONFIG, 
  EnhancedTradingConfig, 
  getDynamicLeverage, 
  getDynamicPositionSize, 
  shouldBlockTrading 
} from '../config/enhanced-trading-config';
import { EnhancedMarketData, WhaleManipulationAnalysis, EnhancedTradingDecision } from '../../market-data/enhanced-market-data';
import * as crypto from 'crypto';

export interface TradingDecision {
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE' | 'HOLD';
  confidence: number;
  reasoning: string;
  technicalIndicators: {
    rsi: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    support: number;
    resistance: number;
  };
  riskAssessment: {
    volatility: 'HIGH' | 'MEDIUM' | 'LOW';
    stopLoss: number;
    takeProfit: number;
    recommendedLeverage: number;
  };
  modelUsed: string;
  timestamp: string;
}

export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT';
  quantity: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopPrice?: string;
  closePosition?: boolean;
  reduceOnly?: boolean;
}

export interface OrderResponse {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  closePosition: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  priceProtect: boolean;
  origType: string;
  updateTime: number;
}

export interface PositionRisk {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

export class BinanceTradingExecutor {
  private binanceClient: BinanceFuturesClient;
  private nebiusAI: any;
  private enhancedDataCollector: EnhancedDataCollector;
  private isActive: boolean = false;
  private activePositions: Map<string, PositionRisk> = new Map();
  private tradingConfig = ENHANCED_TRADING_CONFIG;

  constructor() {
    this.binanceClient = getBinanceClient();
    this.nebiusAI = getNebiusAIService();
    this.enhancedDataCollector = new EnhancedDataCollector();
  }

  /**
   * Create signature for Binance API requests
   */
  private createSignature(queryString: string): string {
    const apiSecret = process.env.BINANCE_API_SECRET || '652d9989ae15cfab4325042450a2899de9e389661216a54af7180d553b81900f';
    return crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Make authenticated request to Binance Futures API
   */
  private async makeAuthenticatedRequest(
    endpoint: string, 
    params: Record<string, any> = {}, 
    method: 'GET' | 'POST' | 'DELETE' = 'GET'
  ): Promise<any> {
    const baseUrl = 'https://testnet.binancefuture.com';
    const apiKey = process.env.BINANCE_API_KEY || '76fb2a378ee0ca45e304830483f5a775865e1c98f1832c6ab01d3417c9db52d5';
    
    const timestamp = Date.now();
    const queryParams = new URLSearchParams({
      ...params,
      timestamp: timestamp.toString()
    });

    const queryString = queryParams.toString();
    const signature = this.createSignature(queryString);
    const finalUrl = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const response = await fetch(finalUrl, {
      method,
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Start automated trading based on Nebius AI decisions
   */
  async startAutomatedTrading(): Promise<void> {
    if (this.isActive) {
      console.log('🤖 Automated trading is already active');
      return;
    }

    try {
      console.log('🚀 Starting Nebius AI automated trading...');
      
      // Test connections
      const binanceConnected = await this.binanceClient.testConnection();
      const nebiusConnected = await this.nebiusAI.testConnection();
      
      if (!binanceConnected) {
        throw new Error('Failed to connect to Binance Futures Testnet');
      }
      
      if (!nebiusConnected) {
        throw new Error('Failed to connect to Nebius AI');
      }

      this.isActive = true;
      
      // Start monitoring and trading loop
      this.startTradingLoop();
      
      console.log('✅ Automated trading started successfully');
      console.log(`📊 Configuration: Max positions: ${this.tradingConfig.maxPositions}, Risk per trade: ${this.tradingConfig.riskPerTrade * 100}%`);
      
    } catch (error) {
      console.error('❌ Failed to start automated trading:', error);
      throw error;
    }
  }

  /**
   * Stop automated trading
   */
  async stopAutomatedTrading(): Promise<void> {
    console.log('🛑 Stopping automated trading...');
    this.isActive = false;
    console.log('✅ Automated trading stopped');
  }

  /**
   * Main trading loop - analyzes market and executes trades
   */
  private async startTradingLoop(): Promise<void> {
    const tradingPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT'];
    
    const executeTrading = async () => {
      if (!this.isActive) return;
      
      try {
        console.log('🔍 Analyzing market with Nebius AI...');
        
        // Update active positions
        await this.updateActivePositions();
        
        // Get Enhanced AI analysis with whale detection for all trading pairs
        const whaleAnalyses = await this.getEnhancedAITradingDecisions(tradingPairs);
        
        // Process each whale-aware trading decision
        for (const whaleAnalysis of whaleAnalyses) {
          await this.processEnhancedTradingDecision(whaleAnalysis);
        }
        
        // Check existing positions for take profit/stop loss
        await this.manageExistingPositions();
        
      } catch (error) {
        console.error('❌ Error in trading loop:', error);
      }
    };

    // Execute immediately
    await executeTrading();
    
    // Set up interval for continuous trading (every 30 seconds)
    const tradingInterval = setInterval(executeTrading, 30000);
    
    // Clean up interval when trading stops
    const checkActive = () => {
      if (!this.isActive) {
        clearInterval(tradingInterval);
      } else {
        setTimeout(checkActive, 1000);
      }
    };
    checkActive();
  }

  /**
   * Get Enhanced AI trading decisions with Whale Detection
   */
  private async getEnhancedAITradingDecisions(symbols: string[]): Promise<EnhancedTradingDecision[]> {
    const decisions: EnhancedTradingDecision[] = [];
    
    for (const symbol of symbols) {
      try {
        console.log(`🐋 Collecting enhanced market data for ${symbol}...`);
        
        // Collect comprehensive market data
        const enhancedMarketData = await this.enhancedDataCollector.collectEnhancedMarketData(symbol);
        
        // Generate whale detection prompt
        const whalePrompt = generateWhaleDetectionPrompt(enhancedMarketData);
        
        // Get AI analysis with whale detection
        console.log(`🤖 Analyzing ${symbol} with Nebius AI whale detection...`);
        const aiResponse = await this.nebiusAI.analyzeWithPrompt(whalePrompt);
        
        if (aiResponse) {
          // Parse AI response (should be JSON)
          let whaleAnalysis: EnhancedTradingDecision;
          
          try {
            whaleAnalysis = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
          } catch (parseError) {
            console.error(`❌ Failed to parse AI response for ${symbol}:`, parseError);
            continue;
          }

          // Add market data to analysis for validation
          (whaleAnalysis as any).marketData = enhancedMarketData;
          
          // Validate and enhance AI analysis with default values if missing
          if (!whaleAnalysis.whaleManipulation) {
            whaleAnalysis.whaleManipulation = {
              setupScore: 0,
              triggerScore: 0,
              executionScore: 0,
              currentPhase: 'NONE',
              reasoning: 'Default whale detection analysis',
              risk: 'LOW'
            };
          }

          console.log(`🎯 ${whaleAnalysis.symbol} Whale Analysis: Setup=${whaleAnalysis.whaleManipulation.setupScore}%, Trigger=${whaleAnalysis.whaleManipulation.triggerScore}%, Execution=${whaleAnalysis.whaleManipulation.executionScore}%`);
          console.log(`📊 ${whaleAnalysis.symbol} Phase: ${whaleAnalysis.whaleManipulation.currentPhase}, Risk: ${whaleAnalysis.whaleManipulation.risk}`);
          
          decisions.push(whaleAnalysis);
        }
        
      } catch (error) {
        console.error(`❌ Error getting AI decision for ${symbol}:`, error);
      }
    }
    
    return decisions;
  }

  /**
   * Process Enhanced Trading Decision with Whale Protection
   */
  private async processEnhancedTradingDecision(decision: EnhancedTradingDecision): Promise<void> {
    try {
      const symbol = decision.symbol;
      
      console.log(`🐋 Processing enhanced decision for ${decision.symbol}: ${decision.action} (${(decision.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`🚨 Whale Risk: ${decision.whaleManipulation.risk} | Phase: ${decision.whaleManipulation.currentPhase}`);

      // ===== STEP 1: WHALE MANIPULATION CHECKS =====
      
      // Check if trading should be blocked
      const blockCheck = shouldBlockTrading(
        decision.whaleManipulation.setupScore,
        decision.whaleManipulation.triggerScore,
        decision.whaleManipulation.executionScore,
        0, // fundingRate - would need to get from market data
        1, // longShortRatio - would need to get from market data
        0  // liquidationAmount - would need to get from market data
      );
      
      if (blockCheck.shouldBlock) {
        console.log(`🚫 TRADING BLOCKED for ${symbol}: ${blockCheck.reason}`);
        
        if (blockCheck.forceClose) {
          console.log(`🚨 FORCE CLOSING ALL POSITIONS: ${blockCheck.reason}`);
          await this.closeAllPositions(`Whale execution detected: ${blockCheck.reason}`);
        }
        return;
      }

      // ===== STEP 2: ENHANCED ENTRY FILTERS =====
      
      // Basic entry validation (simplified)
      if (decision.confidence < ENHANCED_TRADING_CONFIG.minConfidence) {
        console.log(`⚠️ Entry filter failed for ${symbol}: Low confidence (${(decision.confidence * 100).toFixed(1)}%)`);
        return;
      }

      // Check confidence threshold
      if (decision.confidence < this.tradingConfig.minConfidence) {
        console.log(`⚠️ Skipping ${symbol}: Confidence ${(decision.confidence * 100).toFixed(1)}% below threshold ${(this.tradingConfig.minConfidence * 100)}%`);
        return;
      }

      // ===== STEP 3: POSITION MANAGEMENT =====
      
      const existingPosition = this.activePositions.get(symbol);
      
      if (decision.action === 'BUY' && !existingPosition) {
        await this.openEnhancedLongPosition(decision);
      } else if (decision.action === 'SELL' && !existingPosition) {
        await this.openEnhancedShortPosition(decision);
      } else if (decision.action === 'CLOSE_ALL') {
        await this.closeAllPositions(`AI recommended close all: ${decision.reasoning}`);
      } else if (decision.action === 'HOLD') {
        console.log(`📊 Holding position for ${symbol}: ${decision.reasoning}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing enhanced decision for ${decision.symbol}:`, error);
    }
  }

  /**
   * Process individual trading decision (Legacy method for compatibility)
   */
  private async processTradingDecision(decision: TradingDecision): Promise<void> {
    try {
      console.log(`🎯 Processing decision for ${decision.symbol}: ${decision.action} (${(decision.confidence * 100).toFixed(1)}% confidence)`);
      
      // Check if confidence meets minimum threshold
      if (decision.confidence < this.tradingConfig.minConfidence) {
        console.log(`⚠️ Skipping ${decision.symbol}: Confidence ${(decision.confidence * 100).toFixed(1)}% below threshold ${(this.tradingConfig.minConfidence * 100)}%`);
        return;
      }
      
      // Check if we already have a position for this symbol
      const existingPosition = this.activePositions.get(decision.symbol);
      
      if (decision.action === 'BUY' && !existingPosition) {
        await this.openLongPosition(decision);
      } else if (decision.action === 'SELL' && !existingPosition) {
        await this.openShortPosition(decision);
      } else if (decision.action === 'CLOSE' && existingPosition) {
        await this.closePosition(decision.symbol);
      } else if (decision.action === 'HOLD') {
        console.log(`📊 Holding position for ${decision.symbol}: ${decision.reasoning}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing decision for ${decision.symbol}:`, error);
    }
  }

  /**
   * Open Enhanced Long Position with Whale Protection
   */
  private async openEnhancedLongPosition(decision: EnhancedTradingDecision): Promise<void> {
    try {
      const symbol = decision.symbol;
      
      // Check if we can open more positions
      if (this.activePositions.size >= this.tradingConfig.maxPositions) {
        console.log(`⚠️ Maximum positions (${this.tradingConfig.maxPositions}) reached, skipping ${symbol}`);
        return;
      }
      
      // Get account balance
      const balance = await this.binanceClient.getFormattedBalance();
      const availableBalance = balance.availableBalance;
      
      // Calculate dynamic position size based on whale risk
      const dynamicPositionSize = getDynamicPositionSize(
        decision.riskAssessment.volatility,
        decision.whaleManipulation.currentPhase,
        availableBalance
      );
      
      // Calculate dynamic leverage based on whale risk
      const dynamicLeverage = Math.min(
        getDynamicLeverage(decision.whaleManipulation.currentPhase),
        decision.recommendedLeverage || 2,
        this.tradingConfig.maxLeverage
      );
      
      // Get current price
      const ticker = await this.binanceClient.getTickerPrice(symbol);
      const currentPrice = parseFloat(ticker[0].price);
      
      // Calculate quantity with dynamic sizing
      const notionalValue = dynamicPositionSize * dynamicLeverage;
      const quantity = (notionalValue / currentPrice).toFixed(3);
      
      console.log(`📈 Opening ENHANCED LONG position for ${symbol}:`);
      console.log(`   Price: ${currentPrice}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   Dynamic Leverage: ${dynamicLeverage}x (Whale Risk: ${decision.whaleManipulation.risk})`);
      console.log(`   Dynamic Position Size: ${dynamicPositionSize.toFixed(2)} (Phase: ${decision.whaleManipulation.currentPhase})`);
      console.log(`   Whale Scores: Setup=${decision.whaleManipulation.setupScore}%, Trigger=${decision.whaleManipulation.triggerScore}%`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      
      // Set leverage
      await this.setLeverage(symbol, dynamicLeverage);
      
      // Place market buy order
      const order = await this.placeOrder({
        symbol: symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity: quantity
      });
      
      console.log(`✅ ENHANCED LONG position opened for ${symbol}:`, {
        orderId: order.orderId,
        executedQty: order.executedQty,
        avgPrice: order.avgPrice,
        whaleRisk: decision.whaleManipulation.risk,
        leverage: dynamicLeverage
      });
      
      // Set enhanced stop loss and take profit
      await this.setEnhancedStopLossAndTakeProfit(decision, parseFloat(order.avgPrice), 'LONG');
      
    } catch (error) {
      console.error(`❌ Error opening enhanced LONG position for ${decision.symbol}:`, error);
    }
  }

  /**
   * Open Enhanced Short Position with Whale Protection
   */
  private async openEnhancedShortPosition(decision: EnhancedTradingDecision): Promise<void> {
    try {
      const symbol = decision.symbol;
      
      // Check if we can open more positions
      if (this.activePositions.size >= this.tradingConfig.maxPositions) {
        console.log(`⚠️ Maximum positions (${this.tradingConfig.maxPositions}) reached, skipping ${symbol}`);
        return;
      }
      
      // Get account balance
      const balance = await this.binanceClient.getFormattedBalance();
      const availableBalance = balance.availableBalance;
      
      // Calculate dynamic position size and leverage
      const dynamicPositionSize = getDynamicPositionSize(
        decision.riskAssessment.volatility,
        decision.whaleManipulation.currentPhase,
        availableBalance
      );
      const dynamicLeverage = Math.min(
        getDynamicLeverage(decision.whaleManipulation.currentPhase),
        decision.recommendedLeverage || 2,
        this.tradingConfig.maxLeverage
      );
      
      // Get current price
      const ticker = await this.binanceClient.getTickerPrice(symbol);
      const currentPrice = parseFloat(ticker[0].price);
      
      // Calculate quantity
      const notionalValue = dynamicPositionSize * dynamicLeverage;
      const quantity = (notionalValue / currentPrice).toFixed(3);
      
      console.log(`📉 Opening ENHANCED SHORT position for ${symbol}:`);
      console.log(`   Price: ${currentPrice}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   Dynamic Leverage: ${dynamicLeverage}x (Whale Risk: ${decision.whaleManipulation.risk})`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      
      // Set leverage
      await this.setLeverage(symbol, dynamicLeverage);
      
      // Place market sell order
      const order = await this.placeOrder({
        symbol: symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: quantity
      });
      
      console.log(`✅ ENHANCED SHORT position opened for ${symbol}:`, {
        orderId: order.orderId,
        executedQty: order.executedQty,
        avgPrice: order.avgPrice,
        whaleRisk: decision.whaleManipulation.risk
      });
      
      // Set enhanced stop loss and take profit
      await this.setEnhancedStopLossAndTakeProfit(decision, parseFloat(order.avgPrice), 'SHORT');
      
    } catch (error) {
      console.error(`❌ Error opening enhanced SHORT position for ${decision.symbol}:`, error);
    }
  }

  /**
   * Open long position (BUY) - Legacy method
   */
  private async openLongPosition(decision: TradingDecision): Promise<void> {
    try {
      // Check if we can open more positions
      if (this.activePositions.size >= this.tradingConfig.maxPositions) {
        console.log(`⚠️ Maximum positions (${this.tradingConfig.maxPositions}) reached, skipping ${decision.symbol}`);
        return;
      }
      
      // Get account balance
      const balance = await this.binanceClient.getFormattedBalance();
      const availableBalance = balance.availableBalance;
      
      // Calculate position size based on risk management
      const riskAmount = availableBalance * this.tradingConfig.riskPerTrade;
      const leverage = Math.min(decision.riskAssessment.recommendedLeverage, this.tradingConfig.maxLeverage);
      
      // Get current price
      const ticker = await this.binanceClient.getTickerPrice(decision.symbol);
      const currentPrice = parseFloat(ticker[0].price);
      
      // Calculate quantity
      const notionalValue = riskAmount * leverage;
      const quantity = (notionalValue / currentPrice).toFixed(3);
      
      console.log(`📈 Opening LONG position for ${decision.symbol}:`);
      console.log(`   Price: $${currentPrice}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   Leverage: ${leverage}x`);
      console.log(`   Risk Amount: $${riskAmount.toFixed(2)}`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      
      // Set leverage
      await this.setLeverage(decision.symbol, leverage);
      
      // Place market buy order
      const order = await this.placeOrder({
        symbol: decision.symbol,
        side: 'BUY',
        type: 'MARKET',
        quantity: quantity
      });
      
      console.log(`✅ LONG position opened for ${decision.symbol}:`, {
        orderId: order.orderId,
        executedQty: order.executedQty,
        avgPrice: order.avgPrice
      });
      
      // Set stop loss and take profit
      await this.setStopLossAndTakeProfit(decision, parseFloat(order.avgPrice), 'LONG');
      
    } catch (error) {
      console.error(`❌ Error opening LONG position for ${decision.symbol}:`, error);
    }
  }

  /**
   * Open short position (SELL)
   */
  private async openShortPosition(decision: TradingDecision): Promise<void> {
    try {
      // Check if we can open more positions
      if (this.activePositions.size >= this.tradingConfig.maxPositions) {
        console.log(`⚠️ Maximum positions (${this.tradingConfig.maxPositions}) reached, skipping ${decision.symbol}`);
        return;
      }
      
      // Get account balance
      const balance = await this.binanceClient.getFormattedBalance();
      const availableBalance = balance.availableBalance;
      
      // Calculate position size based on risk management
      const riskAmount = availableBalance * this.tradingConfig.riskPerTrade;
      const leverage = Math.min(decision.riskAssessment.recommendedLeverage, this.tradingConfig.maxLeverage);
      
      // Get current price
      const ticker = await this.binanceClient.getTickerPrice(decision.symbol);
      const currentPrice = parseFloat(ticker[0].price);
      
      // Calculate quantity
      const notionalValue = riskAmount * leverage;
      const quantity = (notionalValue / currentPrice).toFixed(3);
      
      console.log(`📉 Opening SHORT position for ${decision.symbol}:`);
      console.log(`   Price: $${currentPrice}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   Leverage: ${leverage}x`);
      console.log(`   Risk Amount: $${riskAmount.toFixed(2)}`);
      console.log(`   Reasoning: ${decision.reasoning}`);
      
      // Set leverage
      await this.setLeverage(decision.symbol, leverage);
      
      // Place market sell order
      const order = await this.placeOrder({
        symbol: decision.symbol,
        side: 'SELL',
        type: 'MARKET',
        quantity: quantity
      });
      
      console.log(`✅ SHORT position opened for ${decision.symbol}:`, {
        orderId: order.orderId,
        executedQty: order.executedQty,
        avgPrice: order.avgPrice
      });
      
      // Set stop loss and take profit
      await this.setStopLossAndTakeProfit(decision, parseFloat(order.avgPrice), 'SHORT');
      
    } catch (error) {
      console.error(`❌ Error opening SHORT position for ${decision.symbol}:`, error);
    }
  }

  /**
   * Close position
   */
  private async closePosition(symbol: string): Promise<void> {
    try {
      const position = this.activePositions.get(symbol);
      if (!position) {
        console.log(`⚠️ No active position found for ${symbol}`);
        return;
      }
      
      const positionAmt = parseFloat(position.positionAmt);
      const side = positionAmt > 0 ? 'SELL' : 'BUY';
      const quantity = Math.abs(positionAmt).toFixed(3);
      
      console.log(`🔄 Closing position for ${symbol}: ${side} ${quantity}`);
      
      // Place market order to close position
      const order = await this.placeOrder({
        symbol: symbol,
        side: side,
        type: 'MARKET',
        quantity: quantity,
        reduceOnly: true
      });
      
      console.log(`✅ Position closed for ${symbol}:`, {
        orderId: order.orderId,
        executedQty: order.executedQty,
        avgPrice: order.avgPrice,
        pnl: position.unRealizedProfit
      });
      
      // Remove from active positions
      this.activePositions.delete(symbol);
      
    } catch (error) {
      console.error(`❌ Error closing position for ${symbol}:`, error);
    }
  }

  /**
   * Set leverage for symbol
   */
  private async setLeverage(symbol: string, leverage: number): Promise<void> {
    try {
      await this.makeAuthenticatedRequest('/fapi/v1/leverage', {
        symbol: symbol,
        leverage: leverage
      }, 'POST');
      
      console.log(`⚙️ Leverage set to ${leverage}x for ${symbol}`);
    } catch (error) {
      console.error(`❌ Error setting leverage for ${symbol}:`, error);
    }
  }

  /**
   * Place order on Binance Futures
   */
  private async placeOrder(orderRequest: OrderRequest): Promise<OrderResponse> {
    const params: any = {
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.type,
      quantity: orderRequest.quantity
    };
    
    if (orderRequest.price) params.price = orderRequest.price;
    if (orderRequest.timeInForce) params.timeInForce = orderRequest.timeInForce;
    if (orderRequest.stopPrice) params.stopPrice = orderRequest.stopPrice;
    if (orderRequest.closePosition) params.closePosition = orderRequest.closePosition;
    if (orderRequest.reduceOnly) params.reduceOnly = orderRequest.reduceOnly;
    
    return await this.makeAuthenticatedRequest('/fapi/v1/order', params, 'POST');
  }

  /**
   * Set Enhanced Stop Loss and Take Profit with Multi-level TP
   */
  private async setEnhancedStopLossAndTakeProfit(
    decision: EnhancedTradingDecision, 
    entryPrice: number, 
    side: 'LONG' | 'SHORT'
  ): Promise<void> {
    try {
      const symbol = decision.symbol;
      
      // Calculate enhanced stop loss based on whale risk
      let stopLossPrice: number;
      if (side === 'LONG') {
        // For longs, stop loss below entry
        const stopLossPercent = this.calculateDynamicStopLoss(decision);
        stopLossPrice = entryPrice * (1 - stopLossPercent);
      } else {
        // For shorts, stop loss above entry
        const stopLossPercent = this.calculateDynamicStopLoss(decision);
        stopLossPrice = entryPrice * (1 + stopLossPercent);
      }

      // Use AI-recommended stop loss if available and more conservative
      if (decision.stopLoss) {
        if (side === 'LONG' && decision.stopLoss > stopLossPrice) {
          stopLossPrice = decision.stopLoss;
        } else if (side === 'SHORT' && decision.stopLoss < stopLossPrice) {
          stopLossPrice = decision.stopLoss;
        }
      }

      console.log(`🛡️ Setting enhanced stop loss for ${symbol} at ${stopLossPrice.toFixed(2)} (${side})`);

      // Set stop loss order
      await this.placeOrder({
        symbol: symbol,
        side: side === 'LONG' ? 'SELL' : 'BUY',
        type: 'MARKET',
        quantity: '0', // Will be filled by exchange
        stopPrice: stopLossPrice.toFixed(2),
        reduceOnly: true
      });

      // Set multi-level take profit orders
      await this.setMultiLevelTakeProfit(decision, entryPrice, side);

    } catch (error) {
      console.error(`❌ Error setting enhanced SL/TP for ${decision.symbol}:`, error);
    }
  }

  /**
   * Set Multi-level Take Profit Orders
   */
  private async setMultiLevelTakeProfit(
    decision: EnhancedTradingDecision,
    entryPrice: number,
    side: 'LONG' | 'SHORT'
  ): Promise<void> {
    try {
      const symbol = decision.symbol;
      const tpLevels = this.tradingConfig.exitStrategy.takeProfitLevels;

      // Use AI-recommended take profit levels if available
      const aiTakeProfits = decision.takeProfit || [];
      
      for (let i = 0; i < Math.min(tpLevels.length, 3); i++) {
        let tpPrice: number;
        
        if (aiTakeProfits[i]) {
          tpPrice = aiTakeProfits[i];
        } else {
          // Calculate TP based on config
          const tpPercent = tpLevels[i].percent;
          if (side === 'LONG') {
            tpPrice = entryPrice * (1 + tpPercent);
          } else {
            tpPrice = entryPrice * (1 - tpPercent);
          }
        }

        const closePercent = tpLevels[i].closePercent;
        
        console.log(`🎯 Setting TP${i + 1} for ${symbol} at ${tpPrice.toFixed(2)} (close ${(closePercent * 100).toFixed(0)}%)`);

        // Note: In real implementation, you'd calculate the exact quantity based on closePercent
        // For now, we'll set a simple take profit order
        await this.placeOrder({
          symbol: symbol,
          side: side === 'LONG' ? 'SELL' : 'BUY',
          type: 'LIMIT',
          quantity: '0', // Should be calculated based on position size and closePercent
          price: tpPrice.toFixed(2),
          timeInForce: 'GTC',
          reduceOnly: true
        });
      }

    } catch (error) {
      console.error(`❌ Error setting multi-level TP for ${decision.symbol}:`, error);
    }
  }

  /**
   * Calculate Dynamic Stop Loss based on Whale Risk
   */
  private calculateDynamicStopLoss(decision: EnhancedTradingDecision): number {
    const baseStopLoss = this.tradingConfig.stopLossPercent;
    const whaleRisk = decision.whaleManipulation.risk;
    
    // Increase stop loss distance during high whale manipulation risk
    switch (whaleRisk) {
      case 'CRITICAL':
        return baseStopLoss * 2.0; // 10% stop loss
      case 'HIGH':
        return baseStopLoss * 1.5; // 7.5% stop loss
      case 'MEDIUM':
        return baseStopLoss * 1.2; // 6% stop loss
      default:
        return baseStopLoss; // 5% stop loss
    }
  }

  /**
   * Close All Positions (Enhanced with reason logging)
   */
  private async closeAllPositions(reason: string): Promise<void> {
    try {
      console.log(`🚨 CLOSING ALL POSITIONS: ${reason}`);
      
      // Update active positions first
      await this.updateActivePositions();
      
      if (this.activePositions.size === 0) {
        console.log('📊 No active positions to close');
        return;
      }

      for (const symbol of Array.from(this.activePositions.keys())) {
        const position = this.activePositions.get(symbol)!;
        try {
          const positionAmt = parseFloat(position.positionAmt);
          const side = positionAmt > 0 ? 'SELL' : 'BUY'; // Opposite side to close
          const quantity = Math.abs(positionAmt).toFixed(3);

          console.log(`🔄 Closing position ${symbol}: ${quantity} (${side})`);

          await this.placeOrder({
            symbol: symbol,
            side: side,
            type: 'MARKET',
            quantity: quantity,
            reduceOnly: true
          });

          console.log(`✅ Position closed for ${symbol}`);

        } catch (error) {
          console.error(`❌ Error closing position for ${symbol}:`, error);
        }
      }

      // Clear active positions map
      this.activePositions.clear();
      
      console.log(`✅ All positions closed due to: ${reason}`);

    } catch (error) {
      console.error('❌ Error closing all positions:', error);
    }
  }

  /**
   * Set stop loss and take profit orders (Legacy method)
   */
  private async setStopLossAndTakeProfit(decision: TradingDecision, entryPrice: number, side: 'LONG' | 'SHORT'): Promise<void> {
    try {
      const stopLossPrice = side === 'LONG' 
        ? entryPrice * (1 - this.tradingConfig.stopLossPercent)
        : entryPrice * (1 + this.tradingConfig.stopLossPercent);
        
      const takeProfitPrice = side === 'LONG'
        ? entryPrice * (1 + this.tradingConfig.takeProfitPercent)
        : entryPrice * (1 - this.tradingConfig.takeProfitPercent);
      
      // Use AI's risk assessment if available
      const finalStopLoss = decision.riskAssessment.stopLoss || stopLossPrice;
      const finalTakeProfit = decision.riskAssessment.takeProfit || takeProfitPrice;
      
      console.log(`🛡️ Setting stop loss at $${finalStopLoss.toFixed(2)} and take profit at $${finalTakeProfit.toFixed(2)} for ${decision.symbol}`);
      
      // Note: In a real implementation, you would set OCO orders or use stop-limit orders
      // For this demo, we'll monitor positions manually in manageExistingPositions()
      
    } catch (error) {
      console.error(`❌ Error setting stop loss/take profit for ${decision.symbol}:`, error);
    }
  }

  /**
   * Update active positions from Binance
   */
  private async updateActivePositions(): Promise<void> {
    try {
      const positions = await this.makeAuthenticatedRequest('/fapi/v2/positionRisk');
      
      // Clear current positions
      this.activePositions.clear();
      
      // Add active positions (non-zero position amount)
      for (const position of positions) {
        if (parseFloat(position.positionAmt) !== 0) {
          this.activePositions.set(position.symbol, position);
        }
      }
      
      console.log(`📊 Active positions updated: ${this.activePositions.size} positions`);
      
    } catch (error) {
      console.error('❌ Error updating active positions:', error);
    }
  }

  /**
   * Manage existing positions (check for take profit/stop loss)
   */
  private async manageExistingPositions(): Promise<void> {
    for (const symbol of Array.from(this.activePositions.keys())) {
      const position = this.activePositions.get(symbol)!;
      try {
        const entryPrice = parseFloat(position.entryPrice);
        const markPrice = parseFloat(position.markPrice);
        const positionAmt = parseFloat(position.positionAmt);
        const unrealizedPnl = parseFloat(position.unRealizedProfit);
        const notional = parseFloat(position.notional);
        
        const pnlPercent = Math.abs(notional) > 0 ? (unrealizedPnl / Math.abs(notional)) * 100 : 0;
        const side = positionAmt > 0 ? 'LONG' : 'SHORT';
        
        console.log(`📊 Managing ${symbol} ${side}: Entry $${entryPrice.toFixed(2)}, Mark $${markPrice.toFixed(2)}, PnL: ${pnlPercent.toFixed(2)}%`);
        
        // Check for take profit (10% profit)
        if (pnlPercent >= this.tradingConfig.takeProfitPercent * 100) {
          console.log(`🎯 Take profit triggered for ${symbol} at ${pnlPercent.toFixed(2)}% profit`);
          await this.closePosition(symbol);
          continue;
        }
        
        // Check for stop loss (5% loss)
        if (pnlPercent <= -this.tradingConfig.stopLossPercent * 100) {
          console.log(`🛑 Stop loss triggered for ${symbol} at ${pnlPercent.toFixed(2)}% loss`);
          await this.closePosition(symbol);
          continue;
        }
        
        // Get fresh AI analysis for position management
        const ticker24hr = await this.binanceClient.get24hrTicker(symbol);
        const marketData = {
          symbol,
          price: markPrice,
          change24h: parseFloat(ticker24hr[0].priceChangePercent),
          volume24h: parseFloat(ticker24hr[0].volume),
          timestamp: new Date().toISOString()
        };
        
        const aiAnalysis = await this.nebiusAI.analyzeCryptocurrency(symbol, {
          price: markPrice,
          change24h: parseFloat(ticker24hr[0].priceChangePercent),
          volume24h: parseFloat(ticker24hr[0].volume),
          high24h: parseFloat(ticker24hr[0].highPrice),
          low24h: parseFloat(ticker24hr[0].lowPrice)
        });
        
        // If AI suggests opposite action with high confidence, consider closing
        if (aiAnalysis && aiAnalysis.confidence > 0.8) {
          const shouldClose = (
            (side === 'LONG' && aiAnalysis.action.toUpperCase() === 'SELL') ||
            (side === 'SHORT' && aiAnalysis.action.toUpperCase() === 'BUY')
          );
          
          if (shouldClose) {
            console.log(`🤖 AI suggests closing ${symbol} ${side} position: ${aiAnalysis.reasoning}`);
            await this.closePosition(symbol);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error managing position for ${symbol}:`, error);
      }
    }
  }

  /**
   * Get current trading status
   */
  getTradingStatus(): {
    isActive: boolean;
    activePositions: number;
    config: EnhancedTradingConfig;
  } {
    return {
      isActive: this.isActive,
      activePositions: this.activePositions.size,
      config: this.tradingConfig
    };
  }

  /**
   * Update trading configuration
   */
  updateConfig(newConfig: Partial<EnhancedTradingConfig>): void {
    this.tradingConfig = { ...this.tradingConfig, ...newConfig };
    console.log('⚙️ Trading configuration updated:', this.tradingConfig);
  }

  /**
   * Get active positions summary
   */
  getActivePositionsSummary(): Array<{
    symbol: string;
    side: string;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    pnlPercent: number;
  }> {
    const summary = [];
    
    for (const symbol of Array.from(this.activePositions.keys())) {
      const position = this.activePositions.get(symbol)!;
      const positionAmt = parseFloat(position.positionAmt);
      const entryPrice = parseFloat(position.entryPrice);
      const markPrice = parseFloat(position.markPrice);
      const unrealizedPnl = parseFloat(position.unRealizedProfit);
      const notional = parseFloat(position.notional);
      
      summary.push({
        symbol,
        side: positionAmt > 0 ? 'LONG' : 'SHORT',
        size: Math.abs(positionAmt),
        entryPrice,
        markPrice,
        pnl: unrealizedPnl,
        pnlPercent: Math.abs(notional) > 0 ? (unrealizedPnl / Math.abs(notional)) * 100 : 0
      });
    }
    
    return summary;
  }



  /**
   * Enhanced position monitoring with whale awareness
   */
  private async monitorPositionsWithWhaleAwareness(): Promise<void> {
    try {
      await this.updateActivePositions();
      
      for (const symbol of Array.from(this.activePositions.keys())) {
        const position = this.activePositions.get(symbol)!;
        // Get fresh whale analysis for position monitoring
        try {
          const enhancedData = await this.enhancedDataCollector.collectEnhancedMarketData(symbol);
          // Simple whale detection scores (placeholder)
          const scores = {
            setupScore: 0,
            triggerScore: 0,
            executionScore: 0
          };
          
          // Check if we should emergency exit due to whale activity
          if (scores.executionScore > 80) {
            console.log(`🚨 EMERGENCY EXIT for ${symbol}: Whale execution detected (${scores.executionScore}%)`);
            await this.closePosition(symbol);
          }
          
        } catch (error) {
          console.error(`❌ Error monitoring whale activity for ${symbol}:`, error);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error in enhanced position monitoring:`, error);
    }
  }
}

// Singleton instance
let tradingExecutor: BinanceTradingExecutor | null = null;

export function getBinanceTradingExecutor(): BinanceTradingExecutor {
  if (!tradingExecutor) {
    tradingExecutor = new BinanceTradingExecutor();
  }
  return tradingExecutor;
}