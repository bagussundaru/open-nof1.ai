import { 
  PerformanceMetrics, 
  DrawdownPeriod 
} from './types';

export class PerformanceAnalyticsService {
  private returns: number[] = [];
  private portfolioValues: { timestamp: Date; value: number }[] = [];
  private trades: TradeRecord[] = [];
  private benchmarkReturns: number[] = [];

  /**
   * Add a new portfolio value data point
   */
  addPortfolioValue(timestamp: Date, value: number): void {
    this.portfolioValues.push({ timestamp, value });
    
    // Calculate return if we have previous value
    if (this.portfolioValues.length > 1) {
      const prevValue = this.portfolioValues[this.portfolioValues.length - 2].value;
      const returnPct = (value - prevValue) / prevValue;
      this.returns.push(returnPct);
    }
  }

  /**
   * Add a completed trade record
   */
  addTrade(trade: TradeRecord): void {
    this.trades.push(trade);
  }

  /**
   * Calculate comprehensive performance metrics
   */
  calculatePerformanceMetrics(riskFreeRate: number = 0.02): PerformanceMetrics {
    if (this.returns.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalReturn = this.calculateTotalReturn();
    const annualizedReturn = this.calculateAnnualizedReturn();
    const volatility = this.calculateVolatility();
    const sharpeRatio = this.calculateSharpeRatio(riskFreeRate);
    const sortinoRatio = this.calculateSortinoRatio(riskFreeRate);
    const maxDrawdown = this.calculateMaxDrawdown();
    const calmarRatio = annualizedReturn / Math.abs(maxDrawdown);
    
    const tradeMetrics = this.calculateTradeMetrics();

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      calmarRatio,
      winRate: tradeMetrics.winRate,
      profitFactor: tradeMetrics.profitFactor,
      averageWin: tradeMetrics.averageWin,
      averageLoss: tradeMetrics.averageLoss
    };
  }

