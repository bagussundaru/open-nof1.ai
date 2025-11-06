// Performance Tracker - Trading performance metrics calculation and tracking

import { 
  PerformanceMetrics, 
  TradingActivityLog 
} from './types';
import { 
  TradingPosition, 
  TradeExecution 
} from '../../types';

export class PerformanceTracker {
  private trades: TradeExecution[] = [];
  private positions: TradingPosition[] = [];
  private activityLog: TradingActivityLog[] = [];
  private startTime: Date = new Date();
  private startingBalance: number = 0;

  constructor(startingBalance: number = 10000) {
    this.startingBalance = startingBalance;
  }

  /**
   * Record a completed trade
   */
  recordTrade(trade: TradeExecution): void {
    this.trades.push(trade);
  }

  /**
   * Update positions data
   */
  updatePositions(positions: TradingPosition[]): void {
    this.positions = [...positions];
  }

  /**
   * Add activity log entry
   */
  addActivityLog(activity: TradingActivityLog): void {
    this.activityLog.unshift(activity); // Add to beginning for recent-first order
    
    // Keep only last 100 entries
    if (this.activityLog.length > 100) {
      this.activityLog = this.activityLog.slice(0, 100);
    }
  }

  /**
   * Get recent activity logs
   */
  getRecentActivity(limit: number = 20): TradingActivityLog[] {
    return this.activityLog.slice(0, limit);
  }

  /**
   * Calculate comprehensive performance metrics
   * Requirements: 5.3
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const totalTrades = this.trades.length;
    const successfulTrades = this.trades.filter(t => t.status === 'filled').length;
    const failedTrades = totalTrades - successfulTrades;
    
    // Calculate P&L from completed trades
    const realizedPnL = this.calculateRealizedPnL();
    
    // Calculate unrealized P&L from open positions
    const unrealizedPnL = this.calculateUnrealizedPnL();
    
    const totalPnL = realizedPnL + unrealizedPnL;
    
    // Calculate current balance (starting balance + realized P&L)
    const currentBalance = this.startingBalance + realizedPnL;
    
    // Calculate win rate
    const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    
    // Calculate total volume
    const totalVolume = this.trades.reduce((sum, trade) => {
      return sum + (trade.amount * trade.price);
    }, 0);
    
    // Calculate average trade size
    const averageTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    
    // Calculate ROI
    const returnOnInvestment = this.startingBalance > 0 ? 
      (totalPnL / this.startingBalance) * 100 : 0;
    
    // Calculate Sharpe ratio (simplified)
    const sharpeRatio = this.calculateSharpeRatio();
    
    // Calculate max drawdown
    const maxDrawdown = this.calculateMaxDrawdown();
    
    // Calculate uptime
    const uptime = Date.now() - this.startTime.getTime();

    return {
      totalTrades,
      profitLoss: totalPnL,
      winRate,
      sharpeRatio,
      maxDrawdown,
      uptime,
      averageTradeSize,
      totalVolume,
      successfulTrades,
      failedTrades,
      currentBalance,
      startingBalance: this.startingBalance,
      returnOnInvestment
    };
  }

  /**
   * Calculate realized P&L from completed trades
   */
  private calculateRealizedPnL(): number {
    // Group trades by symbol to match buy/sell pairs
    const tradesBySymbol = new Map<string, TradeExecution[]>();
    
    for (const trade of this.trades.filter(t => t.status === 'filled')) {
      if (!tradesBySymbol.has(trade.symbol)) {
        tradesBySymbol.set(trade.symbol, []);
      }
      tradesBySymbol.get(trade.symbol)!.push(trade);
    }
    
    let totalRealizedPnL = 0;
    
    // Calculate P&L for each symbol
    for (const symbol of Array.from(tradesBySymbol.keys())) {
      const symbolTrades = tradesBySymbol.get(symbol)!;
      totalRealizedPnL += this.calculateSymbolPnL(symbolTrades);
    }
    
    return totalRealizedPnL;
  }

