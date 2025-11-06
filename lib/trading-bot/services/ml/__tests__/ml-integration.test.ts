import { test, expect } from 'vitest';
import { MLIntegrationService } from '../ml-integration-service';
import { PriceData } from '../ml-types';

const generateMockPriceData = (count: number): PriceData[] => {
  const data: PriceData[] = [];
  let basePrice = 50000;
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 0.02; // ±1% change
    basePrice *= (1 + change);
    
    data.push({
      timestamp: Date.now() - (count - i) * 60000, // 1 minute intervals
      open: basePrice * 0.999,
      high: basePrice * 1.002,
      low: basePrice * 0.998,
      close: basePrice,
      volume: Math.random() * 1000000
    });
  }
  
  return data;
};

test('ML Integration Service should analyze symbol and return comprehensive results', async () => {
  const mlService = new MLIntegrationService();
  const mockData = generateMockPriceData(100);
  
  const analysis = await mlService.analyzeSymbol('BTCUSDT', mockData);
  
  expect(analysis).toBeDefined();
  expect(analysis.prediction).toBeDefined();
  expect(analysis.patterns).toBeDefined();
  expect(analysis.supportResistance).toBeDefined();
  expect(analysis.reversals).toBeDefined();
  expect(analysis.confidence).toBeGreaterThan(0);
  expect(analysis.confidence).toBeLessThanOrEqual(1);
  expect(['BUY', 'SELL', 'HOLD']).toContain(analysis.recommendation);
  expect(Array.isArray(analysis.reasoning)).toBe(true);
  
  mlService.cleanup();
});

test('ML Integration Service should get ML metrics', () => {
  const mlService = new MLIntegrationService();
  
  const metrics = mlService.getMLMetrics();
  
  expect(metrics).toBeDefined();
  expect(metrics.modelPerformances).toBeDefined();
  expect(metrics.adaptationMetrics).toBeDefined();
  expect(metrics.analysisStats).toBeDefined();
  expect(typeof metrics.analysisStats.totalAnalyses).toBe('number');
  expect(typeof metrics.analysisStats.cacheHitRate).toBe('number');
  expect(typeof metrics.analysisStats.averageAnalysisTime).toBe('number');
  
  mlService.cleanup();
});