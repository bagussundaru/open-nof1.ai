// Order Book Analysis Service
// Implements order book imbalance detection, market depth analysis, and liquidity assessment

import { EventEmitter } from 'events';
import { OrderBook, OrderBookLevel, MarketData } from '../../types';

export interface OrderBookImbalance {
  symbol: string;
  timestamp: number;
  bidImbalance: number;
  askImbalance: number;
  totalImbalance: number;
  imbalanceRatio: number;
  significantImbalance: boolean;
}

export interface MarketDepthMetrics {
  symbol: string;
  timestamp: number;
  bidDepth: number;
  askDepth: number;
  totalDepth: number;
  depthRatio: number;
  averageSpread: number;
  spreadPercentage: number;
}

export interface LiquidityAssessment {
  symbol: string;
  timestamp: number;
  liquidityScore: number;
  bidLiquidity: number;
  askLiquidity: number;
  marketImpact: {
    buy: { [amount: string]: number };
    sell: { [amount: string]: number };
  };
  liquidityTier: 'high' | 'medium' | 'low';
}

export interface OrderBookAnalysisConfig {
  imbalanceThreshold: number;
  depthLevels: number;
  liquidityTestAmounts: number[];
  significanceThreshold: number;
  updateInterval: number;
}

export class OrderBookAnalyzer extends EventEmitter {
  private config: OrderBookAnalysisConfig;
  private orderBookHistory: Map<string, OrderBook[]> = new Map();
  private imbalanceHistory: Map<string, OrderBookImbalance[]> = new Map();
  private depthHistory: Map<string, MarketDepthMetrics[]> = new Map();
  private liquidityHistory: Map<string, LiquidityAssessment[]> = new Map();
  private maxHistoryLength: number = 100;

