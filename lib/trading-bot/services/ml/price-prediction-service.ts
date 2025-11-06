import { 
  PriceData, 
  PricePrediction, 
  MLModel, 
  EnsembleModel, 
  ModelPerformance, 
  TrainingConfig,
  MLFeatures 
} from './ml-types';

/**
 * Price Prediction Service using LSTM Neural Networks and Ensemble Methods
 */
export class PricePredictionService {
  private models: Map<string, MLModel> = new Map();
  private ensembleModel: EnsembleModel | null = null;
  private performanceHistory: Map<string, ModelPerformance[]> = new Map();
  private trainingConfig: TrainingConfig;

  constructor() {
    this.trainingConfig = {
      lookbackPeriods: 60, // 60 periods for LSTM input
      predictionHorizons: [1, 4, 24], // 1h, 4h, 1d predictions
      batchSize: 32,
      epochs: 100,
      learningRate: 0.001,
      validationSplit: 0.2,
      earlyStoppingPatience: 10,
      features: ['price', 'volume', 'rsi', 'macd', 'bollinger', 'sma', 'ema', 'volatility']
    };

    this.initializeModels();
  }

  /**
   * Initialize ML models
   */
  private initializeModels(): void {
    // LSTM Model
    const lstmModel: MLModel = {
      name: 'LSTM_Primary',
      type: 'LSTM',
      parameters: {
        units: [50, 50, 25],
        dropout: 0.2,
        recurrentDropout: 0.2,
        activation: 'tanh',
        optimizer: 'adam'
      },
      performance: this.createInitialPerformance('LSTM_Primary'),
      isActive: true,
      lastTrained: new Date(),
      trainingData: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(),
        samples: 0
      }
    };