  /**
   * Calculate total return
   */
  private calculateTotalReturn(): number {
    if (this.portfolioValues.length < 2) return 0;
    
    const initialValue = this.portfolioValues[0].value;
    const finalValue = this.portfolioValues[this.portfolioValues.length - 1].value;
    
    return (finalValue - initialValue) / initialValue;
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(): number {
    if (this.portfolioValues.length < 2) return 0;
    
    const totalReturn = this.calculateTotalReturn();
    const startDate = this.portfolioValues[0].timestamp;
    const endDate = this.portfolioValues[this.portfolioValues.length - 1].timestamp;
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;
    
    if (years <= 0) return 0;
    
    return Math.pow(1 + totalReturn, 1 / years) - 1;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private calculateVolatility(): number {
    if (this.returns.length < 2) return 0;
    
    const mean = this.returns.reduce((sum, ret) => sum + ret, 0) / this.returns.length;
    const variance = this.returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (this.returns.length - 1);
    
    // Annualize volatility (assuming daily returns)
    return Math.sqrt(variance * 252);
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(riskFreeRate: number): number {
    const annualizedReturn = this.calculateAnnualizedReturn();
    const volatility = this.calculateVolatility();
    
    if (volatility === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  /**
   * Calculate Sortino ratio (uses downside deviation instead of total volatility)
   */
  private calculateSortinoRatio(riskFreeRate: number): number {
    const annualizedReturn = this.calculateAnnualizedReturn();
    const downsideDeviation = this.calculateDownsideDeviation();
    
    if (downsideDeviation === 0) return 0;
    
    return (annualizedReturn - riskFreeRate) / downsideDeviation;
  }

  /**
   * Calculate downside deviation (volatility of negative returns only)
   */
  private calculateDownsideDeviation(): number {
    const negativeReturns = this.returns.filter(ret => ret < 0);
    
    if (negativeReturns.length === 0) return 0;
    
    const mean = negativeReturns.reduce((sum, ret) => sum + ret, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / negativeReturns.length;
    
    // Annualize downside deviation
    return Math.sqrt(variance * 252);
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown(): number {
    if (this.portfolioValues.length < 2) return 0;
    
    let maxDrawdown = 0;
    let peak = this.portfolioValues[0].value;
    
    for (let i = 1; i < this.portfolioValues.length; i++) {
      const currentValue = this.portfolioValues[i].value;
      
      if (currentValue > peak) {
        peak = currentValue;
      } else {
        const drawdown = (peak - currentValue) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }
    
    return maxDrawdown;
  }

  /**
   * Calculate detailed drawdown periods
   */
  calculateDrawdownPeriods(): DrawdownPeriod[] {
    if (this.portfolioValues.length < 2) return [];
    
    const drawdowns: DrawdownPeriod[] = [];
    let peak = this.portfolioValues[0].value;
    let peakDate = this.portfolioValues[0].timestamp;
    let inDrawdown = false;
    let drawdownStart: Date | null = null;
    let maxDrawdownInPeriod = 0;
    
    for (let i = 1; i < this.portfolioValues.length; i++) {
      const currentValue = this.portfolioValues[i].value;
      const currentDate = this.portfolioValues[i].timestamp;
      
      if (currentValue > peak) {
        // New peak reached
        if (inDrawdown && drawdownStart) {
          // End of drawdown period
          const duration = (peakDate.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24);
          const recovery = (currentValue - peak) / peak;
          
          drawdowns.push({
            startDate: drawdownStart,
            endDate: currentDate,
            duration,
            drawdown: maxDrawdownInPeriod,
            recovery
          });
          
          inDrawdown = false;
          maxDrawdownInPeriod = 0;
        }
        
        peak = currentValue;
        peakDate = currentDate;
      } else {
        // In drawdown
        if (!inDrawdown) {
          inDrawdown = true;
          drawdownStart = currentDate;
        }
        
        const currentDrawdown = (peak - currentValue) / peak;
        maxDrawdownInPeriod = Math.max(maxDrawdownInPeriod, currentDrawdown);
      }
    }
    
    // Handle ongoing drawdown
    if (inDrawdown && drawdownStart) {
      const duration = (this.portfolioValues[this.portfolioValues.length - 1].timestamp.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24);
      
      drawdowns.push({
        startDate: drawdownStart,
        endDate: this.portfolioValues[this.portfolioValues.length - 1].timestamp,
        duration,
        drawdown: maxDrawdownInPeriod,
        recovery: 0 // Ongoing drawdown
      });
    }
    
    return drawdowns;
  }

  /**
   * Calculate trade-based metrics
   */
  private calculateTradeMetrics(): TradeMetrics {
    if (this.trades.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0
      };
    }
    
    const winningTrades = this.trades.filter(trade => trade.pnl > 0);
    const losingTrades = this.trades.filter(trade => trade.pnl < 0);
    
    const winRate = winningTrades.length / this.trades.length;
    
    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    
    return {
      winRate,
      profitFactor,
      averageWin,
      averageLoss
    };
  }

  /**
   * Compare performance against benchmark
   */
  compareToBenchmark(benchmarkReturns: number[]): BenchmarkComparison {
    if (this.returns.length === 0 || benchmarkReturns.length === 0) {
      return {
        alpha: 0,
        beta: 0,
        correlation: 0,
        trackingError: 0,
        informationRatio: 0
      };
    }
    
    // Align returns arrays (use shorter length)
    const minLength = Math.min(this.returns.length, benchmarkReturns.length);
    const portfolioReturns = this.returns.slice(-minLength);
    const benchmarkRets = benchmarkReturns.slice(-minLength);
    
    const beta = this.calculateBeta(portfolioReturns, benchmarkRets);
    const alpha = this.calculateAlpha(portfolioReturns, benchmarkRets, beta);
    const correlation = this.calculateCorrelation(portfolioReturns, benchmarkRets);
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkRets);
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;
    
    return {
      alpha,
      beta,
      correlation,
      trackingError,
      informationRatio
    };
  }

  /**
   * Calculate beta (sensitivity to benchmark)
   */
  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 0;
  }

  /**
   * Calculate alpha (excess return over benchmark)
   */
  private calculateAlpha(portfolioReturns: number[], benchmarkReturns: number[], beta: number): number {
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    return portfolioMean - beta * benchmarkMean;
  }

  /**
   * Calculate correlation with benchmark
   */
  private calculateCorrelation(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, ret) => sum + ret, 0) / benchmarkReturns.length;
    
    let numerator = 0;
    let portfolioSumSq = 0;
    let benchmarkSumSq = 0;
    
    for (let i = 0; i < portfolioReturns.length; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      numerator += portfolioDiff * benchmarkDiff;
      portfolioSumSq += portfolioDiff * portfolioDiff;
      benchmarkSumSq += benchmarkDiff * benchmarkDiff;
    }
    
    const denominator = Math.sqrt(portfolioSumSq * benchmarkSumSq);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate tracking error (standard deviation of excess returns)
   */
  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    const excessReturns = portfolioReturns.map((ret, i) => ret - benchmarkReturns[i]);
    const mean = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const variance = excessReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / (excessReturns.length - 1);
    
    return Math.sqrt(variance * 252); // Annualized
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(riskFreeRate: number = 0.02): PerformanceReport {
    const metrics = this.calculatePerformanceMetrics(riskFreeRate);
    const drawdowns = this.calculateDrawdownPeriods();
    const tradeAnalysis = this.analyzeTradeDistribution();
    
    return {
      metrics,
      drawdowns,
      tradeAnalysis,
      generatedAt: new Date()
    };
  }

  /**
   * Analyze trade distribution
   */
  private analyzeTradeDistribution(): TradeDistribution {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        largestWin: 0,
        largestLoss: 0,
        averageHoldingPeriod: 0,
        pnlDistribution: []
      };
    }
    
    const winningTrades = this.trades.filter(trade => trade.pnl > 0);
    const losingTrades = this.trades.filter(trade => trade.pnl < 0);
    
    const largestWin = Math.max(...this.trades.map(trade => trade.pnl));
    const largestLoss = Math.min(...this.trades.map(trade => trade.pnl));
    
    const totalHoldingTime = this.trades.reduce((sum, trade) => {
      return sum + (trade.exitTime.getTime() - trade.entryTime.getTime());
    }, 0);
    const averageHoldingPeriod = totalHoldingTime / this.trades.length / (1000 * 60 * 60); // in hours
    
    // Create PnL distribution buckets
    const pnlDistribution = this.createPnLDistribution();
    
    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      largestWin,
      largestLoss,
      averageHoldingPeriod,
      pnlDistribution
    };
  }

  /**
   * Create PnL distribution histogram
   */
  private createPnLDistribution(): PnLBucket[] {
    const buckets: PnLBucket[] = [];
    const bucketSize = 0.01; // 1% buckets
    const bucketCount = 21; // -10% to +10%
    
    for (let i = 0; i < bucketCount; i++) {
      const min = (i - 10) * bucketSize;
      const max = (i - 9) * bucketSize;
      const count = this.trades.filter(trade => {
        const returnPct = trade.pnl / trade.entryValue;
        return returnPct >= min && returnPct < max;
      }).length;
      
      buckets.push({
        min,
        max,
        count,
        percentage: count / this.trades.length
      });
    }
    
    return buckets;
  }

  /**
   * Get empty metrics for initialization
   */
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      calmarRatio: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0
    };
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.returns = [];
    this.portfolioValues = [];
    this.trades = [];
    this.benchmarkReturns = [];
  }
}

// Supporting interfaces
interface TradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryValue: number;
  exitValue: number;
  pnl: number;
  fees: number;
}

interface TradeMetrics {
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}

interface BenchmarkComparison {
  alpha: number;
  beta: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
}

interface PerformanceReport {
  metrics: PerformanceMetrics;
  drawdowns: DrawdownPeriod[];
  tradeAnalysis: TradeDistribution;
  generatedAt: Date;
}

interface TradeDistribution {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  averageHoldingPeriod: number; // in hours
  pnlDistribution: PnLBucket[];
}

interface PnLBucket {
  min: number;
  max: number;
  count: number;
  percentage: number;
}