import { BinanceFuturesClient } from '@/lib/exchanges/binance-futures-client';
import { NebiusAIService } from '@/lib/ai/nebius-ai-service';

export interface TimeframeData {
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  ohlcv: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  technicalIndicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    ema20: number;
    ema50: number;
    ema200: number;
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
    support: number;
    resistance: number;
  };
  trend: {
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    strength: number; // 0-100
    confidence: number; // 0-1
  };
  signals: {
    entry: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
  };
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timestamp: string;
  timeframes: {
    '1m': TimeframeData;
    '5m': TimeframeData;
    '15m': TimeframeData;
    '1h': TimeframeData;
    '4h': TimeframeData;
    '1d': TimeframeData;
  };
  correlation: {
    shortTerm: number; // 1m-15m correlation
    mediumTerm: number; // 15m-4h correlation
    longTerm: number; // 4h-1d correlation
    overall: number; // Overall timeframe alignment
  };
  consensus: {
    signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: number;
    reasoning: string;
    timeframeAlignment: number; // Percentage of timeframes agreeing
  };
  riskAssessment: {
    volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    trendStability: number; // 0-1
    reversalProbability: number; // 0-1
    recommendedPositionSize: number; // 0-1 (percentage of capital)
  };
}

export class MultiTimeframeAnalyzer {
  private binanceClient: BinanceFuturesClient;
  private nebiusAI: NebiusAIService;
  
  constructor(binanceClient: BinanceFuturesClient, nebiusAI: NebiusAIService) {
    this.binanceClient = binanceClient;
    this.nebiusAI = nebiusAI;
  }

