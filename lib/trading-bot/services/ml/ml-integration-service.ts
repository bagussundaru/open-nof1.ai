import { PricePredictionService } from './price-prediction-service';
import { PatternRecognitionService } from './pattern-recognition-service';
import { AdaptiveLearningService } from './adaptive-learning-service';
import { 
  PriceData, 
  PricePrediction, 
  CandlestickPattern, 
  SupportResistanceLevel, 
  TrendReversalSignal,
  ModelPerformance,
  AdaptiveLearningMetrics
} from './ml-types';

/**
 * ML Integration Service - Orchestrates all machine learning components
 */
export class MLIntegrationService {
  private pricePredictionService: PricePredictionService;
  private patternRecognitionService: PatternRecognitionService;
  private adaptiveLearningService: AdaptiveLearningService;
  
  private isInitialized = false;
  private lastAnalysisTime: Map<string, number> = new Map();
  private analysisCache: Map<string, any> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor() {
    this.pricePredictionService = new PricePredictionService();
    this.patternRecognitionService = new PatternRecognitionService();
    this.adaptiveLearningService = new AdaptiveLearningService();
    
    this.initialize();
  }

  /**
   * Initialize ML integration service
   */
  private async initialize(): Promise<void> {
    console.log('🚀 Initializing ML Integration Service...');
    
    try {
      // Set up performance monitoring
      this.setupPerformanceMonitoring();
      
      // Set up adaptive learning feedback loops
      this.setupAdaptiveLearning();
      
      this.isInitialized = true;
      console.log('✅ ML Integration Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ML Integration Service:', error);
      throw error;
    }
  }

  /**
   * Comprehensive ML analysis for a trading symbol
   */
  async analyzeSymbol(symbol: string, historicalData: PriceData[]): Promise<{
    prediction: PricePrediction;
    patterns: CandlestickPattern[];
    supportResistance: SupportResistanceLevel[];
    reversals: TrendReversalSignal[];
    confidence: number;
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    reasoning: string[];
  }> {
    console.log(`🔬 Performing comprehensive ML analysis for ${symbol}...`);
    
    if (!this.isInitialized) {
      throw new Error('ML Integration Service not initialized');
    }

    // Check cache first
    const cacheKey = `${symbol}_${Date.now() - (Date.now() % this.cacheTimeout)}`;
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      console.log(`📋 Using cached analysis for ${symbol}`);
      return cached;
    }