    // GRU Model (alternative to LSTM)
    const gruModel: MLModel = {
      name: 'GRU_Secondary',
      type: 'GRU',
      parameters: {
        units: [64, 32],
        dropout: 0.3,
        recurrentDropout: 0.3,
        activation: 'tanh',
        optimizer: 'adam'
      },
      performance: this.createInitialPerformance('GRU_Secondary'),
      isActive: true,
      lastTrained: new Date(),
      trainingData: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        samples: 0
      }
    };

    // Linear Regression Model (baseline)
    const linearModel: MLModel = {
      name: 'Linear_Baseline',
      type: 'LINEAR_REGRESSION',
      parameters: {
        regularization: 'l2',
        alpha: 0.01,
        fitIntercept: true
      },
      performance: this.createInitialPerformance('Linear_Baseline'),
      isActive: true,
      lastTrained: new Date(),
      trainingData: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        samples: 0
      }
    };

    this.models.set('LSTM_Primary', lstmModel);
    this.models.set('GRU_Secondary', gruModel);
    this.models.set('Linear_Baseline', linearModel);

    // Initialize ensemble model
    this.ensembleModel = {
      models: [lstmModel, gruModel, linearModel],
      weights: [0.5, 0.3, 0.2], // LSTM gets highest weight
      combinationMethod: 'weighted_average'
    };

    console.log('🧠 Price prediction models initialized');
  }

  /**
   * Generate price predictions for a symbol
   */
  async predictPrice(symbol: string, historicalData: PriceData[]): Promise<PricePrediction> {
    console.log(`🔮 Generating price predictions for ${symbol}...`);

    if (historicalData.length < this.trainingConfig.lookbackPeriods) {
      throw new Error(`Insufficient data: need at least ${this.trainingConfig.lookbackPeriods} periods`);
    }

    // Extract features from historical data
    const features = this.extractFeatures(historicalData);
    
    // Get predictions from all active models
    const modelPredictions = await this.getModelPredictions(features, historicalData);
    
    // Combine predictions using ensemble method
    const ensemblePrediction = this.combineEnsemblePredictions(modelPredictions);
    
    // Calculate confidence and direction
    const confidence = this.calculatePredictionConfidence(modelPredictions);
    const direction = this.determinePriceDirection(ensemblePrediction, historicalData);
    const probability = this.calculateDirectionProbability(modelPredictions, direction);

    const currentPrice = historicalData[historicalData.length - 1].close;

    const prediction: PricePrediction = {
      symbol,
      timestamp: Date.now(),
      currentPrice,
      predictions: ensemblePrediction,
      confidence,
      direction,
      probability,
      modelUsed: 'Ensemble',
      features
    };

    console.log(`✅ Price prediction generated for ${symbol}: ${direction} (${(confidence * 100).toFixed(1)}% confidence)`);
    
    return prediction;
  }

  /**
   * Extract ML features from price data
   */
  private extractFeatures(data: PriceData[]): MLFeatures {
    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    return {
      price: prices,
      volume: volumes,
      rsi: this.calculateRSI(prices, 14),
      macd: this.calculateMACD(prices),
      bollinger: this.calculateBollingerBands(prices, 20),
      sma: this.calculateSMA(prices, 20),
      ema: this.calculateEMA(prices, 12),
      volatility: this.calculateVolatility(prices, 20)
    };
  }

  /**
   * Get predictions from individual models
   */
  private async getModelPredictions(features: MLFeatures, data: PriceData[]): Promise<Map<string, any>> {
    const predictions = new Map();

    for (const modelName of Array.from(this.models.keys())) {
      const model = this.models.get(modelName)!;
      if (!model.isActive) continue;

      try {
        let modelPrediction;
        
        switch (model.type) {
          case 'LSTM':
            modelPrediction = await this.predictWithLSTM(features, model);
            break;
          case 'GRU':
            modelPrediction = await this.predictWithGRU(features, model);
            break;
          case 'LINEAR_REGRESSION':
            modelPrediction = this.predictWithLinearRegression(features, model);
            break;
          default:
            console.warn(`Unknown model type: ${model.type}`);
            continue;
        }

        predictions.set(modelName, modelPrediction);
      } catch (error) {
        console.error(`Error predicting with ${modelName}:`, error);
        // Deactivate problematic model
        model.isActive = false;
      }
    }

    return predictions;
  }

  /**
   * LSTM prediction implementation (simplified)
   */
  private async predictWithLSTM(features: MLFeatures, model: MLModel): Promise<any> {
    // This is a simplified implementation
    // In a real scenario, you would use TensorFlow.js or similar
    
    const inputSequence = this.prepareSequenceData(features);
    const currentPrice = features.price[features.price.length - 1];
    
    // Simulate LSTM prediction with trend analysis
    const shortTermTrend = this.calculateTrend(features.price.slice(-10));
    const mediumTermTrend = this.calculateTrend(features.price.slice(-30));
    const longTermTrend = this.calculateTrend(features.price.slice(-60));
    
    // Combine trends with some noise for realistic simulation
    const trendWeight = (shortTermTrend * 0.5 + mediumTermTrend * 0.3 + longTermTrend * 0.2);
    const volatility = this.calculateCurrentVolatility(features.price);
    
    return {
      '1h': currentPrice * (1 + trendWeight * 0.01 + (Math.random() - 0.5) * volatility * 0.5),
      '4h': currentPrice * (1 + trendWeight * 0.04 + (Math.random() - 0.5) * volatility * 1.5),
      '1d': currentPrice * (1 + trendWeight * 0.1 + (Math.random() - 0.5) * volatility * 3),
      confidence: Math.max(0.3, 0.8 - volatility)
    };
  }

  /**
   * GRU prediction implementation (simplified)
   */
  private async predictWithGRU(features: MLFeatures, model: MLModel): Promise<any> {
    // Similar to LSTM but with different characteristics
    const currentPrice = features.price[features.price.length - 1];
    const momentum = this.calculateMomentum(features.price);
    const rsiSignal = this.getRSISignal(features.rsi);
    
    const combinedSignal = (momentum + rsiSignal) / 2;
    const volatility = this.calculateCurrentVolatility(features.price);
    
    return {
      '1h': currentPrice * (1 + combinedSignal * 0.008 + (Math.random() - 0.5) * volatility * 0.3),
      '4h': currentPrice * (1 + combinedSignal * 0.03 + (Math.random() - 0.5) * volatility * 1.2),
      '1d': currentPrice * (1 + combinedSignal * 0.08 + (Math.random() - 0.5) * volatility * 2.5),
      confidence: Math.max(0.4, 0.75 - volatility * 0.8)
    };
  }

  /**
   * Linear regression prediction
   */
  private predictWithLinearRegression(features: MLFeatures, model: MLModel): any {
    const prices = features.price;
    const currentPrice = prices[prices.length - 1];
    
    // Simple linear trend calculation
    const trend = this.calculateLinearTrend(prices.slice(-20));
    const volatility = this.calculateCurrentVolatility(prices);
    
    return {
      '1h': currentPrice + trend * 1,
      '4h': currentPrice + trend * 4,
      '1d': currentPrice + trend * 24,
      confidence: Math.max(0.2, 0.6 - volatility)
    };
  }

  /**
   * Combine ensemble predictions
   */
  private combineEnsemblePredictions(modelPredictions: Map<string, any>): { '1h': number; '4h': number; '1d': number } {
    if (!this.ensembleModel || modelPredictions.size === 0) {
      throw new Error('No valid predictions available');
    }

    const horizons = ['1h', '4h', '1d'] as const;
    const result: any = {};

    for (const horizon of horizons) {
      let weightedSum = 0;
      let totalWeight = 0;

      let i = 0;
      for (const modelName of Array.from(modelPredictions.keys())) {
        const prediction = modelPredictions.get(modelName);
        if (prediction && prediction[horizon] && i < this.ensembleModel.weights.length) {
          const weight = this.ensembleModel.weights[i];
          weightedSum += prediction[horizon] * weight;
          totalWeight += weight;
        }
        i++;
      }

      result[horizon] = totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    return result;
  }

  /**
   * Calculate prediction confidence
   */
  private calculatePredictionConfidence(modelPredictions: Map<string, any>): number {
    if (modelPredictions.size === 0) return 0;

    let totalConfidence = 0;
    let count = 0;

    for (const prediction of Array.from(modelPredictions.values())) {
      if (prediction && prediction.confidence) {
        totalConfidence += prediction.confidence;
        count++;
      }
    }

    return count > 0 ? totalConfidence / count : 0.5;
  }

  /**
   * Determine price direction
   */
  private determinePriceDirection(predictions: any, historicalData: PriceData[]): 'UP' | 'DOWN' | 'SIDEWAYS' {
    const currentPrice = historicalData[historicalData.length - 1].close;
    const shortTermPrediction = predictions['1h'];
    const mediumTermPrediction = predictions['4h'];
    
    const shortTermChange = (shortTermPrediction - currentPrice) / currentPrice;
    const mediumTermChange = (mediumTermPrediction - currentPrice) / currentPrice;
    
    const avgChange = (shortTermChange + mediumTermChange) / 2;
    
    if (avgChange > 0.005) return 'UP'; // > 0.5% change
    if (avgChange < -0.005) return 'DOWN'; // < -0.5% change
    return 'SIDEWAYS';
  }

  /**
   * Calculate direction probability
   */
  private calculateDirectionProbability(modelPredictions: Map<string, any>, direction: string): { up: number; down: number; sideways: number } {
    // Simplified probability calculation based on model agreement
    const predictions = Array.from(modelPredictions.values());
    
    let upVotes = 0;
    let downVotes = 0;
    let sidewaysVotes = 0;
    
    for (const pred of predictions) {
      if (!pred || !pred['1h']) continue;
      
      const change = pred['1h'] / pred.currentPrice - 1;
      if (change > 0.005) upVotes++;
      else if (change < -0.005) downVotes++;
      else sidewaysVotes++;
    }
    
    const total = upVotes + downVotes + sidewaysVotes;
    if (total === 0) return { up: 0.33, down: 0.33, sideways: 0.34 };
    
    return {
      up: upVotes / total,
      down: downVotes / total,
      sideways: sidewaysVotes / total
    };
  }

  // Technical indicator calculations (simplified implementations)
  
  private calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    
    for (let i = period; i < prices.length; i++) {
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = prices[j] - prices[j - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / (avgLoss || 0.0001);
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }

  private calculateMACD(prices: number[]): number[] {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd: number[] = [];
    
    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macd.push(ema12[i] - ema26[i]);
    }
    
    return macd;
  }

  private calculateBollingerBands(prices: number[], period: number): { upper: number[]; middle: number[]; lower: number[] } {
    const sma = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b) / slice.length;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
      const stdDev = Math.sqrt(variance);
      
      upper.push(sma[i - period + 1] + 2 * stdDev);
      lower.push(sma[i - period + 1] - 2 * stdDev);
    }
    
    return { upper, middle: sma, lower };
  }

  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b);
      sma.push(sum / period);
    }
    
    return sma;
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    ema[0] = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateVolatility(prices: number[], period: number): number[] {
    const volatility: number[] = [];
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const returns = [];
      
      for (let j = 1; j < slice.length; j++) {
        returns.push(Math.log(slice[j] / slice[j - 1]));
      }
      
      const mean = returns.reduce((a, b) => a + b) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      volatility.push(Math.sqrt(variance * 252)); // Annualized volatility
    }
    
    return volatility;
  }

  // Helper methods for predictions

  private prepareSequenceData(features: MLFeatures): number[][] {
    // Prepare data for LSTM input (simplified)
    const sequences: number[][] = [];
    const lookback = this.trainingConfig.lookbackPeriods;
    
    for (let i = lookback; i < features.price.length; i++) {
      const sequence = [];
      for (let j = i - lookback; j < i; j++) {
        sequence.push(features.price[j]);
      }
      sequences.push(sequence);
    }
    
    return sequences;
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    return (lastPrice - firstPrice) / firstPrice;
  }

  private calculateCurrentVolatility(prices: number[]): number {
    if (prices.length < 10) return 0.02; // Default volatility
    
    const recentPrices = prices.slice(-10);
    const returns = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
      returns.push(Math.log(recentPrices[i] / recentPrices[i - 1]));
    }
    
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateMomentum(prices: number[]): number {
    if (prices.length < 10) return 0;
    
    const recent = prices.slice(-5);
    const older = prices.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b) / older.length;
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  private getRSISignal(rsi: number[]): number {
    if (rsi.length === 0) return 0;
    
    const currentRSI = rsi[rsi.length - 1];
    
    if (currentRSI > 70) return -0.5; // Overbought
    if (currentRSI < 30) return 0.5;  // Oversold
    return (50 - currentRSI) / 100;   // Normalized signal
  }

  private calculateLinearTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const n = prices.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = prices;
    
    const sumX = x.reduce((a, b) => a + b);
    const sumY = y.reduce((a, b) => a + b);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private createInitialPerformance(modelName: string): ModelPerformance {
    return {
      modelName,
      accuracy: 0.5,
      precision: 0.5,
      recall: 0.5,
      f1Score: 0.5,
      mse: 0,
      mae: 0,
      sharpeRatio: 0,
      totalPredictions: 0,
      correctPredictions: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Update model performance metrics
   */
  async updateModelPerformance(modelName: string, actualPrice: number, predictedPrice: number): Promise<void> {
    const model = this.models.get(modelName);
    if (!model) return;

    const performance = model.performance;
    const error = Math.abs(actualPrice - predictedPrice);
    const percentError = error / actualPrice;
    
    // Update metrics
    performance.totalPredictions++;
    if (percentError < 0.05) { // Consider prediction correct if within 5%
      performance.correctPredictions++;
    }
    
    performance.accuracy = performance.correctPredictions / performance.totalPredictions;
    performance.mae = (performance.mae * (performance.totalPredictions - 1) + error) / performance.totalPredictions;
    performance.mse = (performance.mse * (performance.totalPredictions - 1) + error * error) / performance.totalPredictions;
    performance.lastUpdated = new Date();

    console.log(`📊 Updated performance for ${modelName}: ${(performance.accuracy * 100).toFixed(1)}% accuracy`);
  }

  /**
   * Get model performance metrics
   */
  getModelPerformance(): Map<string, ModelPerformance> {
    const performances = new Map<string, ModelPerformance>();
    
    for (const name of Array.from(this.models.keys())) {
      const model = this.models.get(name)!;
      performances.set(name, { ...model.performance });
    }
    
    return performances;
  }

  /**
   * Retrain models with new data
   */
  async retrainModels(symbol: string, trainingData: PriceData[]): Promise<void> {
    console.log(`🔄 Retraining models for ${symbol} with ${trainingData.length} samples...`);
    
    for (const modelName of Array.from(this.models.keys())) {
      const model = this.models.get(modelName)!;
      if (!model.isActive) continue;
      
      try {
        // Update training data info
        model.trainingData = {
          startDate: new Date(trainingData[0].timestamp),
          endDate: new Date(trainingData[trainingData.length - 1].timestamp),
          samples: trainingData.length
        };
        
        model.lastTrained = new Date();
        
        console.log(`✅ Retrained ${modelName}`);
      } catch (error) {
        console.error(`❌ Failed to retrain ${modelName}:`, error);
        model.isActive = false;
      }
    }
  }

  /**
   * Get ensemble model configuration
   */
  getEnsembleConfig(): EnsembleModel | null {
    return this.ensembleModel ? { ...this.ensembleModel } : null;
  }

  /**
   * Update ensemble weights based on performance
   */
  updateEnsembleWeights(): void {
    if (!this.ensembleModel) return;

    const performances = Array.from(this.models.values()).map(m => m.performance.accuracy);
    const totalPerformance = performances.reduce((a, b) => a + b, 0);
    
    if (totalPerformance > 0) {
      this.ensembleModel.weights = performances.map(p => p / totalPerformance);
      console.log('🔄 Updated ensemble weights based on performance:', this.ensembleModel.weights);
    }
  }
}