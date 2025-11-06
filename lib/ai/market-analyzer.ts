import { getBinanceClient } from '@/lib/exchanges/binance-futures-client';
import { getNebiusAIService } from './nebius-ai-service';

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  rsi?: number;
  macd?: number;
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export interface AIAnalysisResult {
  timestamp: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  technicalIndicators: {
    rsi: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    support: number;
    resistance: number;
    sentiment?: string;
  };
  riskAssessment: {
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    recommendedLeverage: number;
    stopLoss: number;
    takeProfit: number;
  };
  modelUsed: string;
}

export class MarketAnalyzer {
  private binanceClient = getBinanceClient();
  private nebiusAI = getNebiusAIService();

  /**
   * NEW: Analyze multiple symbols with enhanced whale detection
   */
  async analyzeMultipleSymbolsEnhanced(symbols: string[]): Promise<any[]> {
    try {
      console.log(`🐋 Enhanced analysis for ${symbols.length} symbols with whale detection...`);
      
      const analyses = [];
      
      for (const symbol of symbols) {
        try {
          // This will be called by the enhanced trading executor
          // For now, we'll use the existing method as fallback
          const analysis = await this.analyzeSingleSymbol(symbol);
          analyses.push(analysis);
        } catch (error) {
          console.error(`❌ Error analyzing ${symbol}:`, error);
        }
      }
      
      return analyses;
    } catch (error) {
      console.error('❌ Error in enhanced multi-symbol analysis:', error);
      throw error;
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const [ticker24hr, currentPrice] = await Promise.all([
        this.binanceClient.get24hrTicker(symbol),
        this.binanceClient.getTickerPrice(symbol)
      ]);

      const data = ticker24hr[0];
      const price = currentPrice[0];

      return {
        symbol,
        price: parseFloat(price.price),
        change24h: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.volume),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        rsi: this.calculateRSI(parseFloat(price.price), parseFloat(data.openPrice)),
      };
    } catch (error) {
      console.error(`Error fetching market data for ${symbol}:`, error);
      throw error;
    }
  }

  private calculateRSI(currentPrice: number, openPrice: number): number {
    // Simplified RSI calculation based on price change
    const priceChange = ((currentPrice - openPrice) / openPrice) * 100;
    
    // Convert price change to RSI-like value (0-100)
    if (priceChange > 0) {
      return Math.min(50 + (priceChange * 2), 100);
    } else {
      return Math.max(50 + (priceChange * 2), 0);
    }
  }

  private calculateTechnicalIndicators(marketData: MarketData) {
    const { price, high24h, low24h, change24h, rsi } = marketData;
    
    // Calculate support and resistance levels
    const support = low24h + (high24h - low24h) * 0.236; // Fibonacci retracement
    const resistance = high24h - (high24h - low24h) * 0.236;
    
    // Determine trend
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (change24h > 2 && rsi && rsi > 60) {
      trend = 'BULLISH';
    } else if (change24h < -2 && rsi && rsi < 40) {
      trend = 'BEARISH';
    }

    return {
      rsi: rsi || 50,
      trend,
      support,
      resistance
    };
  }

  private assessRisk(marketData: MarketData) {
    const { change24h, volume24h, high24h, low24h } = marketData;
    
    // Calculate volatility based on price range
    const priceRange = ((high24h - low24h) / low24h) * 100;
    let volatility: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    
    if (priceRange < 3) volatility = 'LOW';
    else if (priceRange > 8) volatility = 'HIGH';
    
    // Market sentiment based on price change and volume
    let marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (change24h > 3 && volume24h > 1000000) {
      marketSentiment = 'BULLISH';
    } else if (change24h < -3 && volume24h > 1000000) {
      marketSentiment = 'BEARISH';
    }
    
    // Recommended leverage based on volatility
    const recommendedLeverage = volatility === 'LOW' ? 10 : volatility === 'MEDIUM' ? 5 : 2;
    
    // Stop loss and take profit calculations
    const stopLoss = volatility === 'LOW' ? 2 : volatility === 'MEDIUM' ? 3 : 5;
    const takeProfit = stopLoss * 2; // 2:1 risk-reward ratio
    
    return {
      volatility,
      marketSentiment,
      recommendedLeverage,
      stopLoss,
      takeProfit
    };
  }

  async analyzeMarket(symbol: string): Promise<AIAnalysisResult> {
    try {
      console.log(`🤖 Starting Nebius AI analysis for ${symbol}...`);
      
      // Get market data from Binance
      const marketData = await this.getMarketData(symbol);
      
      // Use Nebius AI for advanced analysis
      const nebiusAnalysis = await this.nebiusAI.analyzeCryptocurrency(symbol, {
        price: marketData.price,
        change24h: marketData.change24h,
        volume24h: marketData.volume24h,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        rsi: marketData.rsi
      });

      console.log(`✅ Nebius AI analysis completed for ${symbol}: ${nebiusAnalysis.action} (${(nebiusAnalysis.confidence * 100).toFixed(1)}%)`);

      return nebiusAnalysis;
      
    } catch (error) {
      console.error(`❌ Nebius AI analysis failed for ${symbol}, using fallback:`, error);
      
      // Fallback to basic technical analysis if Nebius AI fails
      return this.fallbackAnalysis(symbol, error as Error);
    }
  }

  private async fallbackAnalysis(symbol: string, error: Error): Promise<AIAnalysisResult> {
    try {
      // Get market data
      const marketData = await this.getMarketData(symbol);
      
      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(marketData);
      
      // Assess risk
      const riskAssessment = this.assessRisk(marketData);
      
      // Simple decision logic
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 0.4; // Lower confidence for fallback
      let reasoning = `Fallback analysis (Nebius AI unavailable): ${error.message.substring(0, 100)}`;
      
      // Basic bullish/bearish logic
      if (marketData.change24h > 2 && technicalIndicators.rsi < 70) {
        action = 'BUY';
        confidence = 0.5;
        reasoning = `Fallback: Bullish momentum detected (+${marketData.change24h.toFixed(2)}%)`;
      } else if (marketData.change24h < -2 && technicalIndicators.rsi > 30) {
        action = 'SELL';
        confidence = 0.5;
        reasoning = `Fallback: Bearish momentum detected (${marketData.change24h.toFixed(2)}%)`;
      }

      return {
        timestamp: new Date().toISOString(),
        symbol,
        action,
        confidence,
        reasoning,
        technicalIndicators,
        riskAssessment,
        modelUsed: 'Fallback-TechnicalAnalyzer'
      };
      
    } catch (fallbackError) {
      console.error(`❌ Fallback analysis also failed for ${symbol}:`, fallbackError);
      
      // Return minimal safe analysis
      return {
        timestamp: new Date().toISOString(),
        symbol,
        action: 'HOLD',
        confidence: 0.2,
        reasoning: `Both Nebius AI and fallback analysis failed: ${(fallbackError as Error).message}`,
        technicalIndicators: {
          rsi: 50,
          trend: 'NEUTRAL',
          support: 0,
          resistance: 0
        },
        riskAssessment: {
          volatility: 'HIGH',
          marketSentiment: 'NEUTRAL',
          recommendedLeverage: 1,
          stopLoss: 5,
          takeProfit: 10
        },
        modelUsed: 'Emergency-Fallback'
      };
    }
  }

  async analyzeMultipleSymbols(symbols: string[]): Promise<AIAnalysisResult[]> {
    const analyses = await Promise.allSettled(
      symbols.map(symbol => this.analyzeMarket(symbol))
    );

    return analyses
      .filter((result): result is PromiseFulfilledResult<AIAnalysisResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }
}

// Singleton instance
let marketAnalyzer: MarketAnalyzer | null = null;

export function getMarketAnalyzer(): MarketAnalyzer {
  if (!marketAnalyzer) {
    marketAnalyzer = new MarketAnalyzer();
  }
  return marketAnalyzer;
}