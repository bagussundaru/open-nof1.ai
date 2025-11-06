// Cumulative Volume Delta (CVD) Calculator
// Real-time calculation from Binance aggregate trades for whale detection

export interface CVDData {
  symbol: string;
  cvd: number;
  cvdChange1h: number;
  cvdChange4h: number;
  cvdChange24h: number;
  buyVolume: number;
  sellVolume: number;
  deltaPressure: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volumeProfile: {
    vwap: number;
    poc: number; // Point of Control
    volumeNodes: Array<{
      price: number;
      volume: number;
      buyVolume: number;
      sellVolume: number;
    }>;
  };
  divergenceSignals: {
    priceCvdDivergence: boolean;
    divergenceType: 'BULLISH' | 'BEARISH' | 'NONE';
    strength: 'WEAK' | 'MODERATE' | 'STRONG';
  };
  whaleActivity: {
    largeTradeThreshold: number;
    whaleTradesCount: number;
    whaleVolume: number;
    whaleDirection: 'BUYING' | 'SELLING' | 'NEUTRAL';
  };
  timestamp: number;
}

export interface TradeData {
  id: number;
  price: number;
  quantity: number;
  time: number;
  isBuyerMaker: boolean; // true = sell order (maker), false = buy order (taker)
}

export class CVDCalculator {
  private cvdHistory: Map<string, number[]> = new Map();
  private priceHistory: Map<string, number[]> = new Map();
  private volumeNodes: Map<string, Map<number, { buy: number; sell: number }>> = new Map();
  
  /**
   * Calculate CVD from aggregate trades
   */
  async calculateCVD(symbol: string, trades: TradeData[]): Promise<CVDData> {
    let cvd = this.getCVDHistory(symbol);
    let buyVolume = 0;
    let sellVolume = 0;
    let totalVolume = 0;
    let vwapNumerator = 0;
    
    // Whale detection parameters
    const avgTradeSize = this.calculateAverageTradeSize(trades);
    const whaleThreshold = avgTradeSize * 10; // 10x average = whale trade
    let whaleTradesCount = 0;
    let whaleVolume = 0;
    let whaleBuyVolume = 0;
    let whaleSellVolume = 0;

    // Process each trade
    trades.forEach(trade => {
      const volume = trade.quantity;
      const value = trade.price * volume;
      
      totalVolume += volume;
      vwapNumerator += value;

      // Update volume nodes for volume profile
      this.updateVolumeNode(symbol, trade.price, volume, !trade.isBuyerMaker);

      // Determine if it's a buy or sell
      if (trade.isBuyerMaker) {
        // Maker = sell order hit by market buy
        sellVolume += volume;
        cvd -= volume;
      } else {
        // Taker = buy order hit by market sell
        buyVolume += volume;
        cvd += volume;
      }

      // Detect whale trades
      if (volume >= whaleThreshold) {
        whaleTradesCount++;
        whaleVolume += volume;
        
        if (trade.isBuyerMaker) {
          whaleSellVolume += volume;
        } else {
          whaleBuyVolume += volume;
        }
      }
    });

    // Update CVD history
    this.updateCVDHistory(symbol, cvd);
    
    // Calculate VWAP
    const vwap = totalVolume > 0 ? vwapNumerator / totalVolume : 0;

    // Calculate CVD changes
    const cvdChanges = this.calculateCVDChanges(symbol);

    // Determine delta pressure
    const deltaPressure = this.calculateDeltaPressure(buyVolume, sellVolume);

    // Detect price-CVD divergence
    const divergenceSignals = this.detectDivergence(symbol, cvd, trades);

    // Calculate volume profile
    const volumeProfile = this.calculateVolumeProfile(symbol, vwap);

    // Determine whale activity direction
    const whaleDirection = this.determineWhaleDirection(whaleBuyVolume, whaleSellVolume);

    return {
      symbol,
      cvd,
      cvdChange1h: cvdChanges.change1h,
      cvdChange4h: cvdChanges.change4h,
      cvdChange24h: cvdChanges.change24h,
      buyVolume,
      sellVolume,
      deltaPressure,
      volumeProfile,
      divergenceSignals,
      whaleActivity: {
        largeTradeThreshold: whaleThreshold,
        whaleTradesCount,
        whaleVolume,
        whaleDirection
      },
      timestamp: Date.now()
    };
  }