  /**
   * Perform comprehensive multi-timeframe analysis
   */
  async analyzeMultiTimeframe(symbol: string): Promise<MultiTimeframeAnalysis> {
    console.log(`🔍 Starting multi-timeframe analysis for ${symbol}...`);
    
    const timeframes: Array<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'> = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const timeframeData: Partial<MultiTimeframeAnalysis['timeframes']> = {};
    
    // Collect data for each timeframe
    for (const timeframe of timeframes) {
      try {
        console.log(`📊 Analyzing ${timeframe} timeframe...`);
        timeframeData[timeframe] = await this.analyzeTimeframe(symbol, timeframe);
      } catch (error) {
        console.error(`❌ Error analyzing ${timeframe} for ${symbol}:`, error);
        // Use fallback data
        timeframeData[timeframe] = this.getFallbackTimeframeData(timeframe);
      }
    }
    
    // Calculate correlations
    const correlation = this.calculateTimeframeCorrelations(timeframeData as MultiTimeframeAnalysis['timeframes']);
    
    // Generate consensus signal
    const consensus = this.generateConsensusSignal(timeframeData as MultiTimeframeAnalysis['timeframes']);
    
    // Assess risk
    const riskAssessment = this.assessMultiTimeframeRisk(timeframeData as MultiTimeframeAnalysis['timeframes'], correlation);
    
    const analysis: MultiTimeframeAnalysis = {
      symbol,
      timestamp: new Date().toISOString(),
      timeframes: timeframeData as MultiTimeframeAnalysis['timeframes'],
      correlation,
      consensus,
      riskAssessment
    };
    
    console.log(`✅ Multi-timeframe analysis completed for ${symbol}`);\n    console.log(`📊 Consensus: ${consensus.signal} (${(consensus.confidence * 100).toFixed(1)}% confidence)`);\n    console.log(`⚖️ Timeframe alignment: ${(consensus.timeframeAlignment * 100).toFixed(1)}%`);\n    \n    return analysis;\n  }\n\n  /**\n   * Analyze individual timeframe\n   */\n  private async analyzeTimeframe(symbol: string, timeframe: string): Promise<TimeframeData> {\n    // Get OHLCV data\n    const klines = await this.binanceClient.getKlines(symbol, timeframe, 200);\n    \n    const ohlcv = klines.map(kline => ({\n      timestamp: kline[0],\n      open: parseFloat(kline[1]),\n      high: parseFloat(kline[2]),\n      low: parseFloat(kline[3]),\n      close: parseFloat(kline[4]),\n      volume: parseFloat(kline[5])\n    }));\n    \n    // Calculate technical indicators\n    const technicalIndicators = this.calculateTechnicalIndicators(ohlcv);\n    \n    // Determine trend\n    const trend = this.analyzeTrend(ohlcv, technicalIndicators);\n    \n    // Generate signals using AI\n    const signals = await this.generateTimeframeSignals(symbol, timeframe, ohlcv, technicalIndicators, trend);\n    \n    return {\n      timeframe: timeframe as TimeframeData['timeframe'],\n      ohlcv,\n      technicalIndicators,\n      trend,\n      signals\n    };\n  }\n\n  /**\n   * Calculate technical indicators for timeframe\n   */\n  private calculateTechnicalIndicators(ohlcv: TimeframeData['ohlcv']): TimeframeData['technicalIndicators'] {\n    const closes = ohlcv.map(candle => candle.close);\n    const highs = ohlcv.map(candle => candle.high);\n    const lows = ohlcv.map(candle => candle.low);\n    \n    // RSI calculation\n    const rsi = this.calculateRSI(closes, 14);\n    \n    // MACD calculation\n    const macd = this.calculateMACD(closes);\n    \n    // EMA calculations\n    const ema20 = this.calculateEMA(closes, 20);\n    const ema50 = this.calculateEMA(closes, 50);\n    const ema200 = this.calculateEMA(closes, 200);\n    \n    // Bollinger Bands\n    const bollinger = this.calculateBollingerBands(closes, 20, 2);\n    \n    // Support and Resistance\n    const { support, resistance } = this.calculateSupportResistance(highs, lows, closes);\n    \n    return {\n      rsi,\n      macd,\n      ema20,\n      ema50,\n      ema200,\n      bollinger,\n      support,\n      resistance\n    };\n  }\n\n  /**\n   * Analyze trend for timeframe\n   */\n  private analyzeTrend(ohlcv: TimeframeData['ohlcv'], indicators: TimeframeData['technicalIndicators']): TimeframeData['trend'] {\n    const closes = ohlcv.map(c => c.close);\n    const currentPrice = closes[closes.length - 1];\n    \n    // EMA trend analysis\n    const emaScore = this.calculateEMATrendScore(currentPrice, indicators);\n    \n    // Price action trend\n    const priceActionScore = this.calculatePriceActionTrendScore(closes);\n    \n    // Volume trend\n    const volumeScore = this.calculateVolumeTrendScore(ohlcv);\n    \n    // Combined trend score\n    const trendScore = (emaScore + priceActionScore + volumeScore) / 3;\n    \n    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';\n    if (trendScore > 0.6) {\n      direction = 'BULLISH';\n    } else if (trendScore < 0.4) {\n      direction = 'BEARISH';\n    } else {\n      direction = 'NEUTRAL';\n    }\n    \n    const strength = Math.abs(trendScore - 0.5) * 200; // 0-100\n    const confidence = Math.min(strength / 100, 1); // 0-1\n    \n    return {\n      direction,\n      strength,\n      confidence\n    };\n  }\n\n  /**\n   * Generate AI-powered signals for timeframe\n   */\n  private async generateTimeframeSignals(\n    symbol: string, \n    timeframe: string, \n    ohlcv: TimeframeData['ohlcv'], \n    indicators: TimeframeData['technicalIndicators'], \n    trend: TimeframeData['trend']\n  ): Promise<TimeframeData['signals']> {\n    \n    const prompt = `Analyze ${symbol} on ${timeframe} timeframe:\n\nCurrent Price: ${ohlcv[ohlcv.length - 1].close}\nRSI: ${indicators.rsi.toFixed(2)}\nMACD: ${indicators.macd.macd.toFixed(4)} (Signal: ${indicators.macd.signal.toFixed(4)})\nEMA20: ${indicators.ema20.toFixed(2)}\nEMA50: ${indicators.ema50.toFixed(2)}\nTrend: ${trend.direction} (Strength: ${trend.strength.toFixed(1)}%)\nSupport: ${indicators.support.toFixed(2)}\nResistance: ${indicators.resistance.toFixed(2)}\n\nBased on this ${timeframe} analysis, provide a trading signal with confidence and reasoning. Consider:\n1. Technical indicator alignment\n2. Trend strength and direction\n3. Support/resistance levels\n4. Risk/reward ratio\n\nRespond with JSON: {\"entry\": \"BUY|SELL|HOLD\", \"confidence\": 0.0-1.0, \"reasoning\": \"detailed explanation\"}`;\n\n    try {\n      const aiResponse = await this.nebiusAI.analyzeWithPrompt(prompt);\n      const parsed = JSON.parse(aiResponse);\n      \n      return {\n        entry: parsed.entry || 'HOLD',\n        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),\n        reasoning: parsed.reasoning || `${timeframe} analysis suggests ${parsed.entry || 'HOLD'}`\n      };\n    } catch (error) {\n      console.error(`❌ Error generating AI signals for ${timeframe}:`, error);\n      \n      // Fallback to technical analysis\n      return this.generateTechnicalSignals(indicators, trend);\n    }\n  }\n\n  /**\n   * Generate fallback technical signals\n   */\n  private generateTechnicalSignals(indicators: TimeframeData['technicalIndicators'], trend: TimeframeData['trend']): TimeframeData['signals'] {\n    let entry: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';\n    let confidence = 0.5;\n    let reasoning = 'Technical analysis: ';\n    \n    const signals = [];\n    \n    // RSI signals\n    if (indicators.rsi < 30) {\n      signals.push('RSI oversold');\n      entry = 'BUY';\n    } else if (indicators.rsi > 70) {\n      signals.push('RSI overbought');\n      entry = 'SELL';\n    }\n    \n    // MACD signals\n    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {\n      signals.push('MACD bullish crossover');\n      if (entry !== 'SELL') entry = 'BUY';\n    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {\n      signals.push('MACD bearish crossover');\n      if (entry !== 'BUY') entry = 'SELL';\n    }\n    \n    // Trend alignment\n    if (trend.direction === 'BULLISH' && trend.confidence > 0.7) {\n      signals.push('Strong bullish trend');\n      if (entry !== 'SELL') entry = 'BUY';\n      confidence += 0.2;\n    } else if (trend.direction === 'BEARISH' && trend.confidence > 0.7) {\n      signals.push('Strong bearish trend');\n      if (entry !== 'BUY') entry = 'SELL';\n      confidence += 0.2;\n    }\n    \n    reasoning += signals.join(', ') || 'No clear signals';\n    confidence = Math.max(0.3, Math.min(0.9, confidence));\n    \n    return { entry, confidence, reasoning };\n  }\n\n  /**\n   * Calculate timeframe correlations\n   */\n  private calculateTimeframeCorrelations(timeframes: MultiTimeframeAnalysis['timeframes']): MultiTimeframeAnalysis['correlation'] {\n    const signals = Object.values(timeframes).map(tf => {\n      switch (tf.signals.entry) {\n        case 'BUY': return 1;\n        case 'SELL': return -1;\n        default: return 0;\n      }\n    });\n    \n    // Short-term correlation (1m, 5m, 15m)\n    const shortTerm = this.calculateCorrelation(signals.slice(0, 3));\n    \n    // Medium-term correlation (15m, 1h, 4h)\n    const mediumTerm = this.calculateCorrelation(signals.slice(2, 5));\n    \n    // Long-term correlation (4h, 1d)\n    const longTerm = this.calculateCorrelation(signals.slice(4, 6));\n    \n    // Overall correlation\n    const overall = this.calculateCorrelation(signals);\n    \n    return {\n      shortTerm,\n      mediumTerm,\n      longTerm,\n      overall\n    };\n  }\n\n  /**\n   * Generate consensus signal from all timeframes\n   */\n  private generateConsensusSignal(timeframes: MultiTimeframeAnalysis['timeframes']): MultiTimeframeAnalysis['consensus'] {\n    const timeframeArray = Object.entries(timeframes);\n    const weights = {\n      '1m': 0.1,\n      '5m': 0.15,\n      '15m': 0.2,\n      '1h': 0.25,\n      '4h': 0.2,\n      '1d': 0.1\n    };\n    \n    let buyScore = 0;\n    let sellScore = 0;\n    let totalWeight = 0;\n    let agreementCount = 0;\n    \n    const signals = [];\n    \n    for (const [tf, data] of timeframeArray) {\n      const weight = weights[tf as keyof typeof weights];\n      const confidence = data.signals.confidence;\n      \n      if (data.signals.entry === 'BUY') {\n        buyScore += weight * confidence;\n        signals.push('BUY');\n      } else if (data.signals.entry === 'SELL') {\n        sellScore += weight * confidence;\n        signals.push('SELL');\n      } else {\n        signals.push('HOLD');\n      }\n      \n      totalWeight += weight;\n    }\n    \n    // Calculate agreement\n    const mostCommonSignal = this.getMostCommonSignal(signals);\n    agreementCount = signals.filter(s => s === mostCommonSignal).length;\n    const timeframeAlignment = agreementCount / signals.length;\n    \n    // Determine consensus signal\n    let signal: MultiTimeframeAnalysis['consensus']['signal'];\n    let confidence: number;\n    \n    const netScore = buyScore - sellScore;\n    const absScore = Math.abs(netScore);\n    \n    if (netScore > 0.3) {\n      signal = absScore > 0.6 ? 'STRONG_BUY' : 'BUY';\n    } else if (netScore < -0.3) {\n      signal = absScore > 0.6 ? 'STRONG_SELL' : 'SELL';\n    } else {\n      signal = 'HOLD';\n    }\n    \n    confidence = Math.min(0.95, absScore * timeframeAlignment);\n    \n    const reasoning = `Multi-timeframe analysis: ${agreementCount}/${signals.length} timeframes agree. ` +\n      `Buy score: ${buyScore.toFixed(2)}, Sell score: ${sellScore.toFixed(2)}. ` +\n      `Timeframe alignment: ${(timeframeAlignment * 100).toFixed(1)}%`;\n    \n    return {\n      signal,\n      confidence,\n      reasoning,\n      timeframeAlignment\n    };\n  }\n\n  /**\n   * Assess multi-timeframe risk\n   */\n  private assessMultiTimeframeRisk(\n    timeframes: MultiTimeframeAnalysis['timeframes'], \n    correlation: MultiTimeframeAnalysis['correlation']\n  ): MultiTimeframeAnalysis['riskAssessment'] {\n    \n    // Calculate volatility from 1m data\n    const oneMinData = timeframes['1m'].ohlcv;\n    const returns = [];\n    for (let i = 1; i < oneMinData.length; i++) {\n      returns.push((oneMinData[i].close - oneMinData[i-1].close) / oneMinData[i-1].close);\n    }\n    \n    const volatilityStd = this.calculateStandardDeviation(returns);\n    let volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';\n    \n    if (volatilityStd < 0.01) volatility = 'LOW';\n    else if (volatilityStd < 0.02) volatility = 'MEDIUM';\n    else if (volatilityStd < 0.04) volatility = 'HIGH';\n    else volatility = 'EXTREME';\n    \n    // Trend stability (higher correlation = more stable)\n    const trendStability = (correlation.overall + 1) / 2; // Convert -1,1 to 0,1\n    \n    // Reversal probability (lower when trends align)\n    const reversalProbability = Math.max(0.1, 1 - trendStability);\n    \n    // Recommended position size based on risk factors\n    let positionSizeMultiplier = 1.0;\n    \n    if (volatility === 'EXTREME') positionSizeMultiplier *= 0.3;\n    else if (volatility === 'HIGH') positionSizeMultiplier *= 0.5;\n    else if (volatility === 'MEDIUM') positionSizeMultiplier *= 0.7;\n    \n    if (trendStability < 0.5) positionSizeMultiplier *= 0.6;\n    if (reversalProbability > 0.7) positionSizeMultiplier *= 0.5;\n    \n    const recommendedPositionSize = Math.max(0.1, Math.min(1.0, positionSizeMultiplier));\n    \n    return {\n      volatility,\n      trendStability,\n      reversalProbability,\n      recommendedPositionSize\n    };\n  }\n\n  // Helper methods for calculations\n  private calculateRSI(prices: number[], period: number): number {\n    if (prices.length < period + 1) return 50;\n    \n    let gains = 0;\n    let losses = 0;\n    \n    for (let i = prices.length - period; i < prices.length; i++) {\n      const change = prices[i] - prices[i - 1];\n      if (change > 0) gains += change;\n      else losses -= change;\n    }\n    \n    const avgGain = gains / period;\n    const avgLoss = losses / period;\n    \n    if (avgLoss === 0) return 100;\n    \n    const rs = avgGain / avgLoss;\n    return 100 - (100 / (1 + rs));\n  }\n\n  private calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {\n    const ema12 = this.calculateEMA(prices, 12);\n    const ema26 = this.calculateEMA(prices, 26);\n    const macd = ema12 - ema26;\n    \n    // For simplicity, using a basic signal calculation\n    const signal = macd * 0.9; // Simplified signal line\n    const histogram = macd - signal;\n    \n    return { macd, signal, histogram };\n  }\n\n  private calculateEMA(prices: number[], period: number): number {\n    if (prices.length === 0) return 0;\n    \n    const multiplier = 2 / (period + 1);\n    let ema = prices[0];\n    \n    for (let i = 1; i < prices.length; i++) {\n      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));\n    }\n    \n    return ema;\n  }\n\n  private calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number; middle: number; lower: number } {\n    const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;\n    const variance = prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;\n    const std = Math.sqrt(variance);\n    \n    return {\n      upper: sma + (std * stdDev),\n      middle: sma,\n      lower: sma - (std * stdDev)\n    };\n  }\n\n  private calculateSupportResistance(highs: number[], lows: number[], closes: number[]): { support: number; resistance: number } {\n    const recentData = 50; // Look at last 50 candles\n    const recentHighs = highs.slice(-recentData);\n    const recentLows = lows.slice(-recentData);\n    \n    const resistance = Math.max(...recentHighs);\n    const support = Math.min(...recentLows);\n    \n    return { support, resistance };\n  }\n\n  private calculateEMATrendScore(currentPrice: number, indicators: TimeframeData['technicalIndicators']): number {\n    let score = 0.5;\n    \n    // EMA alignment\n    if (currentPrice > indicators.ema20 && indicators.ema20 > indicators.ema50 && indicators.ema50 > indicators.ema200) {\n      score = 0.9; // Strong bullish alignment\n    } else if (currentPrice < indicators.ema20 && indicators.ema20 < indicators.ema50 && indicators.ema50 < indicators.ema200) {\n      score = 0.1; // Strong bearish alignment\n    } else if (currentPrice > indicators.ema20) {\n      score = 0.7; // Above short-term EMA\n    } else if (currentPrice < indicators.ema20) {\n      score = 0.3; // Below short-term EMA\n    }\n    \n    return score;\n  }\n\n  private calculatePriceActionTrendScore(closes: number[]): number {\n    const recent = closes.slice(-20); // Last 20 candles\n    const older = closes.slice(-40, -20); // Previous 20 candles\n    \n    const recentAvg = recent.reduce((sum, price) => sum + price, 0) / recent.length;\n    const olderAvg = older.reduce((sum, price) => sum + price, 0) / older.length;\n    \n    const change = (recentAvg - olderAvg) / olderAvg;\n    \n    // Convert to 0-1 scale\n    return Math.max(0, Math.min(1, 0.5 + (change * 10)));\n  }\n\n  private calculateVolumeTrendScore(ohlcv: TimeframeData['ohlcv']): number {\n    const volumes = ohlcv.slice(-20).map(candle => candle.volume);\n    const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;\n    const recentVolume = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;\n    \n    const volumeRatio = recentVolume / avgVolume;\n    \n    // Higher volume generally supports trend continuation\n    return Math.max(0.3, Math.min(0.7, 0.5 + (volumeRatio - 1) * 0.2));\n  }\n\n  private calculateCorrelation(values: number[]): number {\n    if (values.length < 2) return 0;\n    \n    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;\n    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;\n    \n    return variance === 0 ? 1 : Math.max(-1, Math.min(1, 1 - variance));\n  }\n\n  private getMostCommonSignal(signals: string[]): string {\n    const counts: { [key: string]: number } = {};\n    \n    signals.forEach(signal => {\n      counts[signal] = (counts[signal] || 0) + 1;\n    });\n    \n    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);\n  }\n\n  private calculateStandardDeviation(values: number[]): number {\n    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;\n    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;\n    return Math.sqrt(variance);\n  }\n\n  private getFallbackTimeframeData(timeframe: string): TimeframeData {\n    return {\n      timeframe: timeframe as TimeframeData['timeframe'],\n      ohlcv: [],\n      technicalIndicators: {\n        rsi: 50,\n        macd: { macd: 0, signal: 0, histogram: 0 },\n        ema20: 0,\n        ema50: 0,\n        ema200: 0,\n        bollinger: { upper: 0, middle: 0, lower: 0 },\n        support: 0,\n        resistance: 0\n      },\n      trend: {\n        direction: 'NEUTRAL',\n        strength: 0,\n        confidence: 0\n      },\n      signals: {\n        entry: 'HOLD',\n        confidence: 0.5,\n        reasoning: 'Fallback data due to analysis error'\n      }\n    };\n  }\n}