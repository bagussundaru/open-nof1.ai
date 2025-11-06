import { SentimentAnalyzer, MarketSentiment } from '@/lib/ai/sentiment-analyzer';
import { MultiTimeframeAnalyzer, MultiTimeframeAnalysis } from '@/lib/ai/multi-timeframe-analyzer';
import { BinanceFuturesClient } from '@/lib/exchanges/binance-futures-client';
import { NebiusAIService } from '@/lib/ai/nebius-ai-service';

export interface SentimentEnhancedSignal {
  symbol: string;
  action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' | 'CLOSE_ALL';
  confidence: number;
  reasoning: string;
  
  // Position sizing with sentiment adjustment
  basePositionSize: number; // Base size from technical analysis
  sentimentAdjustment: number; // -50% to +50% adjustment
  finalPositionSize: number; // Final adjusted size
  
  // Risk management
  leverage: number;
  stopLoss: number;
  takeProfit: number[];
  
  // Sentiment factors
  sentimentScore: number; // -1 to 1
  sentimentStrength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
  sentimentDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Analysis components
  technicalWeight: number; // 0-1 (how much technical analysis contributed)
  sentimentWeight: number; // 0-1 (how much sentiment contributed)
  
  metadata: {
    multiTimeframeAnalysis: MultiTimeframeAnalysis;
    marketSentiment: MarketSentiment;
    processingTime: number;
    timestamp: string;
  };
}

export class SentimentEnhancedStrategy {
  private sentimentAnalyzer: SentimentAnalyzer;
  private multiTimeframeAnalyzer: MultiTimeframeAnalyzer;
  private binanceClient: BinanceFuturesClient;
  private nebiusAI: NebiusAIService;
  
  // Strategy configuration
  private config = {
    // Sentiment integration settings
    sentimentWeight: 0.3, // 30% sentiment, 70% technical
    minSentimentConfidence: 0.6, // Minimum sentiment confidence to use
    maxSentimentAdjustment: 0.5, // Maximum 50% position size adjustment
    
    // Sentiment thresholds
    strongSentimentThreshold: 0.6, // Strong sentiment above 60%
    extremeSentimentThreshold: 0.8, // Extreme sentiment above 80%
    
    // Risk management
    maxRiskPerTrade: 0.03, // Maximum 3% risk per trade
    sentimentRiskMultiplier: 1.5, // Increase risk limits during strong sentiment
    
    // Signal filtering
    minTechnicalConfidence: 0.6, // Minimum technical confidence
    requireSentimentAlignment: true, // Require sentiment to align with technical
    
    // Position sizing
    baseSentimentAdjustment: 0.2, // Base sentiment adjustment factor
    extremeSentimentBoost: 0.3 // Additional boost for extreme sentiment
  };
  
  constructor(binanceClient: BinanceFuturesClient, nebiusAI: NebiusAIService) {
    this.binanceClient = binanceClient;
    this.nebiusAI = nebiusAI;
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.multiTimeframeAnalyzer = new MultiTimeframeAnalyzer(binanceClient, nebiusAI);
  }

