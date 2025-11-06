// Core Trading Bot Types and Interfaces

// Error Classes
export class NebiusError extends Error {
  public code: string;
  public statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'NebiusError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Configuration Interfaces
export interface NebiusConfig {
  apiUrl: string;
  jwtToken: string;
  model: string;
  maxRetries: number;
  timeout: number;
}

export interface GateConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  testnet: boolean;
}

export interface RiskConfig {
  maxDailyLoss: number;
  maxPositionSize: number;
  stopLossPercentage: number;
  maxOpenPositions: number;
  emergencyStopEnabled: boolean;
}

export interface AdvancedRiskConfig extends RiskConfig {
  // Dynamic stop-loss settings
  baseStopLossPercentage: number;
  volatilityMultiplier: number;
  maxStopLossPercentage: number;
  minStopLossPercentage: number;
  
  // Correlation settings
  maxCorrelationThreshold: number;
  correlationLookbackPeriod: number;
  
  // Drawdown protection
  maxDrawdownPercentage: number;
  drawdownStopTradingThreshold: number;
  drawdownRecoveryThreshold: number;
}

export interface VolatilityMetrics {
  symbol: string;
  volatility: number;
  averageVolatility: number;
  volatilityPercentile: number;
  timestamp: Date;
}

export interface CorrelationMatrix {
  [symbol: string]: {
    [otherSymbol: string]: number;
  };
}

export interface DrawdownMetrics {
  currentDrawdown: number;
  maxDrawdown: number;
  peakValue: number;
  currentValue: number;
  drawdownDuration: number;
  recoveryTime?: number;
}

export interface TradingBotConfig {
  nebius: NebiusConfig;
  gate: GateConfig;
  risk: RiskConfig;
  tradingPairs: string[];
  marketDataUpdateInterval: number;
}

// Market Data Interfaces
export interface OrderBookLevel {
  price: number;
  amount: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  movingAverage: number;
}

export interface MarketData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  orderBook: OrderBook;
  indicators: TechnicalIndicators;
}

// Trading Signal Interfaces
export interface TradingSignal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  timestamp: Date;
}

// Position and Trade Interfaces
export interface TradingPosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  timestamp: Date;
  status: 'open' | 'closed';
}

export interface TradeExecution {
  id: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  fee: number;
  status: 'pending' | 'filled' | 'cancelled';
  timestamp: Date;
}

// Service Interfaces
export interface NebiusAIService {
  authenticate(): Promise<boolean>;
  analyzeMarket(marketData: MarketData): Promise<TradingSignal>;
  getTradeRecommendation(analysis: any): Promise<TradingSignal>;
  handleRateLimit(): Promise<void>;
}

export interface GateExchangeService {
  authenticate(): Promise<boolean>;
  getMarketData(symbol: string): Promise<MarketData>;
  getAccountBalance(): Promise<any>;
  placeBuyOrder(symbol: string, amount: number, price: number): Promise<TradeExecution>;
  placeSellOrder(symbol: string, amount: number, price: number): Promise<TradeExecution>;
  getOpenPositions(): Promise<TradingPosition[]>;
  cancelOrder(orderId: string): Promise<boolean>;
}

export interface RiskManagementService {
  validateTrade(tradeRequest: any): Promise<boolean>;
  calculatePositionSize(signal: TradingSignal, balance: number): number;
  checkStopLoss(position: TradingPosition): boolean;
  enforceRiskLimits(): Promise<void>;
  emergencyStop(): Promise<void>;
  getRiskStatus(): {
    emergencyStopActive: boolean;
    dailyLoss: number;
    openPositions: number;
    dailyLossLimit: number;
    maxPositions: number;
  };
}

export interface MarketDataService {
  subscribeToMarket(symbol: string): Promise<void>;
  processTickData(tick: any): Promise<void>;
  calculateIndicators(history: number[]): TechnicalIndicators;
  validateDataIntegrity(data: MarketData): boolean;
}

// Trading Engine Interface
export interface TradingEngine {
  startTrading(): Promise<void>;
  stopTrading(): Promise<void>;
  processMarketData(data: MarketData): Promise<void>;
  executeTradeSignal(signal: TradingSignal): Promise<void>;
  updatePositions(): Promise<void>;
}

// Error Handling Interfaces
export interface NebiusError extends Error {
  code: string;
  statusCode?: number;
}

export interface GateError extends Error {
  code: string;
  statusCode?: number;
}

export interface NetworkError extends Error {
  code: string;
  retryable: boolean;
}

export interface ErrorHandler {
  handleNebiusError(error: NebiusError): void;
  handleGateError(error: GateError): void;
  handleNetworkError(error: NetworkError): void;
  logError(error: Error, context: string): void;
}

// Notification and Monitoring Interfaces
export interface NotificationService {
  sendAlert(message: string, severity: 'info' | 'warning' | 'error'): Promise<void>;
  sendTradingUpdate(position: TradingPosition): Promise<void>;
  sendSystemStatus(status: string): Promise<void>;
}

export interface PerformanceMetrics {
  totalTrades: number;
  profitLoss: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  uptime: number;
}

export interface MonitoringService {
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  logTradingActivity(activity: string, data: any): void;
  trackSystemHealth(): Promise<void>;
}