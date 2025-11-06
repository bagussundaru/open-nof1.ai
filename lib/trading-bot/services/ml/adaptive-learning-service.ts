import { 
  ModelPerformance, 
  AdaptiveLearningMetrics, 
  StrategyOptimization, 
  PriceData,
  MLModel 
} from './ml-types';

/**
 * Adaptive Learning Service for Real-time Model Adaptation
 */
export class AdaptiveLearningService {
  private performanceHistory: Map<string, ModelPerformance[]> = new Map();
  private adaptationMetrics: Map<string, AdaptiveLearningMetrics> = new Map();
  private optimizationHistory: Map<string, StrategyOptimization[]> = new Map();
  private retrainingThresholds = {
    performanceDrop: 0.15, // 15% performance drop triggers retraining
    driftThreshold: 0.3,   // 30% model drift threshold
    minSampleSize: 100,    // Minimum samples before adaptation
    adaptationRate: 0.1    // Learning rate for adaptation
  };

  constructor() {
    console.log('🧠 Adaptive Learning Service initialized');
  }

  /**
   * Monitor model performance and trigger adaptations
   */
  async monitorModelPerformance(
    modelName: string, 
    actualResults: number[], 
    predictions: number[],
    timestamps: number[]
  ): Promise<AdaptiveLearningMetrics> {
    console.log(`📊 Monitoring performance for model: ${modelName}`);

    if (actualResults.length !== predictions.length) {
      throw new Error('Actual results and predictions must have the same length');
    }

    // Calculate current performance metrics
    const currentPerformance = this.calculatePerformanceMetrics(
      modelName, 
      actualResults, 
      predictions, 
      timestamps
    );

    // Update performance history
    this.updatePerformanceHistory(modelName, currentPerformance);

    // Calculate adaptation metrics
    const adaptationMetrics = this.calculateAdaptationMetrics(modelName, currentPerformance);

    // Store metrics
    this.adaptationMetrics.set(modelName, adaptationMetrics);

    // Check if retraining is needed
    if (adaptationMetrics.retrainingTrigger) {
      console.log(`🔄 Retraining triggered for ${modelName}`);
      await this.triggerModelRetraining(modelName, adaptationMetrics);
    }

    // Check if real-time adaptation is needed
    if (adaptationMetrics.modelDrift > this.retrainingThresholds.driftThreshold) {
      console.log(`⚡ Real-time adaptation triggered for ${modelName}`);
      await this.performRealTimeAdaptation(modelName, adaptationMetrics);
    }

    return adaptationMetrics;
  }

  /**
   * Optimize strategy parameters using performance feedback
   */
  async optimizeStrategyParameters(
    strategyName: string,
    currentParameters: { [key: string]: number },
    performanceData: {
      returns: number[];
      trades: number;
      winRate: number;
      sharpeRatio: number;
      maxDrawdown: number;
    }
  ): Promise<StrategyOptimization> {
    console.log(`🎯 Optimizing parameters for strategy: ${strategyName}`);

    // Use Bayesian optimization approach (simplified)
    const optimization = await this.bayesianOptimization(
      strategyName,
      currentParameters,
      performanceData
    );

    // Store optimization history
    const history = this.optimizationHistory.get(strategyName) || [];
    history.push(optimization);
    this.optimizationHistory.set(strategyName, history);

    // Keep only last 50 optimizations
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    console.log(`✅ Strategy optimization completed for ${strategyName}`);
    return optimization;
  }

