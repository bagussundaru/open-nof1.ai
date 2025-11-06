// Machine Learning Types and Interfaces

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MLFeatures {
  price: number[];
  volume: number[];
  rsi: number[];
  macd: number[];
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  sma: number[];
  ema: number[];
  volatility: number[];
}

export interface PricePrediction {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  predictions: {
    '1h': number;
    '4h': number;
    '1d': number;
  };
  confidence: number;
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
  probability: {
    up: number;
    down: number;
    sideways: number;
  };
  modelUsed: string;
  features: MLFeatures;
}

export interface ModelPerformance {
  modelName: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse: number; // Mean Squared Error
  mae: number; // Mean Absolute Error
  sharpeRatio: number;
  totalPredictions: number;
  correctPredictions: number;
  lastUpdated: Date;
}

export interface EnsembleModel {
  models: MLModel[];
  weights: number[];
  combinationMethod: 'weighted_average' | 'voting' | 'stacking';
}

export interface MLModel {
  name: string;
  type: 'LSTM' | 'GRU' | 'TRANSFORMER' | 'LINEAR_REGRESSION' | 'RANDOM_FOREST' | 'SVM';
  parameters: any;
  performance: ModelPerformance;
  isActive: boolean;
  lastTrained: Date;
  trainingData: {
    startDate: Date;
    endDate: Date;
    samples: number;
  };
}

export interface TrainingConfig {
  lookbackPeriods: number;
  predictionHorizons: number[];
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  features: string[];
}

export interface CandlestickPattern {
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reliability: number;
  strength: number;
  position: number; // Index in the data array
  description: string;
}

export interface SupportResistanceLevel {
  level: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number;
  touches: number;
  lastTouch: Date;
  confidence: number;
}

export interface TrendReversalSignal {
  type: 'BULLISH_REVERSAL' | 'BEARISH_REVERSAL';
  confidence: number;
  patterns: CandlestickPattern[];
  indicators: {
    divergence: boolean;
    oversold: boolean;
    overbought: boolean;
    volumeConfirmation: boolean;
  };
  targetPrice: number;
  stopLoss: number;
}

export interface AdaptiveLearningMetrics {
  modelDrift: number;
  performanceDegradation: number;
  retrainingTrigger: boolean;
  adaptationRate: number;
  lastAdaptation: Date;
  nextRetrainingDate: Date;
}

export interface StrategyOptimization {
  parameters: { [key: string]: number };
  performance: {
    returns: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  optimizationMethod: 'GENETIC_ALGORITHM' | 'BAYESIAN_OPTIMIZATION' | 'GRID_SEARCH';
  iterations: number;
  convergence: boolean;
}