import { 
  OrderExecution, 
  IcebergOrderConfig, 
  TWAPOrderConfig 
} from './types';

export class AdvancedOrderService {
  private activeOrders: Map<string, OrderExecution> = new Map();
  private icebergOrders: Map<string, IcebergOrderState> = new Map();
  private twapOrders: Map<string, TWAPOrderState> = new Map();

  /**
   * Execute an iceberg order - breaks large orders into smaller slices
   */
  async executeIcebergOrder(
    symbol: string,
    side: 'buy' | 'sell',
    config: IcebergOrderConfig,
    exchangeExecutor: (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => Promise<OrderExecution>
  ): Promise<string> {
    const orderId = this.generateOrderId();
    
    const icebergState: IcebergOrderState = {
      orderId,
      symbol,
      side,
      config,
      executedAmount: 0,
      currentSlice: 0,
      slices: [],
      status: 'active',
      startTime: new Date(),
      lastSliceTime: new Date()
    };

    // Calculate slice sizes
    const numSlices = Math.ceil(config.totalAmount / config.sliceSize);
    for (let i = 0; i < numSlices; i++) {
      const sliceAmount = Math.min(
        config.sliceSize,
        config.totalAmount - i * config.sliceSize
      );
      icebergState.slices.push({
        amount: sliceAmount,
        executed: false,
        orderId: null
      });
    }

    this.icebergOrders.set(orderId, icebergState);

    // Start executing slices
    this.executeNextIcebergSlice(orderId, exchangeExecutor);

    return orderId;
  }

  /**
   * Execute the next slice of an iceberg order
   */
  private async executeNextIcebergSlice(
    orderId: string,
    exchangeExecutor: (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => Promise<OrderExecution>
  ): Promise<void> {
    const icebergState = this.icebergOrders.get(orderId);
    if (!icebergState || icebergState.status !== 'active') return;

    const currentSlice = icebergState.slices[icebergState.currentSlice];
    if (!currentSlice || currentSlice.executed) {
      // Move to next slice or complete order
      icebergState.currentSlice++;
      if (icebergState.currentSlice >= icebergState.slices.length) {
        icebergState.status = 'completed';
        return;
      }
      
      // Wait for time interval before next slice
      setTimeout(() => {
        this.executeNextIcebergSlice(orderId, exchangeExecutor);
      }, icebergState.config.timeInterval * 1000);
      return;
    }

    try {
      // Calculate price with some randomization within range
      const basePrice = await this.getCurrentPrice(icebergState.symbol);
      const priceVariation = (Math.random() - 0.5) * icebergState.config.priceRange;
      const slicePrice = basePrice * (1 + priceVariation);

      const execution = await exchangeExecutor(
        icebergState.symbol,
        icebergState.side,
        currentSlice.amount,
        slicePrice
      );

      currentSlice.executed = true;
      currentSlice.orderId = execution.orderId;
      icebergState.executedAmount += execution.executedAmount;
      icebergState.lastSliceTime = new Date();

      // Schedule next slice
      setTimeout(() => {
        this.executeNextIcebergSlice(orderId, exchangeExecutor);
      }, icebergState.config.timeInterval * 1000);

    } catch (error) {
      console.error(`Iceberg order slice failed for ${orderId}:`, error);
      icebergState.status = 'failed';
    }
  }

  /**
   * Execute a TWAP (Time-Weighted Average Price) order
   */
  async executeTWAPOrder(
    symbol: string,
    side: 'buy' | 'sell',
    config: TWAPOrderConfig,
    exchangeExecutor: (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => Promise<OrderExecution>
  ): Promise<string> {
    const orderId = this.generateOrderId();
    
    const intervalDuration = (config.duration * 60 * 1000) / config.intervals; // Convert to milliseconds
    const amountPerInterval = config.totalAmount / config.intervals;

    const twapState: TWAPOrderState = {
      orderId,
      symbol,
      side,
      config,
      executedAmount: 0,
      currentInterval: 0,
      intervals: [],
      status: 'active',
      startTime: new Date(),
      totalValue: 0,
      averagePrice: 0
    };

    // Initialize intervals
    for (let i = 0; i < config.intervals; i++) {
      twapState.intervals.push({
        amount: amountPerInterval,
        executed: false,
        executionTime: new Date(Date.now() + i * intervalDuration),
        price: 0,
        orderId: null
      });
    }

    this.twapOrders.set(orderId, twapState);

    // Start executing intervals
    this.scheduleNextTWAPInterval(orderId, exchangeExecutor, intervalDuration);

    return orderId;
  }

  /**
   * Schedule and execute the next TWAP interval
   */
  private scheduleNextTWAPInterval(
    orderId: string,
    exchangeExecutor: (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => Promise<OrderExecution>,
    intervalDuration: number
  ): void {
    const twapState = this.twapOrders.get(orderId);
    if (!twapState || twapState.status !== 'active') return;

    if (twapState.currentInterval >= twapState.intervals.length) {
      // Calculate final average price
      if (twapState.executedAmount > 0) {
        twapState.averagePrice = twapState.totalValue / twapState.executedAmount;
      }
      twapState.status = 'completed';
      return;
    }

    const currentInterval = twapState.intervals[twapState.currentInterval];
    const timeUntilExecution = currentInterval.executionTime.getTime() - Date.now();

    setTimeout(async () => {
      try {
        const currentPrice = await this.getCurrentPrice(twapState.symbol);
        
        // Check price limit if specified
        if (twapState.config.priceLimit) {
          const withinLimit = twapState.side === 'buy' 
            ? currentPrice <= twapState.config.priceLimit
            : currentPrice >= twapState.config.priceLimit;
          
          if (!withinLimit) {
            console.log(`TWAP interval skipped due to price limit: ${currentPrice} vs ${twapState.config.priceLimit}`);
            twapState.currentInterval++;
            this.scheduleNextTWAPInterval(orderId, exchangeExecutor, intervalDuration);
            return;
          }
        }

        const execution = await exchangeExecutor(
          twapState.symbol,
          twapState.side,
          currentInterval.amount
        );

        currentInterval.executed = true;
        currentInterval.price = execution.averagePrice;
        currentInterval.orderId = execution.orderId;
        
        twapState.executedAmount += execution.executedAmount;
        twapState.totalValue += execution.executedAmount * execution.averagePrice;
        twapState.currentInterval++;

        // Schedule next interval
        this.scheduleNextTWAPInterval(orderId, exchangeExecutor, intervalDuration);

      } catch (error) {
        console.error(`TWAP interval failed for ${orderId}:`, error);
        twapState.currentInterval++;
        // Continue with next interval even if one fails
        this.scheduleNextTWAPInterval(orderId, exchangeExecutor, intervalDuration);
      }
    }, Math.max(0, timeUntilExecution));
  }

  /**
   * Smart order routing - selects best execution venue
   */
  async executeSmartOrder(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    exchanges: ExchangeVenue[]
  ): Promise<OrderExecution> {
    // Get quotes from all available exchanges
    const quotes = await Promise.all(
      exchanges.map(async (exchange) => {
        try {
          const quote = await exchange.getQuote(symbol, side, amount);
          return {
            exchange: exchange.name,
            price: quote.price,
            liquidity: quote.availableAmount,
            fees: quote.fees,
            latency: quote.latency,
            executor: exchange.executor
          };
        } catch (error) {
          console.error(`Failed to get quote from ${exchange.name}:`, error);
          return null;
        }
      })
    );

    const validQuotes = quotes.filter(q => q !== null) as ExchangeQuote[];
    
    if (validQuotes.length === 0) {
      throw new Error('No valid quotes available for smart order routing');
    }

    // Score each exchange based on price, liquidity, and fees
    const scoredQuotes = validQuotes.map(quote => {
      let score = 0;
      
      // Price score (higher is better for sells, lower is better for buys)
      const priceScore = side === 'buy' ? (1 / quote.price) : quote.price;
      score += priceScore * 0.4;
      
      // Liquidity score
      const liquidityScore = Math.min(quote.liquidity / amount, 1);
      score += liquidityScore * 0.3;
      
      // Fee score (lower fees are better)
      const feeScore = 1 / (1 + quote.fees);
      score += feeScore * 0.2;
      
      // Latency score (lower latency is better)
      const latencyScore = 1 / (1 + quote.latency / 100);
      score += latencyScore * 0.1;

      return { ...quote, score };
    });

    // Select best exchange
    const bestQuote = scoredQuotes.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    console.log(`Smart routing selected ${bestQuote.exchange} with score ${bestQuote.score}`);

    // Execute order on best exchange
    return await bestQuote.executor(symbol, side, amount, bestQuote.price);
  }

  /**
   * Cancel an active order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    // Cancel iceberg order
    if (this.icebergOrders.has(orderId)) {
      const icebergState = this.icebergOrders.get(orderId)!;
      icebergState.status = 'cancelled';
      return true;
    }

    // Cancel TWAP order
    if (this.twapOrders.has(orderId)) {
      const twapState = this.twapOrders.get(orderId)!;
      twapState.status = 'cancelled';
      return true;
    }

    return false;
  }

  /**
   * Get order status
   */
  getOrderStatus(orderId: string): OrderStatus | null {
    // Check iceberg orders
    if (this.icebergOrders.has(orderId)) {
      const state = this.icebergOrders.get(orderId)!;
      return {
        orderId,
        type: 'iceberg',
        status: state.status,
        executedAmount: state.executedAmount,
        totalAmount: state.config.totalAmount,
        progress: state.executedAmount / state.config.totalAmount
      };
    }

    // Check TWAP orders
    if (this.twapOrders.has(orderId)) {
      const state = this.twapOrders.get(orderId)!;
      return {
        orderId,
        type: 'twap',
        status: state.status,
        executedAmount: state.executedAmount,
        totalAmount: state.config.totalAmount,
        progress: state.executedAmount / state.config.totalAmount,
        averagePrice: state.averagePrice
      };
    }

    return null;
  }

  /**
   * Get current market price (placeholder - should integrate with market data service)
   */
  private async getCurrentPrice(symbol: string): Promise<number> {
    // This should integrate with your market data service
    // For now, return a placeholder price
    return 50000; // Placeholder price
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    return `adv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Supporting interfaces
interface IcebergOrderState {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  config: IcebergOrderConfig;
  executedAmount: number;
  currentSlice: number;
  slices: IcebergSlice[];
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  startTime: Date;
  lastSliceTime: Date;
}

interface IcebergSlice {
  amount: number;
  executed: boolean;
  orderId: string | null;
}

interface TWAPOrderState {
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  config: TWAPOrderConfig;
  executedAmount: number;
  currentInterval: number;
  intervals: TWAPInterval[];
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  startTime: Date;
  totalValue: number;
  averagePrice: number;
}

interface TWAPInterval {
  amount: number;
  executed: boolean;
  executionTime: Date;
  price: number;
  orderId: string | null;
}

interface ExchangeVenue {
  name: string;
  getQuote: (symbol: string, side: 'buy' | 'sell', amount: number) => Promise<{
    price: number;
    availableAmount: number;
    fees: number;
    latency: number;
  }>;
  executor: (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => Promise<OrderExecution>;
}

interface ExchangeQuote {
  exchange: string;
  price: number;
  liquidity: number;
  fees: number;
  latency: number;
  executor: (symbol: string, side: 'buy' | 'sell', amount: number, price?: number) => Promise<OrderExecution>;
  score?: number;
}

interface OrderStatus {
  orderId: string;
  type: 'iceberg' | 'twap' | 'smart';
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  executedAmount: number;
  totalAmount: number;
  progress: number;
  averagePrice?: number;
}