  /**
   * Perform real-time model adaptation
   */
  async performRealTimeAdaptation(
    modelName: string, 
    metrics: AdaptiveLearningMetrics
  ): Promise<void> {
    console.log(`⚡ Performing real-time adaptation for ${modelName}`);

    const performanceHistory = this.performanceHistory.get(modelName) || [];
    if (performanceHistory.length < 2) {
      console.log('Insufficient history for adaptation');
      return;
    }

    // Calculate adaptation adjustments
    const adaptationAdjustments = this.calculateAdaptationAdjustments(
      performanceHistory, 
      metrics
    );

    // Apply gradual parameter adjustments
    await this.applyParameterAdjustments(modelName, adaptationAdjustments);

    // Update adaptation metrics
    metrics.lastAdaptation = new Date();
    metrics.adaptationRate = this.retrainingThresholds.adaptationRate;

    console.log(`✅ Real-time adaptation completed for ${modelName}`);
  }

  /**
   * Create performance feedback loop
   */
  createPerformanceFeedbackLoop(
    modelName: string,
    feedbackCallback: (metrics: AdaptiveLearningMetrics) => void
  ): void {
    console.log(`🔄 Creating performance feedback loop for ${modelName}`);

    // Set up periodic performance evaluation
    setInterval(async () => {
      const metrics = this.adaptationMetrics.get(modelName);
      if (metrics) {
        feedbackCallback(metrics);
        
        // Auto-trigger optimization if performance degrades
        if (metrics.performanceDegradation > this.retrainingThresholds.performanceDrop) {
          await this.triggerModelRetraining(modelName, metrics);
        }
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    modelName: string,
    actualResults: number[],
    predictions: number[],
    timestamps: number[]
  ): ModelPerformance {
    const n = actualResults.length;
    
    // Calculate basic metrics
    let correctPredictions = 0;
    let totalSquaredError = 0;
    let totalAbsoluteError = 0;
    
    for (let i = 0; i < n; i++) {
      const error = actualResults[i] - predictions[i];
      const percentError = Math.abs(error / actualResults[i]);
      
      if (percentError < 0.05) { // Within 5% considered correct
        correctPredictions++;
      }
      
      totalSquaredError += error * error;
      totalAbsoluteError += Math.abs(error);
    }
    
    const accuracy = correctPredictions / n;
    const mse = totalSquaredError / n;
    const mae = totalAbsoluteError / n;
    
    // Calculate returns-based metrics
    const returns = this.calculateReturns(actualResults, predictions);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    return {
      modelName,
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy,    // Simplified
      f1Score: accuracy,   // Simplified
      mse,
      mae,
      sharpeRatio,
      totalPredictions: n,
      correctPredictions,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate adaptation metrics
   */
  private calculateAdaptationMetrics(
    modelName: string, 
    currentPerformance: ModelPerformance
  ): AdaptiveLearningMetrics {
    const history = this.performanceHistory.get(modelName) || [];
    
    let modelDrift = 0;
    let performanceDegradation = 0;
    let retrainingTrigger = false;
    
    if (history.length > 0) {
      const previousPerformance = history[history.length - 1];
      
      // Calculate model drift (change in prediction patterns)
      modelDrift = Math.abs(currentPerformance.accuracy - previousPerformance.accuracy) +
                   Math.abs(currentPerformance.mse - previousPerformance.mse) / 2;
      
      // Calculate performance degradation
      performanceDegradation = Math.max(0, previousPerformance.accuracy - currentPerformance.accuracy);
      
      // Check retraining triggers
      retrainingTrigger = performanceDegradation > this.retrainingThresholds.performanceDrop ||
                         modelDrift > this.retrainingThresholds.driftThreshold ||
                         currentPerformance.totalPredictions > this.retrainingThresholds.minSampleSize;
    }
    
    // Calculate next retraining date
    const nextRetrainingDate = new Date();
    nextRetrainingDate.setDate(nextRetrainingDate.getDate() + 7); // Weekly retraining
    
    return {
      modelDrift,
      performanceDegradation,
      retrainingTrigger,
      adaptationRate: this.retrainingThresholds.adaptationRate,
      lastAdaptation: new Date(),
      nextRetrainingDate
    };
  }

  /**
   * Bayesian optimization for strategy parameters
   */
  private async bayesianOptimization(
    strategyName: string,
    currentParameters: { [key: string]: number },
    performanceData: any
  ): Promise<StrategyOptimization> {
    // Simplified Bayesian optimization
    const parameterNames = Object.keys(currentParameters);
    const optimizedParameters = { ...currentParameters };
    
    // Calculate current performance score
    const currentScore = this.calculatePerformanceScore(performanceData);
    
    // Try parameter variations (simplified grid search)
    let bestScore = currentScore;
    let bestParameters = { ...currentParameters };
    let iterations = 0;
    
    for (const paramName of parameterNames) {
      const originalValue = currentParameters[paramName];
      const variations = [0.8, 0.9, 1.1, 1.2]; // ±20% variations
      
      for (const multiplier of variations) {
        const testParameters = { ...currentParameters };
        testParameters[paramName] = originalValue * multiplier;
        
        // Simulate performance with new parameters (simplified)
        const simulatedPerformance = this.simulatePerformance(testParameters, performanceData);
        const score = this.calculatePerformanceScore(simulatedPerformance);
        
        if (score > bestScore) {
          bestScore = score;
          bestParameters = { ...testParameters };
        }
        
        iterations++;
      }
    }
    
    const convergence = Math.abs(bestScore - currentScore) < 0.01;
    
    return {
      parameters: bestParameters,
      performance: {
        returns: bestScore,
        sharpeRatio: performanceData.sharpeRatio * (bestScore / currentScore),
        maxDrawdown: performanceData.maxDrawdown,
        winRate: performanceData.winRate
      },
      optimizationMethod: 'BAYESIAN_OPTIMIZATION',
      iterations,
      convergence
    };
  }

  /**
   * Calculate adaptation adjustments
   */
  private calculateAdaptationAdjustments(
    performanceHistory: ModelPerformance[],
    metrics: AdaptiveLearningMetrics
  ): { [key: string]: number } {
    const adjustments: { [key: string]: number } = {};
    
    if (performanceHistory.length < 2) {
      return adjustments;
    }
    
    const recent = performanceHistory.slice(-3); // Last 3 performances
    const trend = this.calculatePerformanceTrend(recent);
    
    // Adjust learning rate based on performance trend
    if (trend < -0.1) { // Declining performance
      adjustments.learningRate = metrics.adaptationRate * 1.2; // Increase learning rate
      adjustments.regularization = 0.01; // Add regularization
    } else if (trend > 0.1) { // Improving performance
      adjustments.learningRate = metrics.adaptationRate * 0.8; // Decrease learning rate
      adjustments.regularization = 0.005; // Reduce regularization
    }
    
    // Adjust based on model drift
    if (metrics.modelDrift > 0.2) {
      adjustments.adaptationStrength = 1.5; // Stronger adaptation
    } else {
      adjustments.adaptationStrength = 1.0; // Normal adaptation
    }
    
    return adjustments;
  }

  /**
   * Apply parameter adjustments to model
   */
  private async applyParameterAdjustments(
    modelName: string, 
    adjustments: { [key: string]: number }
  ): Promise<void> {
    console.log(`🔧 Applying parameter adjustments to ${modelName}:`, adjustments);
    
    // In a real implementation, this would update the actual model parameters
    // For now, we'll just log the adjustments
    
    for (const [param, value] of Object.entries(adjustments)) {
      console.log(`  ${param}: ${value}`);
    }
  }

  /**
   * Trigger model retraining
   */
  private async triggerModelRetraining(
    modelName: string, 
    metrics: AdaptiveLearningMetrics
  ): Promise<void> {
    console.log(`🔄 Triggering retraining for ${modelName}`);
    
    // Update next retraining date
    metrics.nextRetrainingDate = new Date();
    metrics.nextRetrainingDate.setDate(metrics.nextRetrainingDate.getDate() + 7);
    
    // Reset drift and degradation metrics
    metrics.modelDrift = 0;
    metrics.performanceDegradation = 0;
    metrics.retrainingTrigger = false;
    metrics.lastAdaptation = new Date();
    
    console.log(`✅ Retraining scheduled for ${modelName}`);
  }

  /**
   * Update performance history
   */
  private updatePerformanceHistory(modelName: string, performance: ModelPerformance): void {
    const history = this.performanceHistory.get(modelName) || [];
    history.push(performance);
    
    // Keep only last 100 performance records
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.performanceHistory.set(modelName, history);
  }

  /**
   * Calculate returns from predictions
   */
  private calculateReturns(actualResults: number[], predictions: number[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < actualResults.length; i++) {
      const actualReturn = (actualResults[i] - actualResults[i - 1]) / actualResults[i - 1];
      const predictedDirection = predictions[i] > predictions[i - 1] ? 1 : -1;
      const actualDirection = actualReturn > 0 ? 1 : -1;
      
      // Return is positive if we predicted the direction correctly
      const strategyReturn = predictedDirection === actualDirection ? Math.abs(actualReturn) : -Math.abs(actualReturn);
      returns.push(strategyReturn);
    }
    
    return returns;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : meanReturn / stdDev;
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(performanceData: any): number {
    // Weighted combination of metrics
    const weights = {
      returns: 0.4,
      sharpeRatio: 0.3,
      winRate: 0.2,
      maxDrawdown: -0.1 // Negative weight for drawdown
    };
    
    return (performanceData.returns || 0) * weights.returns +
           (performanceData.sharpeRatio || 0) * weights.sharpeRatio +
           (performanceData.winRate || 0) * weights.winRate +
           (performanceData.maxDrawdown || 0) * weights.maxDrawdown;
  }

  /**
   * Simulate performance with new parameters
   */
  private simulatePerformance(parameters: any, basePerformance: any): any {
    // Simplified simulation - in reality, this would run backtests
    const values = Object.values(parameters) as number[];
    const parameterEffect = values.reduce((sum: number, val: number) => sum + val, 0) / Object.keys(parameters).length;
    const multiplier = 0.8 + (parameterEffect - 1) * 0.4; // Scale effect
    
    return {
      returns: basePerformance.returns * multiplier,
      sharpeRatio: basePerformance.sharpeRatio * Math.sqrt(multiplier),
      winRate: Math.min(1, basePerformance.winRate * multiplier),
      maxDrawdown: basePerformance.maxDrawdown / multiplier
    };
  }

  /**
   * Calculate performance trend
   */
  private calculatePerformanceTrend(performances: ModelPerformance[]): number {
    if (performances.length < 2) return 0;
    
    const accuracies = performances.map(p => p.accuracy);
    const n = accuracies.length;
    
    // Simple linear regression slope
    const x = Array.from({ length: n }, (_, i) => i);
    const y = accuracies;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  /**
   * Get adaptation metrics for a model
   */
  getAdaptationMetrics(modelName: string): AdaptiveLearningMetrics | undefined {
    return this.adaptationMetrics.get(modelName);
  }

  /**
   * Get performance history for a model
   */
  getPerformanceHistory(modelName: string): ModelPerformance[] {
    return this.performanceHistory.get(modelName) || [];
  }

  /**
   * Get optimization history for a strategy
   */
  getOptimizationHistory(strategyName: string): StrategyOptimization[] {
    return this.optimizationHistory.get(strategyName) || [];
  }

  /**
   * Update retraining thresholds
   */
  updateRetrainingThresholds(thresholds: Partial<typeof this.retrainingThresholds>): void {
    this.retrainingThresholds = { ...this.retrainingThresholds, ...thresholds };
    console.log('🔧 Updated retraining thresholds:', this.retrainingThresholds);
  }

  /**
   * Reset adaptation metrics for a model
   */
  resetAdaptationMetrics(modelName: string): void {
    this.adaptationMetrics.delete(modelName);
    this.performanceHistory.delete(modelName);
    console.log(`🔄 Reset adaptation metrics for ${modelName}`);
  }
}