// Enhanced Trading Configuration with Whale Protection
// Advanced risk management and whale manipulation filters

export interface EnhancedTradingConfig {
  // Existing basic configs
  maxPositions: number;
  riskPerTrade: number;
  maxLeverage: number;
  minConfidence: number;
  stopLossPercent: number;
  takeProfitPercent: number;

  // ===== WHALE MANIPULATION FILTERS =====
  whaleProtection: {
    // Block trading if these conditions are met
    blockTradingIf: {
      setupScoreThreshold: number;           // Block if setup score > 70%
      fundingRateMax: number;                // Block if funding > 0.10%
      longShortRatioMax: number;             // Block if ratio > 2.5
      openInterestSpikePercent: number;      // Block if OI spike > 15% without volume
      liquidationCascadeThreshold: number;   // Block if liquidation > $20M/hour
    };
    
    // Force close all positions if
    forceCloseIf: {
      executionScore: number;                // Dump imminent
      massiveLiquidation: number;            // >$50M liquidation
      fundingRateExtreme: number;            // Funding extreme
      liquidityVacuum: boolean;              // Order book empty
    };
    
    // Dynamic leverage based on manipulation risk
    dynamicLeverage: {
      safe: number;              // Normal market
      caution: number;           // Setup phase detected
      danger: number;            // Trigger phase
      extreme: number;           // Execution phase
    };
  };

  // ===== SMART ENTRY FILTERS =====
  entryFilters: {
    minVolumeIncrease: number;              // Volume must be 1.2x from average
    maxFundingRate: number;                 // Don't enter if funding > 0.08%
    cvdAlignment: boolean;                  // CVD must align with signal
    noRecentLiquidation: boolean;           // Avoid entry after big liquidation
    orderBookHealth: boolean;               // Order book must be stable
  };

  // ===== EXIT STRATEGY =====
  exitStrategy: {
    // Scale out strategy
    takeProfitLevels: Array<{
      percent: number;
      closePercent: number;
    }>;
    
    // Trailing stop when in profit
    trailingStop: {
      activationPercent: number;           // Active after 5% profit
      callbackRate: number;               // Trail 2% from peak
    };
    
    // Emergency exit conditions
    emergencyExit: {
      maxDrawdownPercent: number;          // Exit if drawdown > 10%
      consecutiveLosses: number;           // Exit if 3x loss in a row
      volatilitySpike: number;             // Exit if volatility spike 2x
    };
  };

  // ===== POSITION SIZING BASED ON RISK =====
  positionSizing: {
    baseRisk: number;                      // 2% base risk
    
    // Adjust based on market condition
    riskMultipliers: {
      lowVolatility: number;               // Normal size
      mediumVolatility: number;            // Reduce 25%
      highVolatility: number;              // Reduce 50%
      extremeVolatility: number;           // Reduce 75%
      
      // Whale manipulation adjustment
      noManipulation: number;
      setupPhase: number;                  // Reduce 50% during setup
      triggerPhase: number;                // Reduce 75% during trigger
      executionPhase: number;              // NO TRADING during execution
    };
  };
}

export const ENHANCED_TRADING_CONFIG: EnhancedTradingConfig = {
  // Existing configs
  maxPositions: 5,
  riskPerTrade: 0.02,
  maxLeverage: 10,
  minConfidence: 0.60,
  stopLossPercent: 0.05,
  takeProfitPercent: 0.10,

  // ===== WHALE PROTECTION =====
  whaleProtection: {
    blockTradingIf: {
      setupScoreThreshold: 70,           // Block if setup score > 70%
      fundingRateMax: 0.10,              // Block if funding > 0.10%
      longShortRatioMax: 2.5,            // Block if ratio > 2.5
      openInterestSpikePercent: 15,      // Block if OI spike > 15% without volume
      liquidationCascadeThreshold: 20000000, // Block if liquidation > $20M/hour
    },
    
    forceCloseIf: {
      executionScore: 80,                // Dump imminent
      massiveLiquidation: 50000000,      // >$50M liquidation
      fundingRateExtreme: 0.15,          // Funding extreme
      liquidityVacuum: true,             // Order book empty
    },
    
    dynamicLeverage: {
      safe: 5,              // Normal market
      caution: 3,           // Setup phase detected
      danger: 2,            // Trigger phase
      extreme: 1,           // Execution phase
    }
  },

  // ===== ENTRY FILTERS =====
  entryFilters: {
    minVolumeIncrease: 1.2,              // Volume must be 1.2x from average
    maxFundingRate: 0.08,                // Don't enter if funding > 0.08%
    cvdAlignment: true,                  // CVD must align with signal
    noRecentLiquidation: true,           // Avoid entry after big liquidation
    orderBookHealth: true,               // Order book must be stable
  },

  // ===== EXIT STRATEGY =====
  exitStrategy: {
    takeProfitLevels: [
      { percent: 0.05, closePercent: 0.33 },  // TP1: 5%, close 33%
      { percent: 0.10, closePercent: 0.33 },  // TP2: 10%, close 33%
      { percent: 0.15, closePercent: 0.34 },  // TP3: 15%, close 34%
    ],
    
    trailingStop: {
      activationPercent: 0.05,           // Active after 5% profit
      callbackRate: 0.02,                // Trail 2% from peak
    },
    
    emergencyExit: {
      maxDrawdownPercent: 0.10,          // Exit if drawdown > 10%
      consecutiveLosses: 3,              // Exit if 3x loss in a row
      volatilitySpike: 2.0,              // Exit if volatility spike 2x
    }
  },

  // ===== POSITION SIZING =====
  positionSizing: {
    baseRisk: 0.02,                      // 2% base risk
    
    riskMultipliers: {
      lowVolatility: 1.0,                // Normal size
      mediumVolatility: 0.75,            // Reduce 25%
      highVolatility: 0.50,              // Reduce 50%
      extremeVolatility: 0.25,           // Reduce 75%
      
      // Whale manipulation adjustment
      noManipulation: 1.0,
      setupPhase: 0.5,                   // Reduce 50% during setup
      triggerPhase: 0.25,                // Reduce 75% during trigger
      executionPhase: 0.0,               // NO TRADING during execution
    }
  }
};