  /**
   * Calculate average trade size for whale detection
   */
  private calculateAverageTradeSize(trades: TradeData[]): number {
    if (trades.length === 0) return 0;
    
    const totalVolume = trades.reduce((sum, trade) => sum + trade.quantity, 0);
    return totalVolume / trades.length;
  }

  /**
   * Update volume node for volume profile calculation
   */
  private updateVolumeNode(symbol: string, price: number, volume: number, isBuy: boolean): void {
    if (!this.volumeNodes.has(symbol)) {
      this.volumeNodes.set(symbol, new Map());
    }

    const nodes = this.volumeNodes.get(symbol)!;
    const priceLevel = Math.round(price); // Round to nearest dollar for grouping

    if (!nodes.has(priceLevel)) {
      nodes.set(priceLevel, { buy: 0, sell: 0 });
    }

    const node = nodes.get(priceLevel)!;
    if (isBuy) {
      node.buy += volume;
    } else {
      node.sell += volume;
    }
  }

  /**
   * Get CVD history for a symbol
   */
  private getCVDHistory(symbol: string): number {
    const history = this.cvdHistory.get(symbol) || [0];
    return history[history.length - 1] || 0;
  }

  /**
   * Update CVD history
   */
  private updateCVDHistory(symbol: string, cvd: number): void {
    if (!this.cvdHistory.has(symbol)) {
      this.cvdHistory.set(symbol, []);
    }

    const history = this.cvdHistory.get(symbol)!;
    history.push(cvd);

    // Keep only last 24 hours of data (assuming 1-minute intervals)
    if (history.length > 1440) {
      history.shift();
    }
  }

  /**
   * Calculate CVD changes over different timeframes
   */
  private calculateCVDChanges(symbol: string): {
    change1h: number;
    change4h: number;
    change24h: number;
  } {
    const history = this.cvdHistory.get(symbol) || [];
    const current = history[history.length - 1] || 0;

    // Calculate changes (assuming 1-minute data points)
    const change1h = history.length > 60 ? current - (history[history.length - 61] || 0) : 0;
    const change4h = history.length > 240 ? current - (history[history.length - 241] || 0) : 0;
    const change24h = history.length > 1440 ? current - (history[history.length - 1441] || 0) : 0;

    return { change1h, change4h, change24h };
  }

