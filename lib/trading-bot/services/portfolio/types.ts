export interface Asset {
  symbol: string;
  price: number;
  marketCap: number;
  volume24h: number;
  volatility: number;
  beta: number;
}

export interface PortfolioAllocation {
  symbol: string;
  targetWeight: number;
  currentWeight: number;
  targetAmount: number;
  currentAmount: number;
  rebalanceAmount: number;
}

export interface CorrelationMatrix {
  [symbol: string]: {
    [symbol: string]: number;
  };
}

export interface RiskParityWeights {
  [symbol: string]: number;
}

export interface OptimizationConstraints {
  minWeight: number;
  maxWeight: number;
  maxAssets: number;
  targetVolatility?: number;
  minExpectedReturn?: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  diversificationRatio: number;
  maxDrawdown: number;
}

export interface OrderExecution {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  orderType: 'market' | 'limit' | 'iceberg' | 'twap';
  status: 'pending' | 'partial' | 'filled' | 'cancelled';
  executedAmount: number;
  averagePrice: number;
  timestamp: Date;
}

export interface IcebergOrderConfig {
  totalAmount: number;
  sliceSize: number;
  priceRange: number;
  timeInterval: number;
}

export interface TWAPOrderConfig {
  totalAmount: number;
  duration: number; // in minutes
  intervals: number;
  priceLimit?: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}

export interface DrawdownPeriod {
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  drawdown: number; // percentage
  recovery: number; // percentage
}