/**
 * Get dynamic leverage based on whale manipulation risk
 */
export function getDynamicLeverage(manipulationPhase: string): number {
  const config = ENHANCED_TRADING_CONFIG.whaleProtection.dynamicLeverage;
  
  switch (manipulationPhase) {
    case 'NONE':
      return config.safe;
    case 'SETUP':
      return config.caution;
    case 'TRIGGER':
      return config.danger;
    case 'EXECUTION':
    case 'FLUSH':
      return config.extreme;
    default:
      return config.caution; // Conservative default
  }
}

/**
 * Get dynamic position size based on volatility and manipulation risk
 */
export function getDynamicPositionSize(
  volatility: string, 
  manipulationPhase: string,
  baseBalance: number
): number {
  const config = ENHANCED_TRADING_CONFIG.positionSizing;
  let multiplier = config.riskMultipliers.noManipulation;
  
  // Apply volatility multiplier
  switch (volatility) {
    case 'LOW':
      multiplier *= config.riskMultipliers.lowVolatility;
      break;
    case 'MEDIUM':
      multiplier *= config.riskMultipliers.mediumVolatility;
      break;
    case 'HIGH':
      multiplier *= config.riskMultipliers.highVolatility;
      break;
    case 'EXTREME':
      multiplier *= config.riskMultipliers.extremeVolatility;
      break;
  }
  
  // Apply manipulation risk multiplier
  switch (manipulationPhase) {
    case 'SETUP':
      multiplier *= config.riskMultipliers.setupPhase;
      break;
    case 'TRIGGER':
      multiplier *= config.riskMultipliers.triggerPhase;
      break;
    case 'EXECUTION':
      multiplier *= config.riskMultipliers.executionPhase;
      break;
  }
  
  return baseBalance * config.baseRisk * multiplier;
}

/**
 * Check if trading should be blocked based on whale manipulation
 */
export function shouldBlockTrading(
  setupScore: number,
  triggerScore: number,
  executionScore: number,
  fundingRate: number,
  longShortRatio: number,
  liquidationAmount: number
): { shouldBlock: boolean; reason: string; forceClose: boolean } {
  const config = ENHANCED_TRADING_CONFIG.whaleProtection;
  
  // Check force close conditions first
  if (executionScore >= config.forceCloseIf.executionScore) {
    return {
      shouldBlock: true,
      forceClose: true,
      reason: `Execution phase detected (score: ${executionScore}%) - CLOSE ALL POSITIONS`
    };
  }
  
  if (liquidationAmount >= config.forceCloseIf.massiveLiquidation) {
    return {
      shouldBlock: true,
      forceClose: true,
      reason: `Massive liquidation detected ($${liquidationAmount/1000000}M) - CLOSE ALL POSITIONS`
    };
  }
  
  if (Math.abs(fundingRate) >= config.forceCloseIf.fundingRateExtreme) {
    return {
      shouldBlock: true,
      forceClose: true,
      reason: `Extreme funding rate (${(fundingRate*100).toFixed(3)}%) - CLOSE ALL POSITIONS`
    };
  }
  
  // Check block trading conditions
  if (setupScore >= config.blockTradingIf.setupScoreThreshold && 
      fundingRate >= config.blockTradingIf.fundingRateMax) {
    return {
      shouldBlock: true,
      forceClose: false,
      reason: `Whale setup detected (${setupScore}%) with high funding (${(fundingRate*100).toFixed(3)}%)`
    };
  }
  
  if (longShortRatio >= config.blockTradingIf.longShortRatioMax) {
    return {
      shouldBlock: true,
      forceClose: false,
      reason: `Extreme long/short ratio (${longShortRatio}) - retail overleveraged`
    };
  }
  
  if (triggerScore >= 80) {
    return {
      shouldBlock: true,
      forceClose: false,
      reason: `Trigger phase detected (${triggerScore}%) - dump imminent`
    };
  }
  
  return {
    shouldBlock: false,
    forceClose: false,
    reason: 'Trading conditions normal'
  };
}