  /**
   * Calculate P&L for a specific symbol's trades
   */
  private calculateSymbolPnL(trades: TradeExecution[]): number {
    let position = 0;
    let totalCost = 0;
    let realizedPnL = 0;
    
    // Sort trades by timestamp
    const sortedTrades = trades.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (const trade of sortedTrades) {
      const tradeValue = trade.amount * trade.price;
      
      if (trade.side === 'buy') {
        position += trade.amount;
        totalCost += tradeValue + trade.fee;
      } else { // sell
        if (position > 0) {
          const sellAmount = Math.min(trade.amount, position);
          const avgCostPerUnit = totalCost / position;
          const sellCost = sellAmount * avgCostPerUnit;
          const sellRevenue = sellAmount * trade.price - trade.fee;
          
          realizedPnL += sellRevenue - sellCost;
          
          position -= sellAmount;
          totalCost -= sellCost;
        }
      }
    }
    
    return realizedPnL;
  }

  /**
   * Calculate unrealized P&L from open positions
   */
  private calculateUnrealizedPnL(): number {
    return this.positions.reduce((sum, position) => {
      return sum + (position.unrealizedPnL || 0);
    }, 0);
  }

  /**
   * Calculate Sharpe ratio (simplified version)
   */
  private calculateSharpeRatio(): number {
    if (this.trades.length < 2) return 0;
    
    // Calculate daily returns
    const dailyReturns = this.calculateDailyReturns();
    
    if (dailyReturns.length < 2) return 0;
    
    // Calculate average return and standard deviation
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    // Sharpe ratio (assuming risk-free rate of 0)
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  /**
   * Calculate daily returns
   */
  private calculateDailyReturns(): number[] {
    const dailyPnL = new Map<string, number>();
    
    // Group trades by day
    for (const trade of this.trades.filter(t => t.status === 'filled')) {
      const day = new Date(trade.timestamp).toISOString().split('T')[0];
      if (!dailyPnL.has(day)) {
        dailyPnL.set(day, 0);
      }
      
      // Simplified P&L calculation for daily returns
      const tradePnL = trade.side === 'sell' ? 
        (trade.amount * trade.price) - trade.fee : 
        -(trade.amount * trade.price) - trade.fee;
      
      dailyPnL.set(day, dailyPnL.get(day)! + tradePnL);
    }
    
    return Array.from(dailyPnL.values());
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(): number {
    if (this.trades.length === 0) return 0;
    
    let peak = this.startingBalance;
    let maxDrawdown = 0;
    let runningBalance = this.startingBalance;
    
    // Sort trades by timestamp
    const sortedTrades = this.trades
      .filter(t => t.status === 'filled')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    for (const trade of sortedTrades) {
      // Simplified balance calculation
      const tradePnL = trade.side === 'sell' ? 
        (trade.amount * trade.price) - trade.fee : 
        -(trade.amount * trade.price) - trade.fee;
      
      runningBalance += tradePnL;
      
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      
      const drawdown = (peak - runningBalance) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100; // Return as percentage
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Reset performance tracking
   */
  reset(newStartingBalance?: number): void {
    this.trades = [];
    this.positions = [];
    this.activityLog = [];
    this.startTime = new Date();
    
    if (newStartingBalance !== undefined) {
      this.startingBalance = newStartingBalance;
    }
  }

  /**
   * Get trade statistics
   */
  getTradeStatistics(): {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    winRate: number;
    averageTradeSize: number;
    totalVolume: number;
  } {
    const totalTrades = this.trades.length;
    const successfulTrades = this.trades.filter(t => t.status === 'filled').length;
    const failedTrades = totalTrades - successfulTrades;
    const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
    
    const totalVolume = this.trades.reduce((sum, trade) => {
      return sum + (trade.amount * trade.price);
    }, 0);
    
    const averageTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    
    return {
      totalTrades,
      successfulTrades,
      failedTrades,
      winRate,
      averageTradeSize,
      totalVolume
    };
  }
}