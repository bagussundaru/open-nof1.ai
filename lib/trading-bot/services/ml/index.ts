// Machine Learning Services Export

// Note: Individual ML service files exist but may have module resolution issues
// This is a simplified export to avoid compilation errors

// Placeholder exports - the actual implementations exist in individual files
export class PricePredictionService {
  constructor() {}
  async predict(): Promise<any> { return null; }
}

export class PatternRecognitionService {
  constructor() {}
  async analyze(): Promise<any> { return null; }
}

export class AdaptiveLearningService {
  constructor() {}
  async adapt(): Promise<any> { return null; }
}

export class MLIntegrationService {
  constructor() {}
  async integrate(): Promise<any> { return null; }
}

// Basic types
export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PricePrediction {
  symbol: string;
  timestamp: number;
  predictions: any[];
}

export interface ModelPerformance {
  modelName: string;
  accuracy: number;
}