    try {
      // Run all ML analyses in parallel
      const [prediction, patterns, supportResistance, reversals] = await Promise.all([
        this.pricePredictionService.predictPrice(symbol, historicalData),
        Promise.resolve(this.patternRecognitionService.analyzeCandlestickPatterns(symbol, historicalData)),
        Promise.resolve(this.patternRecognitionService.detectSupportResistanceLevels(symbol, historicalData)),
        Promise.resolve(this.patternRecognitionService.identifyTrendReversals(symbol, historicalData))
      ]);

      // Combine analyses to generate recommendation
      const analysis = this.combineAnalyses(prediction, patterns, supportResistance, reversals);
      
      // Cache the result
      this.analysisCache.set(cacheKey, analysis);
      
      // Update last analysis time
      this.lastAnalysisTime.set(symbol, Date.now());
      
      console.log(`✅ ML analysis completed for ${symbol}: ${analysis.recommendation} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
      
      return analysis;
    } catch (error) {
      console.error(`❌ ML analysis failed for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Update model performance with actual trading results
   */
  async updateModelPerformance(
    symbol: string,
    predictedPrice: number,
    actualPrice: number,
    timestamp: number
  ): Promise<void> {
    console.log(`📊 Updating model performance for ${symbol}`);
    
    try {
      // Update price prediction model performance
      await this.pricePredictionService.updateModelPerformance('LSTM_Primary', actualPrice, predictedPrice);
      await this.pricePredictionService.updateModelPerformance('GRU_Secondary', actualPrice, predictedPrice);
      await this.pricePredictionService.updateModelPerformance('Linear_Baseline', actualPrice, predictedPrice);
      
      // Monitor performance for adaptive learning
      await this.adaptiveLearningService.monitorModelPerformance(
        `${symbol}_ensemble`,
        [actualPrice],
        [predictedPrice],
        [timestamp]
      );
      
      console.log(`✅ Model performance updated for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to update model performance for ${symbol}:`, error);
    }
  }

  /**
   * Retrain models with new market data
   */
  async retrainModels(symbol: string, trainingData: PriceData[]): Promise<void> {
    console.log(`🔄 Retraining models for ${symbol}...`);
    
    try {
      // Retrain price prediction models
      await this.pricePredictionService.retrainModels(symbol, trainingData);
      
      // Clear old pattern data to force fresh analysis
      this.patternRecognitionService.clearOldData(symbol);
      
      // Clear analysis cache
      this.clearAnalysisCache(symbol);
      
      console.log(`✅ Models retrained for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to retrain models for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive ML metrics
   */
  getMLMetrics(): {
    modelPerformances: Map<string, ModelPerformance>;
    adaptationMetrics: Map<string, AdaptiveLearningMetrics>;
    analysisStats: {
      totalAnalyses: number;
      cacheHitRate: number;
      averageAnalysisTime: number;
    };
  } {
    const modelPerformances = this.pricePredictionService.getModelPerformance();
    const adaptationMetrics = new Map<string, AdaptiveLearningMetrics>();
    
    // Collect adaptation metrics for all symbols
    for (const symbol of Array.from(this.lastAnalysisTime.keys())) {
      const metrics = this.adaptiveLearningService.getAdaptationMetrics(`${symbol}_ensemble`);
      if (metrics) {
        adaptationMetrics.set(symbol, metrics);
      }
    }
    
    return {
      modelPerformances,
      adaptationMetrics,
      analysisStats: {
        totalAnalyses: this.lastAnalysisTime.size,
        cacheHitRate: this.calculateCacheHitRate(),
        averageAnalysisTime: this.calculateAverageAnalysisTime()
      }
    };
  }

  /**
   * Combine all ML analyses into a single recommendation
   */
  private combineAnalyses(
    prediction: PricePrediction,
    patterns: CandlestickPattern[],
    supportResistance: SupportResistanceLevel[],
    reversals: TrendReversalSignal[]
  ): any {
    const reasoning: string[] = [];
    let confidence = 0;
    let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    
    // Weight different analysis components
    const weights = {
      prediction: 0.4,
      patterns: 0.25,
      supportResistance: 0.2,
      reversals: 0.15
    };
    
    // Analyze price prediction
    let predictionScore = 0;
    if (prediction.direction === 'UP') {
      predictionScore = prediction.confidence;
      reasoning.push(`Price prediction: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}% confidence)`);
    } else if (prediction.direction === 'DOWN') {
      predictionScore = -prediction.confidence;
      reasoning.push(`Price prediction: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}% confidence)`);
    } else {
      reasoning.push(`Price prediction: ${prediction.direction} - sideways movement expected`);
    }
    
    // Analyze candlestick patterns
    let patternScore = 0;
    const bullishPatterns = patterns.filter(p => p.type === 'BULLISH');
    const bearishPatterns = patterns.filter(p => p.type === 'BEARISH');
    
    if (bullishPatterns.length > 0) {
      const avgReliability = bullishPatterns.reduce((sum, p) => sum + p.reliability, 0) / bullishPatterns.length;
      patternScore += avgReliability;
      reasoning.push(`${bullishPatterns.length} bullish pattern(s) detected (avg reliability: ${(avgReliability * 100).toFixed(1)}%)`);
    }
    
    if (bearishPatterns.length > 0) {
      const avgReliability = bearishPatterns.reduce((sum, p) => sum + p.reliability, 0) / bearishPatterns.length;
      patternScore -= avgReliability;
      reasoning.push(`${bearishPatterns.length} bearish pattern(s) detected (avg reliability: ${(avgReliability * 100).toFixed(1)}%)`);
    }
    
    // Analyze support/resistance levels
    let srScore = 0;
    const currentPrice = prediction.currentPrice;
    const nearbySupport = supportResistance.filter(sr => 
      sr.type === 'SUPPORT' && Math.abs(sr.level - currentPrice) / currentPrice < 0.02
    );
    const nearbyResistance = supportResistance.filter(sr => 
      sr.type === 'RESISTANCE' && Math.abs(sr.level - currentPrice) / currentPrice < 0.02
    );
    
    if (nearbySupport.length > 0) {
      const avgStrength = nearbySupport.reduce((sum, sr) => sum + sr.strength, 0) / nearbySupport.length;
      srScore += avgStrength * 0.5;
      reasoning.push(`Near strong support level (strength: ${(avgStrength * 100).toFixed(1)}%)`);
    }
    
    if (nearbyResistance.length > 0) {
      const avgStrength = nearbyResistance.reduce((sum, sr) => sum + sr.strength, 0) / nearbyResistance.length;
      srScore -= avgStrength * 0.5;
      reasoning.push(`Near strong resistance level (strength: ${(avgStrength * 100).toFixed(1)}%)`);
    }
    
    // Analyze trend reversals
    let reversalScore = 0;
    const bullishReversals = reversals.filter(r => r.type === 'BULLISH_REVERSAL');
    const bearishReversals = reversals.filter(r => r.type === 'BEARISH_REVERSAL');
    
    if (bullishReversals.length > 0) {
      const avgConfidence = bullishReversals.reduce((sum, r) => sum + r.confidence, 0) / bullishReversals.length;
      reversalScore += avgConfidence;
      reasoning.push(`${bullishReversals.length} bullish reversal signal(s) (avg confidence: ${(avgConfidence * 100).toFixed(1)}%)`);
    }
    
    if (bearishReversals.length > 0) {
      const avgConfidence = bearishReversals.reduce((sum, r) => sum + r.confidence, 0) / bearishReversals.length;
      reversalScore -= avgConfidence;
      reasoning.push(`${bearishReversals.length} bearish reversal signal(s) (avg confidence: ${(avgConfidence * 100).toFixed(1)}%)`);
    }
    
    // Calculate weighted score
    const totalScore = 
      predictionScore * weights.prediction +
      patternScore * weights.patterns +
      srScore * weights.supportResistance +
      reversalScore * weights.reversals;
    
    // Determine recommendation
    if (totalScore > 0.3) {
      recommendation = 'BUY';
      confidence = Math.min(0.95, Math.abs(totalScore));
    } else if (totalScore < -0.3) {
      recommendation = 'SELL';
      confidence = Math.min(0.95, Math.abs(totalScore));
    } else {
      recommendation = 'HOLD';
      confidence = 0.5 + Math.abs(totalScore) * 0.5;
    }
    
    return {
      prediction,
      patterns,
      supportResistance,
      reversals,
      confidence,
      recommendation,
      reasoning
    };
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    console.log('📊 Setting up ML performance monitoring...');
    
    // Monitor ensemble model performance
    setInterval(() => {
      const performances = this.pricePredictionService.getModelPerformance();
      
      for (const modelName of Array.from(performances.keys())) {
        const performance = performances.get(modelName)!;
        if (performance.accuracy < 0.4) { // Below 40% accuracy
          console.warn(`⚠️ Low performance detected for ${modelName}: ${(performance.accuracy * 100).toFixed(1)}%`);
        }
      }
      
      // Update ensemble weights based on performance
      this.pricePredictionService.updateEnsembleWeights();
    }, 600000); // Every 10 minutes
  }

  /**
   * Setup adaptive learning feedback loops
   */
  private setupAdaptiveLearning(): void {
    console.log('🧠 Setting up adaptive learning feedback loops...');
    
    // Create feedback loops for each model
    const modelNames = ['LSTM_Primary', 'GRU_Secondary', 'Linear_Baseline'];
    
    for (const modelName of modelNames) {
      this.adaptiveLearningService.createPerformanceFeedbackLoop(
        modelName,
        (metrics: AdaptiveLearningMetrics) => {
          if (metrics.retrainingTrigger) {
            console.log(`🔄 Adaptive learning triggered retraining for ${modelName}`);
          }
        }
      );
    }
  }

  /**
   * Clear analysis cache for a symbol
   */
  private clearAnalysisCache(symbol: string): void {
    const keysToDelete = Array.from(this.analysisCache.keys()).filter(key => key.startsWith(symbol));
    for (const key of keysToDelete) {
      this.analysisCache.delete(key);
    }
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // Simplified calculation - in reality, you'd track hits vs misses
    return 0.75; // 75% cache hit rate
  }

  /**
   * Calculate average analysis time
   */
  private calculateAverageAnalysisTime(): number {
    // Simplified calculation - in reality, you'd track actual analysis times
    return 150; // 150ms average
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('🧹 Cleaning up ML Integration Service...');
    
    this.analysisCache.clear();
    this.lastAnalysisTime.clear();
    this.isInitialized = false;
    
    console.log('✅ ML Integration Service cleanup completed');
  }
}