import { PortfolioOptimizationService } from './portfolio-optimization-service';
import { AdvancedOrderService } from './advanced-order-service';
import { PerformanceAnalyticsService } from './performance-analytics-service';
import { 
  Asset, 
  PortfolioAllocation, 
  OptimizationConstraints, 
  IcebergOrderConfig, 
  TWAPOrderConfig,
  PerformanceMetrics 
} from './types';

/**
 * Main portfolio manager that coordinates all portfolio management services
 */
export class PortfolioManager {
  private optimizationService: PortfolioOptimizationService;
  private orderService: AdvancedOrderService;
  private analyticsService: PerformanceAnalyticsService;
  
  private currentAllocations: PortfolioAllocation[] = [];
  private portfolioValue: number = 0;

  constructor() {
    this.optimizationService = new PortfolioOptimizationService();
    this.orderService = new AdvancedOrderService();
    this.analyticsService = new PerformanceAnalyticsService();
  }

  /**
   * Initialize portfolio with assets and constraints
   */
  async initializePortfolio(
    assets: Asset[],
    constraints: OptimizationConstraints,
    initialValue: number
  ): Promise<void> {
    // Add assets to optimization service
    assets.forEach(asset => {
      this.optimizationService.addAsset(asset);
    });

    // Calculate expected returns (simplified - should use historical data)
    const expectedReturns: { [symbol: string]: number } = {};
    assets.forEach(asset => {
      expectedReturns[asset.symbol] = 0.08; // 8% expected return
    });

    // Optimize portfolio
    this.currentAllocations = this.optimizationService.optimizePortfolio(
      expectedReturns,
      constraints
    );

    this.portfolioValue = initialValue;
    
    // Initialize analytics
    this.analyticsService.addPortfolioValue(new Date(), initialValue);

    console.log('Portfolio initialized with allocations:', this.currentAllocations);
  }

  /**
   * Rebalance portfolio using advanced order types
   */
  async rebalancePortfolio(
    currentHoldings: { [symbol: string]: number },
    useAdvancedOrders: boolean = false
  ): Promise<string[]> {
    // Calculate rebalancing requirements
    const rebalancingAllocations = this.optimizationService.calculateRebalancing(
      this.currentAllocations,
      currentHoldings,
      this.portfolioValue
    );

    const orderIds: string[] = [];

    // Execute rebalancing trades
    for (const allocation of rebalancingAllocations) {
      if (Math.abs(allocation.rebalanceAmount) < 0.01) continue; // Skip small rebalances

      const side = allocation.rebalanceAmount > 0 ? 'buy' : 'sell';
      const amount = Math.abs(allocation.rebalanceAmount);

      if (useAdvancedOrders && amount > 1000) {
        // Use iceberg orders for large trades
        const icebergConfig: IcebergOrderConfig = {
          totalAmount: amount,
          sliceSize: amount / 5, // Split into 5 slices
          priceRange: 0.001, // 0.1% price range
          timeInterval: 30 // 30 seconds between slices
        };

        const orderId = await this.orderService.executeIcebergOrder(
          allocation.symbol,
          side,
          icebergConfig,
          this.createExchangeExecutor()
        );

        orderIds.push(orderId);
      } else if (useAdvancedOrders && amount > 500) {
        // Use TWAP orders for medium trades
        const twapConfig: TWAPOrderConfig = {
          totalAmount: amount,
          duration: 10, // 10 minutes
          intervals: 5
        };

        const orderId = await this.orderService.executeTWAPOrder(
          allocation.symbol,
          side,
          twapConfig,
          this.createExchangeExecutor()
        );

        orderIds.push(orderId);
      } else {
        // Use regular market orders for small trades
        const execution = await this.createExchangeExecutor()(
          allocation.symbol,
          side,
          amount
        );

        orderIds.push(execution.orderId);
      }
    }

    return orderIds;
  }

  /**
   * Update portfolio value and calculate performance
   */
  updatePortfolioValue(newValue: number): PerformanceMetrics {
    this.portfolioValue = newValue;
    this.analyticsService.addPortfolioValue(new Date(), newValue);
    
    return this.analyticsService.calculatePerformanceMetrics();
  }

  /**
   * Add completed trade for performance tracking
   */
  recordTrade(
    symbol: string,
    side: 'buy' | 'sell',
    entryTime: Date,
    exitTime: Date,
    entryPrice: number,
    exitPrice: number,
    quantity: number,
    fees: number
  ): void {
    const entryValue = entryPrice * quantity;
    const exitValue = exitPrice * quantity;
    const pnl = side === 'buy' ? (exitValue - entryValue - fees) : (entryValue - exitValue - fees);

    this.analyticsService.addTrade({
      id: `trade_${Date.now()}`,
      symbol,
      side,
      entryTime,
      exitTime,
      entryPrice,
      exitPrice,
      quantity,
      entryValue,
      exitValue,
      pnl,
      fees
    });
  }

  /**
   * Get current portfolio status
   */
  getPortfolioStatus(): PortfolioStatus {
    const metrics = this.analyticsService.calculatePerformanceMetrics();
    const drawdowns = this.analyticsService.calculateDrawdownPeriods();
    
    return {
      allocations: this.currentAllocations,
      totalValue: this.portfolioValue,
      performance: metrics,
      maxDrawdown: drawdowns.length > 0 ? Math.max(...drawdowns.map(d => d.drawdown)) : 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport(): any {
    return this.analyticsService.generatePerformanceReport();
  }

  /**
   * Create a mock exchange executor for demonstration
   */
  private createExchangeExecutor() {
    return async (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => {
      // This would integrate with your actual exchange service
      const mockPrice = price || 50000; // Mock price
      
      return {
        orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side,
        amount,
        price: mockPrice,
        orderType: 'market' as const,
        status: 'filled' as const,
        executedAmount: amount,
        averagePrice: mockPrice,
        timestamp: new Date()
      };
    };
  }
}

interface PortfolioStatus {
  allocations: PortfolioAllocation[];
  totalValue: number;
  performance: PerformanceMetrics;
  maxDrawdown: number;
  lastUpdated: Date;
}