  /**
   * Generate sentiment-enhanced trading signal
   */
  async generateEnhancedSignal(symbol: string, timeframe: '1h' | '4h' | '24h' = '4h'): Promise<SentimentEnhancedSignal> {
    console.log(`🎯 Generating sentiment-enhanced signal for ${symbol}...`);
    
    const startTime = Date.now();
    
    try {
      // Run technical and sentiment analysis in parallel
      const [multiTimeframeAnalysis, marketSentiment] = await Promise.all([
        this.multiTimeframeAnalyzer.analyzeMultiTimeframe(symbol),
        this.sentimentAnalyzer.analyzeMarketSentiment(symbol, timeframe)
      ]);
      
      // Validate analysis quality
      const validationResult = this.validateAnalysisQuality(multiTimeframeAnalysis, marketSentiment);
      
      if (!validationResult.isValid) {
        console.log(`⚠️ Analysis quality insufficient: ${validationResult.reason}`);
        return this.createHoldSignal(symbol, multiTimeframeAnalysis, marketSentiment, validationResult.reason);
      }
      
      // Generate base technical signal
      const technicalSignal = this.extractTechnicalSignal(multiTimeframeAnalysis);
      
      // Apply sentiment enhancement
      const enhancedSignal = this.applySentimentEnhancement(technicalSignal, marketSentiment, multiTimeframeAnalysis);
      
      console.log(`✅ Sentiment-enhanced signal generated for ${symbol}`);
      console.log(`📊 Technical: ${technicalSignal.action} | Sentiment: ${marketSentiment.signals.direction}`);
      console.log(`🎯 Final: ${enhancedSignal.action} (${(enhancedSignal.confidence * 100).toFixed(1)}% confidence)`);
      
      return {
        ...enhancedSignal,
        metadata: {
          multiTimeframeAnalysis,
          marketSentiment,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error(`❌ Error generating enhanced signal for ${symbol}:`, error);
      
      // Fallback to technical analysis only
      const fallbackAnalysis = await this.multiTimeframeAnalyzer.analyzeMultiTimeframe(symbol);
      return this.createFallbackSignal(symbol, fallbackAnalysis, error);
    }
  }

  /**
   * Validate analysis quality before proceeding
   */
  private validateAnalysisQuality(
    technical: MultiTimeframeAnalysis, 
    sentiment: MarketSentiment
  ): { isValid: boolean; reason: string } {
    
    // Check technical analysis quality
    if (technical.consensus.confidence < this.config.minTechnicalConfidence) {
      return {
        isValid: false,
        reason: `Low technical confidence: ${(technical.consensus.confidence * 100).toFixed(1)}%`
      };
    }
    
    // Check sentiment analysis quality
    if (sentiment.overall.confidence < this.config.minSentimentConfidence) {
      return {
        isValid: false,
        reason: `Low sentiment confidence: ${(sentiment.overall.confidence * 100).toFixed(1)}%`
      };
    }
    
    // Check for sufficient data points
    if (sentiment.metadata.dataPoints < 3) {
      return {
        isValid: false,
        reason: `Insufficient sentiment data: ${sentiment.metadata.dataPoints} data points`
      };
    }
    
    return { isValid: true, reason: 'Analysis quality validated' };
  }

  /**
   * Extract technical signal from multi-timeframe analysis
   */
  private extractTechnicalSignal(analysis: MultiTimeframeAnalysis) {
    return {
      action: analysis.consensus.signal,
      confidence: analysis.consensus.confidence,
      positionSize: analysis.riskAssessment.recommendedPositionSize,
      reasoning: analysis.consensus.reasoning
    };
  }

  /**
   * Apply sentiment enhancement to technical signal
   */
  private applySentimentEnhancement(
    technicalSignal: any,
    sentiment: MarketSentiment,
    technical: MultiTimeframeAnalysis
  ): SentimentEnhancedSignal {
    
    // Calculate sentiment alignment with technical signal
    const alignment = this.calculateSentimentAlignment(technicalSignal, sentiment);
    
    // Calculate position size adjustment with enhanced logic
    const sentimentAdjustment = this.calculateEnhancedSentimentAdjustment(sentiment, alignment);
    
    // Calculate final action and confidence
    const { finalAction, finalConfidence } = this.calculateEnhancedAction(
      technicalSignal, 
      sentiment, 
      alignment
    );
    
    // Calculate weights
    const technicalWeight = 1 - this.config.sentimentWeight;
    const sentimentWeight = this.config.sentimentWeight;
    
    // Calculate final position size with enhanced logic
    const basePositionSize = technicalSignal.positionSize;
    const finalPositionSize = this.calculateFinalPositionSize(
      basePositionSize, 
      sentimentAdjustment, 
      sentiment
    );
    
    // Calculate leverage and risk management
    const leverage = this.calculateSentimentAdjustedLeverage(sentiment, technical);
    const { stopLoss, takeProfit } = this.calculateSentimentAdjustedExits(
      finalAction, 
      sentiment, 
      technical
    );
    
    // Generate comprehensive reasoning
    const reasoning = this.generateEnhancedReasoning(
      technicalSignal, 
      sentiment, 
      alignment, 
      sentimentAdjustment
    );
    
    return {
      symbol: technical.symbol,
      action: finalAction,
      confidence: finalConfidence,
      reasoning,
      
      basePositionSize,
      sentimentAdjustment,
      finalPositionSize,
      
      leverage,
      stopLoss,
      takeProfit,
      
      sentimentScore: sentiment.overall.score,
      sentimentStrength: sentiment.signals.strength,
      sentimentDirection: sentiment.signals.direction,
      sentimentImpact: sentiment.signals.tradingImpact,
      
      technicalWeight,
      sentimentWeight,
      
      metadata: {
        multiTimeframeAnalysis: technical,
        marketSentiment: sentiment,
        processingTime: 0, // Will be set by caller
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Calculate sentiment alignment with technical signal
   */
  private calculateSentimentAlignment(technicalSignal: any, sentiment: MarketSentiment): number {
    const technicalDirection = ['BUY', 'STRONG_BUY'].includes(technicalSignal.action) ? 'BULLISH' :
                              ['SELL', 'STRONG_SELL'].includes(technicalSignal.action) ? 'BEARISH' : 'NEUTRAL';
    
    const sentimentDirection = sentiment.signals.direction;
    
    // Perfect alignment
    if (technicalDirection === sentimentDirection) {
      return 1.0;
    }
    
    // Neutral alignment
    if (technicalDirection === 'NEUTRAL' || sentimentDirection === 'NEUTRAL') {
      return 0.5;
    }
    
    // Opposite directions
    return 0.0;
  }

  /**
   * Calculate enhanced sentiment-based position size adjustment
   */
  private calculateEnhancedSentimentAdjustment(sentiment: MarketSentiment, alignment: number): number {
    const sentimentStrength = Math.abs(sentiment.overall.score);
    const sentimentConfidence = sentiment.overall.confidence;
    const sentimentMagnitude = sentiment.overall.magnitude;
    
    // Enhanced base adjustment considering multiple factors
    let adjustment = sentimentStrength * sentimentConfidence * sentimentMagnitude * this.config.baseSentimentAdjustment;
    
    // Apply alignment factor with enhanced logic
    if (alignment > 0.8) {
      // Strong alignment - significant boost
      adjustment = adjustment * (1 + alignment * 1.5);
    } else if (alignment > 0.5) {
      // Moderate alignment - moderate boost
      adjustment = adjustment * (1 + alignment);
    } else if (alignment < 0.3) {
      // Poor alignment - reduce position significantly
      adjustment = -adjustment * (2 - alignment);
    } else {
      // Neutral alignment - slight reduction
      adjustment = adjustment * alignment;
    }
    
    // Apply trading impact multiplier
    const impactMultipliers = {
      'LOW': 0.8,
      'MEDIUM': 1.0,
      'HIGH': 1.3,
      'CRITICAL': 1.6
    };
    adjustment *= impactMultipliers[sentiment.signals.tradingImpact];
    
    // Apply trend alignment bonus
    const trends = sentiment.trends;
    const trendAlignment = (trends.shortTerm === trends.mediumTerm) && (trends.mediumTerm === trends.longTerm);
    if (trendAlignment && trends.shortTerm !== 'NEUTRAL') {
      adjustment *= 1.2; // 20% bonus for aligned trends
    }
    
    // Apply extreme sentiment boost with stricter conditions
    if (sentimentStrength > this.config.extremeSentimentThreshold && 
        alignment > 0.8 && 
        sentimentConfidence > 0.8) {
      adjustment += this.config.extremeSentimentBoost;
    }
    
    // Apply news vs social sentiment consistency bonus
    const newsScore = sentiment.news.sentiment.score;
    const socialScore = sentiment.social.sentiment.score;
    const sentimentConsistency = 1 - Math.abs(newsScore - socialScore) / 2;
    if (sentimentConsistency > 0.8) {
      adjustment *= 1.1; // 10% bonus for consistent sentiment
    }
    
    // Cap the adjustment with dynamic limits based on volatility
    const maxAdjustment = sentiment.signals.tradingImpact === 'CRITICAL' ? 
      this.config.maxSentimentAdjustment * 1.5 : 
      this.config.maxSentimentAdjustment;
    
    return Math.max(
      -maxAdjustment,
      Math.min(maxAdjustment, adjustment)
    );
  }

  /**
   * Calculate final position size with enhanced risk management
   */
  private calculateFinalPositionSize(
    basePositionSize: number, 
    sentimentAdjustment: number, 
    sentiment: MarketSentiment
  ): number {
    
    // Apply sentiment adjustment
    let adjustedSize = basePositionSize * (1 + sentimentAdjustment);
    
    // Apply sentiment-based risk scaling
    const riskScaling = this.calculateSentimentRiskScaling(sentiment);
    adjustedSize *= riskScaling;
    
    // Ensure minimum and maximum bounds
    const minSize = 0.005; // Minimum 0.5%
    const maxSize = sentiment.signals.tradingImpact === 'CRITICAL' ? 
      this.config.maxRiskPerTrade * this.config.sentimentRiskMultiplier : 
      this.config.maxRiskPerTrade;
    
    return Math.max(minSize, Math.min(maxSize, adjustedSize));
  }

  /**
   * Calculate sentiment-based risk scaling
   */
  private calculateSentimentRiskScaling(sentiment: MarketSentiment): number {
    const confidence = sentiment.overall.confidence;
    const magnitude = sentiment.overall.magnitude;
    const impactLevel = sentiment.signals.tradingImpact;
    
    // Base scaling from confidence and magnitude
    let scaling = 0.5 + (confidence * magnitude * 0.5);
    
    // Adjust based on trading impact
    const impactScaling = {
      'LOW': 0.8,
      'MEDIUM': 1.0,
      'HIGH': 1.2,
      'CRITICAL': 1.4
    };
    
    scaling *= impactScaling[impactLevel];
    
    // Ensure reasonable bounds
    return Math.max(0.3, Math.min(1.5, scaling));
  }

  /**
   * Calculate enhanced action and confidence
   */
  private calculateEnhancedAction(
    technicalSignal: any,
    sentiment: MarketSentiment,
    alignment: number
  ): { finalAction: SentimentEnhancedSignal['action']; finalConfidence: number } {
    
    let finalAction = technicalSignal.action;
    let finalConfidence = technicalSignal.confidence;
    
    // Boost confidence for aligned sentiment
    if (alignment > 0.8 && sentiment.signals.strength === 'VERY_STRONG') {
      finalConfidence = Math.min(0.95, finalConfidence * 1.2);
      
      // Upgrade action for very strong aligned sentiment
      if (finalAction === 'BUY') finalAction = 'STRONG_BUY';
      else if (finalAction === 'SELL') finalAction = 'STRONG_SELL';
    }
    
    // Reduce confidence for conflicting sentiment
    else if (alignment < 0.3 && sentiment.signals.strength !== 'WEAK') {
      finalConfidence = Math.max(0.3, finalConfidence * 0.7);
      
      // Downgrade action for conflicting sentiment
      if (finalAction === 'STRONG_BUY') finalAction = 'BUY';
      else if (finalAction === 'STRONG_SELL') finalAction = 'SELL';
      else if (['BUY', 'SELL'].includes(finalAction)) finalAction = 'HOLD';
    }
    
    // Force hold for critical negative sentiment
    if (sentiment.signals.tradingImpact === 'CRITICAL' && sentiment.overall.score < -0.5) {
      finalAction = 'HOLD';
      finalConfidence = 0.8; // High confidence in holding during crisis
    }
    
    // Apply sentiment momentum factor
    const sentimentMomentum = this.calculateSentimentMomentum(sentiment);
    if (Math.abs(sentimentMomentum) > 0.6) {
      finalConfidence = Math.min(0.95, finalConfidence * 1.1);
    }
    
    return { finalAction, finalConfidence };
  }

  /**
   * Calculate sentiment momentum
   */
  private calculateSentimentMomentum(sentiment: MarketSentiment): number {
    const newsScore = sentiment.news.sentiment.score;
    const socialScore = sentiment.social.sentiment.score;
    const overallMagnitude = sentiment.overall.magnitude;
    
    // Calculate momentum based on sentiment alignment and strength
    const alignment = 1 - Math.abs(newsScore - socialScore) / 2;
    const avgScore = (newsScore + socialScore) / 2;
    
    return avgScore * overallMagnitude * alignment;
  }

  /**
   * Calculate sentiment-adjusted leverage
   */
  private calculateSentimentAdjustedLeverage(
    sentiment: MarketSentiment,
    technical: MultiTimeframeAnalysis
  ): number {
    
    // Start with technical-based leverage
    let baseLeverage = technical.riskAssessment.volatility === 'HIGH' ? 2 :
                      technical.riskAssessment.volatility === 'MEDIUM' ? 3 : 4;
    
    // Adjust based on sentiment confidence and strength
    const sentimentFactor = sentiment.overall.confidence * Math.abs(sentiment.overall.score);
    
    if (sentimentFactor > 0.7) {
      baseLeverage = Math.min(5, baseLeverage + 1); // Increase leverage for strong sentiment
    } else if (sentimentFactor < 0.3) {
      baseLeverage = Math.max(2, baseLeverage - 1); // Decrease leverage for weak sentiment
    }
    
    // Reduce leverage during high volatility or negative sentiment
    if (sentiment.signals.tradingImpact === 'CRITICAL' || sentiment.overall.score < -0.6) {
      baseLeverage = Math.max(2, Math.floor(baseLeverage * 0.7));
    }
    
    // Apply sentiment consistency factor
    const newsScore = sentiment.news.sentiment.score;
    const socialScore = sentiment.social.sentiment.score;
    const consistency = 1 - Math.abs(newsScore - socialScore) / 2;
    
    if (consistency > 0.8) {
      baseLeverage = Math.min(6, baseLeverage + 1); // Increase for consistent sentiment
    } else if (consistency < 0.4) {
      baseLeverage = Math.max(2, baseLeverage - 1); // Decrease for conflicting sentiment
    }
    
    return baseLeverage;
  }

  /**
   * Calculate sentiment-adjusted exit levels
   */
  private calculateSentimentAdjustedExits(
    action: string,
    sentiment: MarketSentiment,
    technical: MultiTimeframeAnalysis
  ): { stopLoss: number; takeProfit: number[] } {
    
    // Base price (mock - in real implementation, get from market data)
    const currentPrice = 43000; // This should come from real market data
    
    // Calculate dynamic stop loss distance based on sentiment
    let stopLossDistance = 0.02; // 2% base
    
    // Adjust based on sentiment volatility and impact
    if (sentiment.signals.tradingImpact === 'CRITICAL') {
      stopLossDistance = 0.015; // Tighter stop during high impact events
    } else if (sentiment.overall.magnitude > 0.8) {
      stopLossDistance = 0.025; // Wider stop during high sentiment volatility
    }
    
    // Adjust based on sentiment confidence
    if (sentiment.overall.confidence > 0.8) {
      stopLossDistance *= 0.9; // Tighter stop for high confidence
    } else if (sentiment.overall.confidence < 0.5) {
      stopLossDistance *= 1.2; // Wider stop for low confidence
    }
    
    // Calculate stop loss
    const isLong = ['BUY', 'STRONG_BUY'].includes(action);
    const stopLoss = isLong ? 
      currentPrice * (1 - stopLossDistance) : 
      currentPrice * (1 + stopLossDistance);
    
    // Calculate take profit levels with enhanced sentiment adjustment
    const baseTpDistances = [0.02, 0.04, 0.06]; // 2%, 4%, 6%
    
    // Calculate sentiment multiplier with multiple factors
    let sentimentMultiplier = 1.0;
    
    if (sentiment.overall.score > 0.6 && sentiment.overall.confidence > 0.7) {
      sentimentMultiplier = 1.4; // Extend targets for strong positive sentiment
    } else if (sentiment.overall.score > 0.3) {
      sentimentMultiplier = 1.2; // Moderate extension
    } else if (sentiment.overall.score < -0.6) {
      sentimentMultiplier = 0.7; // Reduce targets for negative sentiment
    } else if (sentiment.overall.score < -0.3) {
      sentimentMultiplier = 0.85; // Slight reduction
    }
    
    // Apply trend alignment factor
    const trends = sentiment.trends;
    const trendAlignment = (trends.shortTerm === trends.mediumTerm) && (trends.mediumTerm === trends.longTerm);
    if (trendAlignment && trends.shortTerm !== 'NEUTRAL') {
      sentimentMultiplier *= 1.15; // 15% bonus for aligned trends
    }
    
    const takeProfit = baseTpDistances.map(distance => {
      const adjustedDistance = distance * sentimentMultiplier;
      return isLong ? 
        currentPrice * (1 + adjustedDistance) : 
        currentPrice * (1 - adjustedDistance);
    });
    
    return { stopLoss, takeProfit };
  }

  /**
   * Generate comprehensive reasoning with enhanced details
   */
  private generateEnhancedReasoning(
    technicalSignal: any,
    sentiment: MarketSentiment,
    alignment: number,
    sentimentAdjustment: number
  ): string {
    
    const parts = [];
    
    // Technical component
    parts.push(`Technical Analysis: ${technicalSignal.action} (${(technicalSignal.confidence * 100).toFixed(1)}% confidence)`);
    
    // Sentiment component with detailed breakdown
    parts.push(`Market Sentiment: ${sentiment.overall.category} (${(sentiment.overall.score * 100).toFixed(1)}% score, ${sentiment.signals.strength} strength, ${sentiment.signals.tradingImpact} impact)`);
    
    // News vs Social breakdown
    const newsScore = sentiment.news.sentiment.score;
    const socialScore = sentiment.social.sentiment.score;
    parts.push(`News: ${sentiment.news.sentiment.category} (${(newsScore * 100).toFixed(1)}%), Social: ${sentiment.social.sentiment.category} (${(socialScore * 100).toFixed(1)}%)`);
    
    // Alignment analysis
    const alignmentDesc = alignment > 0.8 ? 'Strong alignment' :
                         alignment > 0.5 ? 'Moderate alignment' :
                         alignment > 0.2 ? 'Weak alignment' : 'Conflicting signals';
    parts.push(`Sentiment-Technical Alignment: ${alignmentDesc} (${(alignment * 100).toFixed(1)}%)`);
    
    // Position sizing explanation
    const adjustmentDesc = sentimentAdjustment > 0.2 ? 'Increased position size' :
                          sentimentAdjustment < -0.2 ? 'Reduced position size' : 'Standard position size';
    parts.push(`Position Sizing: ${adjustmentDesc} (${(sentimentAdjustment * 100).toFixed(1)}% adjustment)`);
    
    // Trend analysis
    const trends = sentiment.trends;
    if (trends.shortTerm !== 'NEUTRAL' || trends.mediumTerm !== 'NEUTRAL' || trends.longTerm !== 'NEUTRAL') {
      parts.push(`Sentiment Trends: Short-term ${trends.shortTerm}, Medium-term ${trends.mediumTerm}, Long-term ${trends.longTerm}`);
    }
    
    // Key sentiment factors
    if (sentiment.signals.tradingImpact === 'CRITICAL') {
      parts.push(`⚠️ Critical sentiment impact detected - heightened volatility expected`);
    }
    
    if (sentiment.overall.keywords.length > 0) {
      parts.push(`Key sentiment drivers: ${sentiment.overall.keywords.slice(0, 3).join(', ')}`);
    }
    
    // Data quality note
    parts.push(`Analysis based on ${sentiment.metadata.dataPoints} data points (${sentiment.news.articles.length} news, ${sentiment.social.posts.length} social posts)`);
    
    return parts.join('. ');
  }

  /**
   * Create hold signal for insufficient analysis quality
   */
  private createHoldSignal(
    symbol: string,
    technical: MultiTimeframeAnalysis,
    sentiment: MarketSentiment,
    reason: string
  ): SentimentEnhancedSignal {
    
    return {
      symbol,
      action: 'HOLD',
      confidence: 0.5,
      reasoning: `HOLD: ${reason}`,
      
      basePositionSize: 0,
      sentimentAdjustment: 0,
      finalPositionSize: 0,
      
      leverage: 1,
      stopLoss: 0,
      takeProfit: [],
      
      sentimentScore: sentiment.overall.score,
      sentimentStrength: sentiment.signals.strength,
      sentimentDirection: sentiment.signals.direction,
      sentimentImpact: sentiment.signals.tradingImpact,
      
      technicalWeight: 0.7,
      sentimentWeight: 0.3,
      
      metadata: {
        multiTimeframeAnalysis: technical,
        marketSentiment: sentiment,
        processingTime: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create fallback signal for errors
   */
  private createFallbackSignal(
    symbol: string,
    technical: MultiTimeframeAnalysis,
    error: any
  ): SentimentEnhancedSignal {
    
    const fallbackSentiment = {
      overall: { score: 0, confidence: 0.5, magnitude: 0, reasoning: 'Fallback', keywords: [], category: 'NEUTRAL' as const },
      signals: { strength: 'WEAK' as const, direction: 'NEUTRAL' as const, confidence: 0.5, tradingImpact: 'LOW' as const }
    };
    
    return {
      symbol,
      action: 'HOLD',
      confidence: 0.3,
      reasoning: `Fallback to HOLD due to sentiment analysis error: ${error.message}`,
      
      basePositionSize: 0,
      sentimentAdjustment: 0,
      finalPositionSize: 0,
      
      leverage: 2,
      stopLoss: 0,
      takeProfit: [],
      
      sentimentScore: 0,
      sentimentStrength: 'WEAK',
      sentimentDirection: 'NEUTRAL',
      sentimentImpact: 'LOW',
      
      technicalWeight: 1.0,
      sentimentWeight: 0.0,
      
      metadata: {
        multiTimeframeAnalysis: technical,
        marketSentiment: fallbackSentiment as any,
        processingTime: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Update strategy configuration
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 Sentiment-enhanced strategy configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }

  /**
   * Get sentiment analysis summary for a symbol
   */
  async getSentimentSummary(symbol: string, timeframe: '1h' | '4h' | '24h' = '4h'): Promise<{
    sentiment: MarketSentiment;
    positionSizeRecommendation: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    tradingRecommendation: string;
  }> {
    
    const sentiment = await this.sentimentAnalyzer.analyzeMarketSentiment(symbol, timeframe);
    
    // Calculate position size recommendation
    const baseSize = 0.02; // 2% base position
    const alignment = sentiment.overall.score > 0 ? 1 : sentiment.overall.score < 0 ? 1 : 0.5;
    const adjustment = this.calculateEnhancedSentimentAdjustment(sentiment, alignment);
    const positionSizeRecommendation = Math.max(0.005, Math.min(0.05, baseSize * (1 + adjustment)));
    
    // Determine risk level
    const riskLevel = sentiment.signals.tradingImpact;
    
    // Generate trading recommendation
    let tradingRecommendation = '';
    if (sentiment.overall.score > 0.6 && sentiment.overall.confidence > 0.7) {
      tradingRecommendation = 'Strong bullish sentiment - consider increasing position size';
    } else if (sentiment.overall.score < -0.6 && sentiment.overall.confidence > 0.7) {
      tradingRecommendation = 'Strong bearish sentiment - consider reducing exposure or shorting';
    } else if (Math.abs(sentiment.overall.score) < 0.2) {
      tradingRecommendation = 'Neutral sentiment - wait for clearer signals';
    } else {
      tradingRecommendation = 'Mixed sentiment - proceed with caution and standard position sizing';
    }
    
    return {
      sentiment,
      positionSizeRecommendation,
      riskLevel,
      tradingRecommendation
    };
  }
}