// Advanced Risk Management Configuration

import { AdvancedRiskConfig } from '../types';

export const defaultAdvancedRiskConfig: AdvancedRiskConfig = {
  // Basic risk settings
  maxDailyLoss: 1000,
  maxPositionSize: 500,
  stopLossPercentage: 5,
  maxOpenPositions: 5,
  emergencyStopEnabled: true,

  // Dynamic stop-loss settings
  baseStopLossPercentage: 3, // Base 3% stop-loss
  volatilityMultiplier: 2.0, // Multiply volatility by 2 to adjust stop-loss
  maxStopLossPercentage: 15, // Maximum 15% stop-loss
  minStopLossPercentage: 1, // Minimum 1% stop-loss

  // Correlation settings
  maxCorrelationThreshold: 0.7, // Maximum 70% correlation between positions
  correlationLookbackPeriod: 50, // 50 periods for correlation calculation

  // Drawdown protection
  maxDrawdownPercentage: 20, // Emergency stop at 20% drawdown
  drawdownStopTradingThreshold: 15, // Stop new trades at 15% drawdown
  drawdownRecoveryThreshold: 5 // Resume trading when drawdown recovers to 5%
};

export const conservativeRiskConfig: AdvancedRiskConfig = {
  ...defaultAdvancedRiskConfig,
  maxDailyLoss: 500,
  maxPositionSize: 250,
  stopLossPercentage: 3,
  baseStopLossPercentage: 2,
  maxStopLossPercentage: 10,
  maxCorrelationThreshold: 0.5,
  maxDrawdownPercentage: 10,
  drawdownStopTradingThreshold: 8
};

export const aggressiveRiskConfig: AdvancedRiskConfig = {
  ...defaultAdvancedRiskConfig,
  maxDailyLoss: 2000,
  maxPositionSize: 1000,
  stopLossPercentage: 7,
  baseStopLossPercentage: 5,
  maxStopLossPercentage: 20,
  maxCorrelationThreshold: 0.8,
  maxDrawdownPercentage: 30,
  drawdownStopTradingThreshold: 25
};

/**
 * Get risk configuration based on risk profile
 */
export function getRiskConfig(profile: 'conservative' | 'default' | 'aggressive'): AdvancedRiskConfig {
  switch (profile) {
    case 'conservative':
      return conservativeRiskConfig;
    case 'aggressive':
      return aggressiveRiskConfig;
    default:
      return defaultAdvancedRiskConfig;
  }
}

/**
 * Validate risk configuration parameters
 */
export function validateRiskConfig(config: AdvancedRiskConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validations
  if (config.maxDailyLoss <= 0) {
    errors.push('maxDailyLoss must be positive');
  }

  if (config.maxPositionSize <= 0) {
    errors.push('maxPositionSize must be positive');
  }

  if (config.maxOpenPositions <= 0) {
    errors.push('maxOpenPositions must be positive');
  }

  // Stop-loss validations
  if (config.baseStopLossPercentage <= 0 || config.baseStopLossPercentage > 100) {
    errors.push('baseStopLossPercentage must be between 0 and 100');
  }

  if (config.minStopLossPercentage >= config.maxStopLossPercentage) {
    errors.push('minStopLossPercentage must be less than maxStopLossPercentage');
  }

  if (config.volatilityMultiplier <= 0) {
    errors.push('volatilityMultiplier must be positive');
  }

  // Correlation validations
  if (config.maxCorrelationThreshold < 0 || config.maxCorrelationThreshold > 1) {
    errors.push('maxCorrelationThreshold must be between 0 and 1');
  }

  if (config.correlationLookbackPeriod < 10) {
    errors.push('correlationLookbackPeriod must be at least 10');
  }

  // Drawdown validations
  if (config.maxDrawdownPercentage <= 0 || config.maxDrawdownPercentage > 100) {
    errors.push('maxDrawdownPercentage must be between 0 and 100');
  }

  if (config.drawdownStopTradingThreshold >= config.maxDrawdownPercentage) {
    errors.push('drawdownStopTradingThreshold must be less than maxDrawdownPercentage');
  }

  if (config.drawdownRecoveryThreshold >= config.drawdownStopTradingThreshold) {
    errors.push('drawdownRecoveryThreshold must be less than drawdownStopTradingThreshold');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create custom risk configuration with validation
 */
export function createCustomRiskConfig(
  baseConfig: AdvancedRiskConfig,
  overrides: Partial<AdvancedRiskConfig>
): { config?: AdvancedRiskConfig; errors: string[] } {
  const customConfig = { ...baseConfig, ...overrides };
  const validation = validateRiskConfig(customConfig);

  if (validation.isValid) {
    return { config: customConfig, errors: [] };
  } else {
    return { errors: validation.errors };
  }
}