// Enhanced Market Data Types for Whale Detection
// Requirements: Advanced whale manipulation detection and risk management

export interface EnhancedMarketData {
  // Existing basic data
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: string;

  // ===== FUTURES MARKET DATA =====
  futuresData: {
    openInterest: number;           // Total kontrak terbuka
    openInterestChange24h: number;  // Perubahan OI dalam %
    fundingRate: number;            // Current funding rate
    fundingRateHistory: number[];   // 4 periode terakhir
    nextFundingTime: string;
    longShortRatio: number;         // Ratio long vs short (>1 = bullish, <1 = bearish)
    topTraderLongShortRatio: number; // Top trader sentiment
    topTraderLongShortAccountRatio: number;
  };

  // ===== LIQUIDATION DATA =====
  liquidationData: {
    liquidations24h: {
      totalLongs: number;           // Total long liquidated (USD)
      totalShorts: number;          // Total short liquidated (USD)
      netLiquidation: number;       // Net (positive = more longs liquidated)
    };
    recentLiquidations: Array<{
      side: 'LONG' | 'SHORT';
      value: number;
      price: number;
      timestamp: string;
    }>;
    liquidationHeatmap: {
      liquidationClusters: Array<{
        price: number;
        liquidity: number;
        side: 'LONG' | 'SHORT';
      }>;
    };
  };

  // ===== VOLUME ANALYSIS =====
  volumeAnalysis: {
    cvd: number;                    // Cumulative Volume Delta
    cvdChange24h: number;           // Perubahan CVD
    spotVolume24h: number;          // Volume spot
    futuresVolume24h: number;       // Volume futures
    volumeRatio: number;            // Futures/Spot ratio
    buyVolume: number;              // Aggressive buy volume
    sellVolume: number;             // Aggressive sell volume
    deltaPressure: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // BUY atau SELL pressure dominan
  };

  // ===== ORDER BOOK ANALYSIS =====
  orderBookData: {
    bidAskImbalance: number;        // Ratio bids/asks (>1 = buy pressure)
    bigWalls: Array<{
      side: 'BID' | 'ASK';
      price: number;
      size: number;
      isSpoof: boolean;
    }>;
    spoofingDetected: boolean;
    spoofingDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    liquidityVacuum: boolean;       // Tiba-tiba liquidity hilang
  };

  // ===== ON-CHAIN DATA =====
  onChainData: {
    exchangeNetflow: number;        // Negative = outflow (bullish), Positive = inflow (bearish)
    whaleTransactions: Array<{
      type: 'INFLOW' | 'OUTFLOW';
      amount: number;
      exchange: string;
      timestamp: string;
    }>;
    largeTransactions24h: number;   // Jumlah transaksi whale (>100 BTC)
  };

  // ===== MARKET STRUCTURE =====
  marketStructure: {
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    support: number[];              // Support levels
    resistance: number[];           // Resistance levels
    keyLevel: number;               // Level krusial (round number psychology)
    breakoutPotential: 'LOW' | 'MEDIUM' | 'HIGH';
    volumeProfile: {
      poc: number;                  // Point of Control (volume tertinggi)
      vah: number;                  // Value Area High
      val: number;                  // Value Area Low
    };
  };

  // ===== BASIS & ARBITRAGE =====
  basisData: {
    spotPrice: number;
    futuresPrice: number;
    basis: number;                  // Futures premium
    basisPercentage: number;        // Percentage (positive = contango, negative = backwardation)
    annualizedBasis: number;        // Annualized basis %
  };
}

export interface WhaleManipulationAnalysis {
  setupScore: number;               // 0-100%
  triggerScore: number;             // 0-100%
  executionScore: number;           // 0-100%
  currentPhase: 'NONE' | 'SETUP' | 'TRIGGER' | 'EXECUTION' | 'FLUSH' | 'RE_ENTRY';
  reasoning: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface EnhancedTradingDecision {
  // Basic decision
  action: 'BUY' | 'SELL' | 'HOLD' | 'CLOSE_ALL';
  confidence: number;
  reasoning: string;
  
  // Enhanced fields
  whaleManipulation: WhaleManipulationAnalysis;
  entryPrice: number | null;
  stopLoss: number;
  takeProfit: number[];             // Multi-level TP
  positionSize: string;             // Percentage of balance
  recommendedLeverage: number;      // 1-5x based on risk
  
  // Technical indicators
  technicalIndicators: {
    rsi: number;
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
    support: number[];
    resistance: number[];
    keyLevel: number;
    volumeProfile: {
      poc: number;
      trend: 'INCREASING' | 'DECREASING' | 'STABLE';
    };
  };
  
  // Risk assessment
  riskAssessment: {
    volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    manipulationRisk: string;
    liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    fundingRateRisk: 'NORMAL' | 'ELEVATED' | 'EXTREME';
    leverageWarning: string;
    exitStrategy: string;
  };
  
  // Alerts
  alerts: Array<{
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    action: string;
  }>;
  
  // Market context
  marketContext: {
    spotVsFutures: 'ALIGNED' | 'DIVERGENCE' | 'EXTREME_CONTANGO' | 'BACKWARDATION';
    institutionalFlow: 'BUYING' | 'SELLING' | 'NEUTRAL';
    retailSentiment: 'GREEDY' | 'FEARFUL' | 'NEUTRAL';
    whaleActivity: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL';
  };
  
  modelUsed: string;
  timestamp: string;
  symbol: string;
}