  /**
   * Calculate delta pressure
   */
  private calculateDeltaPressure(buyVolume: number, sellVolume: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    const totalVolume = buyVolume + sellVolume;
    if (totalVolume === 0) return 'NEUTRAL';

    const buyPercentage = (buyVolume / totalVolume) * 100;

    if (buyPercentage > 60) return 'BULLISH';
    if (buyPercentage < 40) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Detect price-CVD divergence for whale manipulation
   */
  private detectDivergence(symbol: string, currentCVD: number, trades: TradeData[]): {
    priceCvdDivergence: boolean;
    divergenceType: 'BULLISH' | 'BEARISH' | 'NONE';
    strength: 'WEAK' | 'MODERATE' | 'STRONG';
  } {
    if (trades.length === 0) {
      return { priceCvdDivergence: false, divergenceType: 'NONE', strength: 'WEAK' };
    }

    // Get price movement
    const firstPrice = trades[0].price;
    const lastPrice = trades[trades.length - 1].price;
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

    // Get CVD movement
    const cvdHistory = this.cvdHistory.get(symbol) || [];
    if (cvdHistory.length < 2) {
      return { priceCvdDivergence: false, divergenceType: 'NONE', strength: 'WEAK' };
    }

    const previousCVD = cvdHistory[cvdHistory.length - 2];
    const cvdChange = currentCVD - previousCVD;

    // Detect divergence
    const priceUp = priceChange > 0.1; // Price up > 0.1%
    const priceDown = priceChange < -0.1; // Price down > 0.1%
    const cvdUp = cvdChange > 0;
    const cvdDown = cvdChange < 0;

    let divergenceType: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
    let priceCvdDivergence = false;

    // Bullish divergence: Price down but CVD up (hidden buying)
    if (priceDown && cvdUp) {
      divergenceType = 'BULLISH';
      priceCvdDivergence = true;
    }
    // Bearish divergence: Price up but CVD down (hidden selling)
    else if (priceUp && cvdDown) {
      divergenceType = 'BEARISH';
      priceCvdDivergence = true;
    }

    // Calculate strength based on magnitude
    const divergenceStrength = Math.abs(priceChange) + Math.abs(cvdChange / 1000000); // Normalize CVD
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' = 'WEAK';
    
    if (divergenceStrength > 2) strength = 'STRONG';
    else if (divergenceStrength > 1) strength = 'MODERATE';

    return { priceCvdDivergence, divergenceType, strength };
  }

  /**
   * Calculate volume profile
   */
  private calculateVolumeProfile(symbol: string, vwap: number): {
    vwap: number;
    poc: number;
    volumeNodes: Array<{
      price: number;
      volume: number;
      buyVolume: number;
      sellVolume: number;
    }>;
  } {
    const nodes = this.volumeNodes.get(symbol) || new Map();
    
    let maxVolume = 0;
    let poc = vwap; // Point of Control (price with highest volume)

    const volumeNodes = Array.from(nodes.entries()).map(([price, data]) => {
      const totalVolume = data.buy + data.sell;
      
      if (totalVolume > maxVolume) {
        maxVolume = totalVolume;
        poc = price;
      }

      return {
        price,
        volume: totalVolume,
        buyVolume: data.buy,
        sellVolume: data.sell
      };
    }).sort((a, b) => b.volume - a.volume); // Sort by volume descending

    return {
      vwap,
      poc,
      volumeNodes: volumeNodes.slice(0, 20) // Top 20 volume nodes
    };
  }

  /**
   * Determine whale activity direction
   */
  private determineWhaleDirection(whaleBuyVolume: number, whaleSellVolume: number): 'BUYING' | 'SELLING' | 'NEUTRAL' {
    const totalWhaleVolume = whaleBuyVolume + whaleSellVolume;
    
    if (totalWhaleVolume === 0) return 'NEUTRAL';

    const buyPercentage = (whaleBuyVolume / totalWhaleVolume) * 100;

    if (buyPercentage > 65) return 'BUYING';
    if (buyPercentage < 35) return 'SELLING';
    return 'NEUTRAL';
  }

  /**
   * Reset data for a symbol (useful for testing or cleanup)
   */
  resetSymbolData(symbol: string): void {
    this.cvdHistory.delete(symbol);
    this.priceHistory.delete(symbol);
    this.volumeNodes.delete(symbol);
  }

  /**
   * Get current CVD for a symbol
   */
  getCurrentCVD(symbol: string): number {
    return this.getCVDHistory(symbol);
  }

  /**
   * Get volume profile summary
   */
  getVolumeProfileSummary(symbol: string): {
    poc: number;
    totalVolume: number;
    buyDominance: number;
  } | null {
    const nodes = this.volumeNodes.get(symbol);
    if (!nodes || nodes.size === 0) return null;

    let totalVolume = 0;
    let totalBuyVolume = 0;
    let maxVolume = 0;
    let poc = 0;

    nodes.forEach((data, price) => {
      const volume = data.buy + data.sell;
      totalVolume += volume;
      totalBuyVolume += data.buy;

      if (volume > maxVolume) {
        maxVolume = volume;
        poc = price;
      }
    });

    return {
      poc,
      totalVolume,
      buyDominance: totalVolume > 0 ? (totalBuyVolume / totalVolume) * 100 : 50
    };
  }
}

// Export singleton instance
let cvdCalculator: CVDCalculator | null = null;

export function getCVDCalculator(): CVDCalculator {
  if (!cvdCalculator) {
    cvdCalculator = new CVDCalculator();
  }
  return cvdCalculator;
}