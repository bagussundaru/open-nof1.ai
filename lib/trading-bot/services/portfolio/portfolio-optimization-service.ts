import { 
  Asset, 
  PortfolioAllocation, 
  CorrelationMatrix, 
  RiskParityWeights, 
  OptimizationConstraints, 
  PortfolioMetrics 
} from './types';

export class PortfolioOptimizationService {
  private assets: Asset[] = [];
  private correlationMatrix: CorrelationMatrix = {};
  private historicalReturns: { [symbol: string]: number[] } = {};

  /**
   * Add asset to the portfolio universe
   */
  addAsset(asset: Asset): void {
    const existingIndex = this.assets.findIndex(a => a.symbol === asset.symbol);
    if (existingIndex >= 0) {
      this.assets[existingIndex] = asset;
    } else {
      this.assets.push(asset);
    }
  }

  /**
   * Calculate correlation matrix between assets
   */
  calculateCorrelationMatrix(returns: { [symbol: string]: number[] }): CorrelationMatrix {
    const symbols = Object.keys(returns);
    const matrix: CorrelationMatrix = {};

    for (const symbol1 of symbols) {
      matrix[symbol1] = {};
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          matrix[symbol1][symbol2] = 1.0;
        } else {
          matrix[symbol1][symbol2] = this.calculateCorrelation(
            returns[symbol1], 
            returns[symbol2]
          );
        }
      }
    }

    this.correlationMatrix = matrix;
    return matrix;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Implement mean-variance optimization (Markowitz)
   */
  optimizePortfolio(
    expectedReturns: { [symbol: string]: number },
    constraints: OptimizationConstraints,
    targetReturn?: number
  ): PortfolioAllocation[] {
    const symbols = Object.keys(expectedReturns);
    const n = symbols.length;

    // Simple equal-weight allocation as baseline
    let weights = this.calculateEqualWeights(symbols, constraints);

    // If we have correlation data, apply diversification
    if (Object.keys(this.correlationMatrix).length > 0) {
      weights = this.applyDiversificationOptimization(weights, symbols, constraints);
    }

    // Apply risk parity if no target return specified
    if (!targetReturn) {
      const riskParityWeights = this.calculateRiskParityWeights(symbols);
      weights = this.blendWeights(weights, riskParityWeights, 0.5);
    }

    return this.createAllocationFromWeights(weights, symbols);
  }

  /**
   * Calculate equal weights with constraints
   */
  private calculateEqualWeights(
    symbols: string[], 
    constraints: OptimizationConstraints
  ): { [symbol: string]: number } {
    const maxAssets = Math.min(constraints.maxAssets, symbols.length);
    const equalWeight = 1 / maxAssets;
    const weights: { [symbol: string]: number } = {};

    // Select top assets by market cap or volume
    const sortedAssets = this.assets
      .filter(asset => symbols.includes(asset.symbol))
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, maxAssets);

    sortedAssets.forEach(asset => {
      weights[asset.symbol] = Math.max(
        constraints.minWeight,
        Math.min(constraints.maxWeight, equalWeight)
      );
    });

    return this.normalizeWeights(weights);
  }

  /**
   * Apply diversification optimization based on correlation
   */
  private applyDiversificationOptimization(
    baseWeights: { [symbol: string]: number },
    symbols: string[],
    constraints: OptimizationConstraints
  ): { [symbol: string]: number } {
    const optimizedWeights = { ...baseWeights };

    // Reduce weights of highly correlated assets
    for (const symbol1 of symbols) {
      if (!optimizedWeights[symbol1]) continue;

      let correlationPenalty = 0;
      let correlationCount = 0;

      for (const symbol2 of symbols) {
        if (symbol1 !== symbol2 && optimizedWeights[symbol2]) {
          const correlation = this.correlationMatrix[symbol1]?.[symbol2] || 0;
          if (Math.abs(correlation) > 0.7) {
            correlationPenalty += Math.abs(correlation);
            correlationCount++;
          }
        }
      }

      if (correlationCount > 0) {
        const avgCorrelation = correlationPenalty / correlationCount;
        const penalty = Math.min(0.5, avgCorrelation * 0.3);
        optimizedWeights[symbol1] *= (1 - penalty);
      }
    }

    return this.normalizeWeights(optimizedWeights);
  }

  /**
   * Calculate risk parity weights
   */
  calculateRiskParityWeights(symbols: string[]): RiskParityWeights {
    const weights: RiskParityWeights = {};
    
    // Get volatilities for each asset
    const volatilities: { [symbol: string]: number } = {};
    symbols.forEach(symbol => {
      const asset = this.assets.find(a => a.symbol === symbol);
      volatilities[symbol] = asset?.volatility || 0.2; // Default 20% volatility
    });

    // Calculate inverse volatility weights
    const totalInverseVol = symbols.reduce((sum, symbol) => {
      return sum + (1 / volatilities[symbol]);
    }, 0);

    symbols.forEach(symbol => {
      weights[symbol] = (1 / volatilities[symbol]) / totalInverseVol;
    });

    return weights;
  }

  /**
   * Blend two weight sets
   */
  private blendWeights(
    weights1: { [symbol: string]: number },
    weights2: { [symbol: string]: number },
    alpha: number
  ): { [symbol: string]: number } {
    const blended: { [symbol: string]: number } = {};
    const allSymbols = new Set([...Object.keys(weights1), ...Object.keys(weights2)]);

    allSymbols.forEach(symbol => {
      const w1 = weights1[symbol] || 0;
      const w2 = weights2[symbol] || 0;
      blended[symbol] = alpha * w1 + (1 - alpha) * w2;
    });

    return this.normalizeWeights(blended);
  }

  /**
   * Normalize weights to sum to 1
   */
  private normalizeWeights(weights: { [symbol: string]: number }): { [symbol: string]: number } {
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (total === 0) return weights;

    const normalized: { [symbol: string]: number } = {};
    Object.entries(weights).forEach(([symbol, weight]) => {
      normalized[symbol] = weight / total;
    });

    return normalized;
  }

  /**
   * Create portfolio allocation from weights
   */
  private createAllocationFromWeights(
    weights: { [symbol: string]: number },
    symbols: string[]
  ): PortfolioAllocation[] {
    return symbols
      .filter(symbol => weights[symbol] > 0)
      .map(symbol => ({
        symbol,
        targetWeight: weights[symbol],
        currentWeight: 0, // To be filled by caller
        targetAmount: 0, // To be calculated based on portfolio value
        currentAmount: 0, // To be filled by caller
        rebalanceAmount: 0 // To be calculated
      }));
  }

  /**
   * Calculate portfolio metrics
   */
  calculatePortfolioMetrics(
    allocations: PortfolioAllocation[],
    expectedReturns: { [symbol: string]: number }
  ): PortfolioMetrics {
    let expectedReturn = 0;
    let variance = 0;
    let totalValue = 0;

    // Calculate expected return and total value
    allocations.forEach(allocation => {
      const assetReturn = expectedReturns[allocation.symbol] || 0;
      expectedReturn += allocation.targetWeight * assetReturn;
      totalValue += allocation.currentAmount * (this.getAssetPrice(allocation.symbol) || 0);
    });

    // Calculate portfolio variance using correlation matrix
    allocations.forEach(allocation1 => {
      const asset1 = this.assets.find(a => a.symbol === allocation1.symbol);
      const vol1 = asset1?.volatility || 0.2;

      allocations.forEach(allocation2 => {
        const asset2 = this.assets.find(a => a.symbol === allocation2.symbol);
        const vol2 = asset2?.volatility || 0.2;
        const correlation = this.correlationMatrix[allocation1.symbol]?.[allocation2.symbol] || 0;

        variance += allocation1.targetWeight * allocation2.targetWeight * vol1 * vol2 * correlation;
      });
    });

    const volatility = Math.sqrt(variance);
    const sharpeRatio = volatility > 0 ? expectedReturn / volatility : 0;

    // Calculate diversification ratio
    const weightedAvgVol = allocations.reduce((sum, allocation) => {
      const asset = this.assets.find(a => a.symbol === allocation.symbol);
      return sum + allocation.targetWeight * (asset?.volatility || 0.2);
    }, 0);

    const diversificationRatio = volatility > 0 ? weightedAvgVol / volatility : 1;

    return {
      totalValue,
      expectedReturn,
      volatility,
      sharpeRatio,
      diversificationRatio,
      maxDrawdown: 0 // To be calculated from historical data
    };
  }

  /**
   * Get current asset price
   */
  private getAssetPrice(symbol: string): number {
    const asset = this.assets.find(a => a.symbol === symbol);
    return asset?.price || 0;
  }

  /**
   * Update historical returns data
   */
  updateHistoricalReturns(symbol: string, returns: number[]): void {
    this.historicalReturns[symbol] = returns;
  }

  /**
   * Calculate rebalancing requirements
   */
  calculateRebalancing(
    targetAllocations: PortfolioAllocation[],
    currentHoldings: { [symbol: string]: number },
    portfolioValue: number
  ): PortfolioAllocation[] {
    return targetAllocations.map(allocation => {
      const currentAmount = currentHoldings[allocation.symbol] || 0;
      const currentPrice = this.getAssetPrice(allocation.symbol);
      const currentValue = currentAmount * currentPrice;
      const currentWeight = portfolioValue > 0 ? currentValue / portfolioValue : 0;
      
      const targetValue = allocation.targetWeight * portfolioValue;
      const targetAmount = currentPrice > 0 ? targetValue / currentPrice : 0;
      const rebalanceAmount = targetAmount - currentAmount;

      return {
        ...allocation,
        currentWeight,
        currentAmount,
        targetAmount,
        rebalanceAmount
      };
    });
  }
}