  constructor(config: OrderBookAnalysisConfig) {
    super();
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.imbalanceThreshold <= 0 || this.config.imbalanceThreshold >= 1) {
      throw new Error('Imbalance threshold must be between 0 and 1');
    }
    if (this.config.depthLevels <= 0) {
      throw new Error('Depth levels must be positive');
    }
    if (!Array.isArray(this.config.liquidityTestAmounts) || this.config.liquidityTestAmounts.length === 0) {
      throw new Error('Liquidity test amounts must be a non-empty array');
    }
  }

  /**
   * Analyze order book and detect imbalances
   */
  analyzeOrderBook(marketData: MarketData): {
    imbalance: OrderBookImbalance;
    depth: MarketDepthMetrics;
    liquidity: LiquidityAssessment;
  } {
    const { symbol, orderBook, timestamp } = marketData;

    if (!orderBook || !orderBook.bids.length || !orderBook.asks.length) {
      throw new Error(`Invalid order book data for ${symbol}`);
    }

    // Store order book in history
    this.storeOrderBookHistory(symbol, orderBook);

    // Perform all analyses
    const imbalance = this.detectOrderBookImbalance(symbol, orderBook, timestamp);
    const depth = this.analyzeMarketDepth(symbol, orderBook, timestamp);
    const liquidity = this.assessLiquidity(symbol, orderBook, timestamp);

    // Store analysis results
    this.storeAnalysisHistory(symbol, imbalance, depth, liquidity);

    // Emit events for significant findings
    if (imbalance.significantImbalance) {
      this.emit('significantImbalance', imbalance);
    }

    if (liquidity.liquidityTier === 'low') {
      this.emit('lowLiquidity', liquidity);
    }

    return { imbalance, depth, liquidity };
  }

  /**
   * Detect order book imbalance
   */
  private detectOrderBookImbalance(symbol: string, orderBook: OrderBook, timestamp: number): OrderBookImbalance {
    const depthLevels = Math.min(this.config.depthLevels, orderBook.bids.length, orderBook.asks.length);
    
    // Calculate total volume at each side
    let totalBidVolume = 0;
    let totalAskVolume = 0;

    for (let i = 0; i < depthLevels; i++) {
      totalBidVolume += orderBook.bids[i].amount;
      totalAskVolume += orderBook.asks[i].amount;
    }

    const totalVolume = totalBidVolume + totalAskVolume;
    
    if (totalVolume === 0) {
      throw new Error('No volume in order book');
    }

    // Calculate imbalance metrics
    const bidImbalance = totalBidVolume / totalVolume;
    const askImbalance = totalAskVolume / totalVolume;
    const totalImbalance = Math.abs(bidImbalance - askImbalance);
    const imbalanceRatio = totalBidVolume / totalAskVolume;

    // Determine if imbalance is significant
    const significantImbalance = totalImbalance > this.config.imbalanceThreshold;

    return {
      symbol,
      timestamp,
      bidImbalance,
      askImbalance,
      totalImbalance,
      imbalanceRatio,
      significantImbalance
    };
  }

  /**
   * Analyze market depth
   */
  private analyzeMarketDepth(symbol: string, orderBook: OrderBook, timestamp: number): MarketDepthMetrics {
    const depthLevels = Math.min(this.config.depthLevels, orderBook.bids.length, orderBook.asks.length);
    
    // Calculate cumulative depth
    let bidDepth = 0;
    let askDepth = 0;

    for (let i = 0; i < depthLevels; i++) {
      bidDepth += orderBook.bids[i].amount * orderBook.bids[i].price;
      askDepth += orderBook.asks[i].amount * orderBook.asks[i].price;
    }

    const totalDepth = bidDepth + askDepth;
    const depthRatio = bidDepth / askDepth;

    // Calculate spread metrics
    const bestBid = orderBook.bids[0].price;
    const bestAsk = orderBook.asks[0].price;
    const averageSpread = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const spreadPercentage = (averageSpread / midPrice) * 100;

    return {
      symbol,
      timestamp,
      bidDepth,
      askDepth,
      totalDepth,
      depthRatio,
      averageSpread,
      spreadPercentage
    };
  }

  /**
   * Assess market liquidity
   */
  private assessLiquidity(symbol: string, orderBook: OrderBook, timestamp: number): LiquidityAssessment {
    const marketImpact = {
      buy: {} as { [amount: string]: number },
      sell: {} as { [amount: string]: number }
    };

    // Calculate market impact for different order sizes
    for (const testAmount of this.config.liquidityTestAmounts) {
      marketImpact.buy[testAmount.toString()] = this.calculateMarketImpact(orderBook.asks, testAmount, 'buy');
      marketImpact.sell[testAmount.toString()] = this.calculateMarketImpact(orderBook.bids, testAmount, 'sell');
    }

    // Calculate liquidity metrics
    const bidLiquidity = this.calculateSideLiquidity(orderBook.bids);
    const askLiquidity = this.calculateSideLiquidity(orderBook.asks);
    
    // Overall liquidity score (0-100)
    const liquidityScore = this.calculateLiquidityScore(bidLiquidity, askLiquidity, marketImpact);
    
    // Determine liquidity tier
    let liquidityTier: 'high' | 'medium' | 'low';
    if (liquidityScore >= 80) {
      liquidityTier = 'high';
    } else if (liquidityScore >= 50) {
      liquidityTier = 'medium';
    } else {
      liquidityTier = 'low';
    }

    return {
      symbol,
      timestamp,
      liquidityScore,
      bidLiquidity,
      askLiquidity,
      marketImpact,
      liquidityTier
    };
  }

  /**
   * Calculate market impact for a given order size
   */
  private calculateMarketImpact(levels: OrderBookLevel[], orderSize: number, side: 'buy' | 'sell'): number {
    let remainingSize = orderSize;
    let totalCost = 0;
    let weightedPrice = 0;

    for (const level of levels) {
      if (remainingSize <= 0) break;

      const fillSize = Math.min(remainingSize, level.amount);
      totalCost += fillSize * level.price;
      remainingSize -= fillSize;
    }

    if (remainingSize > 0) {
      // Not enough liquidity to fill the order
      return Infinity;
    }

    weightedPrice = totalCost / orderSize;
    const bestPrice = levels[0].price;
    
    // Market impact as percentage difference from best price
    return Math.abs((weightedPrice - bestPrice) / bestPrice) * 100;
  }

  /**
   * Calculate liquidity for one side of the order book
   */
  private calculateSideLiquidity(levels: OrderBookLevel[]): number {
    let totalLiquidity = 0;
    const maxLevels = Math.min(20, levels.length); // Consider top 20 levels

    for (let i = 0; i < maxLevels; i++) {
      const level = levels[i];
      // Weight closer levels more heavily
      const weight = 1 / (i + 1);
      totalLiquidity += level.amount * level.price * weight;
    }

    return totalLiquidity;
  }

  /**
   * Calculate overall liquidity score
   */
  private calculateLiquidityScore(bidLiquidity: number, askLiquidity: number, marketImpact: any): number {
    // Base score from liquidity amounts
    const totalLiquidity = bidLiquidity + askLiquidity;
    const liquidityBalance = Math.min(bidLiquidity, askLiquidity) / Math.max(bidLiquidity, askLiquidity);
    
    // Penalty for high market impact
    const smallOrderImpact = marketImpact.buy['1000'] || 0;
    const impactPenalty = Math.min(smallOrderImpact * 10, 50); // Cap penalty at 50 points
    
    // Calculate score (0-100)
    let score = Math.min(Math.log10(totalLiquidity + 1) * 20, 70); // Base score from liquidity
    score += liquidityBalance * 20; // Bonus for balanced liquidity
    score -= impactPenalty; // Penalty for high impact
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Store order book in history
   */
  private storeOrderBookHistory(symbol: string, orderBook: OrderBook): void {
    if (!this.orderBookHistory.has(symbol)) {
      this.orderBookHistory.set(symbol, []);
    }

    const history = this.orderBookHistory.get(symbol)!;
    history.push(JSON.parse(JSON.stringify(orderBook))); // Deep copy

    // Maintain max history length
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Store analysis results in history
   */
  private storeAnalysisHistory(
    symbol: string,
    imbalance: OrderBookImbalance,
    depth: MarketDepthMetrics,
    liquidity: LiquidityAssessment
  ): void {
    // Store imbalance history
    if (!this.imbalanceHistory.has(symbol)) {
      this.imbalanceHistory.set(symbol, []);
    }
    const imbalanceHist = this.imbalanceHistory.get(symbol)!;
    imbalanceHist.push(imbalance);
    if (imbalanceHist.length > this.maxHistoryLength) {
      imbalanceHist.shift();
    }

    // Store depth history
    if (!this.depthHistory.has(symbol)) {
      this.depthHistory.set(symbol, []);
    }
    const depthHist = this.depthHistory.get(symbol)!;
    depthHist.push(depth);
    if (depthHist.length > this.maxHistoryLength) {
      depthHist.shift();
    }

    // Store liquidity history
    if (!this.liquidityHistory.has(symbol)) {
      this.liquidityHistory.set(symbol, []);
    }
    const liquidityHist = this.liquidityHistory.get(symbol)!;
    liquidityHist.push(liquidity);
    if (liquidityHist.length > this.maxHistoryLength) {
      liquidityHist.shift();
    }
  }

  /**
   * Get historical imbalance data
   */
  getImbalanceHistory(symbol: string): OrderBookImbalance[] {
    return this.imbalanceHistory.get(symbol) || [];
  }

  /**
   * Get historical depth data
   */
  getDepthHistory(symbol: string): MarketDepthMetrics[] {
    return this.depthHistory.get(symbol) || [];
  }

  /**
   * Get historical liquidity data
   */
  getLiquidityHistory(symbol: string): LiquidityAssessment[] {
    return this.liquidityHistory.get(symbol) || [];
  }

  /**
   * Get current order book analysis summary
   */
  getCurrentAnalysis(symbol: string): {
    imbalance?: OrderBookImbalance;
    depth?: MarketDepthMetrics;
    liquidity?: LiquidityAssessment;
  } {
    const imbalanceHist = this.imbalanceHistory.get(symbol);
    const depthHist = this.depthHistory.get(symbol);
    const liquidityHist = this.liquidityHistory.get(symbol);

    return {
      imbalance: imbalanceHist?.[imbalanceHist.length - 1],
      depth: depthHist?.[depthHist.length - 1],
      liquidity: liquidityHist?.[liquidityHist.length - 1]
    };
  }

  /**
   * Calculate average imbalance over time period
   */
  getAverageImbalance(symbol: string, periodMinutes: number = 5): number {
    const history = this.imbalanceHistory.get(symbol) || [];
    const cutoffTime = Date.now() - (periodMinutes * 60 * 1000);
    
    const recentImbalances = history.filter(item => item.timestamp >= cutoffTime);
    
    if (recentImbalances.length === 0) {
      return 0;
    }

    const totalImbalance = recentImbalances.reduce((sum, item) => sum + item.totalImbalance, 0);
    return totalImbalance / recentImbalances.length;
  }

  /**
   * Detect liquidity events (sudden changes in liquidity)
   */
  detectLiquidityEvents(symbol: string): {
    liquidityDrop: boolean;
    liquidityIncrease: boolean;
    changePercentage: number;
  } {
    const history = this.liquidityHistory.get(symbol) || [];
    
    if (history.length < 2) {
      return { liquidityDrop: false, liquidityIncrease: false, changePercentage: 0 };
    }

    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    
    const changePercentage = ((current.liquidityScore - previous.liquidityScore) / previous.liquidityScore) * 100;
    
    return {
      liquidityDrop: changePercentage < -20, // 20% drop
      liquidityIncrease: changePercentage > 30, // 30% increase
      changePercentage
    };
  }
}