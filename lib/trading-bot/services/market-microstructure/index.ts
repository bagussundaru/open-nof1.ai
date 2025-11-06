// Market Microstructure Analysis Services
// Exports all market microstructure analysis components

import { 
  OrderBookAnalyzer,
  OrderBookImbalance,
  MarketDepthMetrics,
  LiquidityAssessment,
  OrderBookAnalysisConfig
} from './order-book-analyzer';

import {
  TradeFlowAnalyzer,
  TradeData,
  VolumeProfile,
  MarketMakerTakerFlow,
  InstitutionalFlow,
  TradeFlowConfig
} from './trade-flow-analyzer';

import {
  LatencyOptimizer,
  LatencyMetrics,
  OptimizedOrderRequest,
  OrderExecutionResult,
  LatencyOptimizationConfig,
  NetworkConnection
} from './latency-optimizer';

// Re-export all types and classes
export { OrderBookAnalyzer };
export type {
  OrderBookImbalance,
  MarketDepthMetrics,
  LiquidityAssessment,
  OrderBookAnalysisConfig
};

export { TradeFlowAnalyzer };
export type {
  TradeData,
  VolumeProfile,
  MarketMakerTakerFlow,
  InstitutionalFlow,
  TradeFlowConfig
};

export { LatencyOptimizer };
export type {
  LatencyMetrics,
  OptimizedOrderRequest,
  OrderExecutionResult,
  LatencyOptimizationConfig,
  NetworkConnection
};

// Combined market microstructure service
export class MarketMicrostructureService {
  private orderBookAnalyzer: OrderBookAnalyzer;
  private tradeFlowAnalyzer: TradeFlowAnalyzer;
  private latencyOptimizer: LatencyOptimizer;

  constructor(
    orderBookConfig: OrderBookAnalysisConfig,
    tradeFlowConfig: TradeFlowConfig,
    latencyConfig: LatencyOptimizationConfig
  ) {
    this.orderBookAnalyzer = new OrderBookAnalyzer(orderBookConfig);
    this.tradeFlowAnalyzer = new TradeFlowAnalyzer(tradeFlowConfig);
    this.latencyOptimizer = new LatencyOptimizer(latencyConfig);
  }

  getOrderBookAnalyzer(): OrderBookAnalyzer {
    return this.orderBookAnalyzer;
  }

  getTradeFlowAnalyzer(): TradeFlowAnalyzer {
    return this.tradeFlowAnalyzer;
  }

  getLatencyOptimizer(): LatencyOptimizer {
    return this.latencyOptimizer;
  }

  async cleanup(): Promise<void> {
    this.latencyOptimizer.cleanup();
  }
}