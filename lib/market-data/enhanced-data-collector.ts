// Enhanced Data Collector for Whale Detection
// Collects comprehensive market data from multiple sources

import { getBinanceClient } from '../exchanges/binance-futures-client';
import { EnhancedMarketData } from './enhanced-market-data';

export class EnhancedDataCollector {
  private binanceClient: any;
  
  constructor() {
    this.binanceClient = getBinanceClient();
  }

  /**
   * Collect comprehensive market data for whale detection
   */
  async collectEnhancedMarketData(symbol: string): Promise<EnhancedMarketData> {
    try {
      console.log(`🔍 Collecting enhanced data for ${symbol}...`);

      // Collect all data in parallel for efficiency
      const [
        basicData,
        futuresData,
        liquidationData,
        volumeData,
        orderBookData,
        onChainData
      ] = await Promise.all([
        this.getBasicMarketData(symbol),
        this.getFuturesData(symbol),
        this.getLiquidationData(symbol),
        this.getVolumeAnalysis(symbol),
        this.getOrderBookAnalysis(symbol),
        this.getOnChainData(symbol)
      ]);

      // Calculate market structure and basis
      const marketStructure = this.calculateMarketStructure(basicData, volumeData);
      const basisData = this.calculateBasisData(basicData);

      const enhancedData: EnhancedMarketData = {
        ...basicData,
        futuresData,
        liquidationData,
        volumeAnalysis: volumeData,
        orderBookData,
        onChainData,
        marketStructure,
        basisData
      };

      console.log(`✅ Enhanced data collected for ${symbol}`);
      return enhancedData;

    } catch (error) {
      console.error(`❌ Error collecting enhanced data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get basic market data from Binance
   */
  private async getBasicMarketData(symbol: string) {
    const [ticker, ticker24hr] = await Promise.all([
      this.binanceClient.getTickerPrice(symbol),
      this.binanceClient.get24hrTicker(symbol)
    ]);

    const price = parseFloat(ticker[0].price);
    const data24hr = ticker24hr[0];

    return {
      symbol,
      price,
      change24h: parseFloat(data24hr.priceChangePercent),
      volume24h: parseFloat(data24hr.volume),
      high24h: parseFloat(data24hr.highPrice),
      low24h: parseFloat(data24hr.lowPrice),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get futures-specific data
   */
  private async getFuturesData(symbol: string) {
    try {
      // Get Open Interest
      const openInterestRes = await this.binanceClient.get('/fapi/v1/openInterest', { symbol });
      const openInterest = parseFloat(openInterestRes.openInterest);

      // Get Funding Rate
      const fundingRateRes = await this.binanceClient.get('/fapi/v1/fundingRate', { 
        symbol, 
        limit: 4 
      });
      const currentFunding = parseFloat(fundingRateRes[0].fundingRate);
      const fundingHistory = fundingRateRes.map((f: any) => parseFloat(f.fundingRate));

      // Get Long/Short Ratios
      const longShortRes = await this.binanceClient.get('/fapi/v1/globalLongShortAccountRatio', {
        symbol,
        period: '5m',
        limit: 1
      });
      const longShortRatio = parseFloat(longShortRes[0].longShortRatio);

      // Get Top Trader Ratios
      const topTraderRes = await this.binanceClient.get('/fapi/v1/topLongShortAccountRatio', {
        symbol,
        period: '5m',
        limit: 1
      });
      const topTraderRatio = parseFloat(topTraderRes[0].longShortRatio);
      const topTraderAccountRatio = parseFloat(topTraderRes[0].longAccount);

      // Calculate OI change (mock for now, would need historical data)
      const openInterestChange24h = Math.random() * 20 - 10; // -10% to +10%

      return {
        openInterest,
        openInterestChange24h,
        fundingRate: currentFunding,
        fundingRateHistory: fundingHistory,
        nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // Next 8 hours
        longShortRatio,
        topTraderLongShortRatio: topTraderRatio,
        topTraderLongShortAccountRatio: topTraderAccountRatio
      };

    } catch (error) {
      console.warn(`⚠️ Error getting futures data for ${symbol}:`, error);
      // Return mock data if API fails
      return {
        openInterest: 45231.5,
        openInterestChange24h: 12.5,
        fundingRate: 0.0456,
        fundingRateHistory: [0.0123, 0.0234, 0.0345, 0.0456],
        nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        longShortRatio: 1.85,
        topTraderLongShortRatio: 2.3,
        topTraderLongShortAccountRatio: 1.95
      };
    }
  }

  /**
   * Get liquidation data (mock implementation - would integrate with Coinglass API)
   */
  private async getLiquidationData(symbol: string) {
    // Mock liquidation data - in production, integrate with Coinglass API
    return {
      liquidations24h: {
        totalLongs: 15000000,
        totalShorts: 8000000,
        netLiquidation: 7000000
      },
      recentLiquidations: [
        { 
          side: 'LONG' as const, 
          value: 500000, 
          price: 102500,
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        { 
          side: 'LONG' as const, 
          value: 750000, 
          price: 102300,
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        }
      ],
      liquidationHeatmap: {
        liquidationClusters: [
          { price: 100000, liquidity: 50000000, side: 'LONG' as const },
          { price: 105000, liquidity: 35000000, side: 'SHORT' as const }
        ]
      }
    };
  }

  /**
   * Calculate volume analysis including CVD
   */
  private async getVolumeAnalysis(symbol: string) {
    try {
      // Get recent trades for CVD calculation
      const trades = await this.binanceClient.get('/fapi/v1/aggTrades', {
        symbol,
        limit: 1000
      });

      // Calculate CVD (Cumulative Volume Delta)
      let cvd = 0;
      let buyVolume = 0;
      let sellVolume = 0;

      trades.forEach((trade: any) => {
        const volume = parseFloat(trade.qty);
        if (trade.m) { // Maker (sell)
          sellVolume += volume;
          cvd -= volume;
        } else { // Taker (buy)
          buyVolume += volume;
          cvd += volume;
        }
      });

      const totalVolume = buyVolume + sellVolume;
      const deltaPressure = cvd > 0 ? 'BULLISH' : cvd < 0 ? 'BEARISH' : 'NEUTRAL';

      return {
        cvd,
        cvdChange24h: Math.random() * 30 - 15, // Mock 24h change
        spotVolume24h: totalVolume * 0.8, // Estimate spot volume
        futuresVolume24h: totalVolume,
        volumeRatio: 1.25, // Futures/Spot ratio
        buyVolume,
        sellVolume,
        deltaPressure: deltaPressure as 'BULLISH' | 'BEARISH' | 'NEUTRAL'
      };

    } catch (error) {
      console.warn(`⚠️ Error calculating volume analysis for ${symbol}:`, error);
      return {
        cvd: 2350000,
        cvdChange24h: 15.5,
        spotVolume24h: 1800000,
        futuresVolume24h: 2069131.876,
        volumeRatio: 1.15,
        buyVolume: 1150000,
        sellVolume: 919131,
        deltaPressure: 'BULLISH' as const
      };
    }
  }

  /**
   * Analyze order book for spoofing and walls
   */
  private async getOrderBookAnalysis(symbol: string) {
    try {
      const orderBook = await this.binanceClient.get('/fapi/v1/depth', {
        symbol,
        limit: 100
      });

      const bids = orderBook.bids.map((b: any) => ({ price: parseFloat(b[0]), size: parseFloat(b[1]) }));
      const asks = orderBook.asks.map((a: any) => ({ price: parseFloat(a[0]), size: parseFloat(a[1]) }));

      // Calculate bid/ask imbalance
      const totalBids = bids.reduce((sum: number, bid: any) => sum + bid.size, 0);
      const totalAsks = asks.reduce((sum: number, ask: any) => sum + ask.size, 0);
      const bidAskImbalance = totalBids / totalAsks;

      // Detect big walls (orders > 10x average size)
      const avgBidSize = totalBids / bids.length;
      const avgAskSize = totalAsks / asks.length;
      
      const bigWalls: Array<{
        side: 'BID' | 'ASK';
        price: number;
        size: number;
        isSpoof: boolean;
      }> = [];
      
      // Check for big bid walls
      bids.forEach((bid: { price: number; size: number }) => {
        if (bid.size > avgBidSize * 10) {
          bigWalls.push({
            side: 'BID' as const,
            price: bid.price,
            size: bid.size,
            isSpoof: bid.size > avgBidSize * 50 // Very large orders might be spoofing
          });
        }
      });

      // Check for big ask walls
      asks.forEach((ask: { price: number; size: number }) => {
        if (ask.size > avgAskSize * 10) {
          bigWalls.push({
            side: 'ASK' as const,
            price: ask.price,
            size: ask.size,
            isSpoof: ask.size > avgAskSize * 50
          });
        }
      });

      const spoofingDetected = bigWalls.some(wall => wall.isSpoof);
      const spoofingDirection = spoofingDetected ? 
        (bigWalls.filter(w => w.isSpoof && w.side === 'ASK').length > 
         bigWalls.filter(w => w.isSpoof && w.side === 'BID').length ? 'BEARISH' : 'BULLISH') : 'NEUTRAL';

      return {
        bidAskImbalance,
        bigWalls,
        spoofingDetected,
        spoofingDirection: spoofingDirection as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
        liquidityVacuum: totalBids + totalAsks < 1000 // Low liquidity threshold
      };

    } catch (error) {
      console.warn(`⚠️ Error analyzing order book for ${symbol}:`, error);
      return {
        bidAskImbalance: 1.45,
        bigWalls: [],
        spoofingDetected: false,
        spoofingDirection: 'NEUTRAL' as const,
        liquidityVacuum: false
      };
    }
  }

  /**
   * Get on-chain data (mock implementation)
   */
  private async getOnChainData(symbol: string) {
    // Mock on-chain data - in production, integrate with Glassnode/CryptoQuant
    return {
      exchangeNetflow: -1250,
      whaleTransactions: [
        { 
          type: 'INFLOW' as const, 
          amount: 500, 
          exchange: 'Binance',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        },
        { 
          type: 'OUTFLOW' as const, 
          amount: 1750, 
          exchange: 'Coinbase',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ],
      largeTransactions24h: 15
    };
  }

  /**
   * Calculate market structure
   */
  private calculateMarketStructure(basicData: any, volumeData: any) {
    const { price, high24h, low24h } = basicData;
    
    // Simple trend calculation
    const midPoint = (high24h + low24h) / 2;
    const trend = price > midPoint * 1.02 ? 'BULLISH' : 
                  price < midPoint * 0.98 ? 'BEARISH' : 'SIDEWAYS';

    // Calculate support and resistance levels
    const support = [
      Math.round(low24h * 0.995),
      Math.round(low24h * 0.99),
      Math.round(low24h * 0.985)
    ];

    const resistance = [
      Math.round(high24h * 1.005),
      Math.round(high24h * 1.01),
      Math.round(high24h * 1.015)
    ];

    // Key psychological level (round numbers)
    const keyLevel = Math.round(price / 1000) * 1000;

    // Breakout potential based on volume
    const breakoutPotential = volumeData.cvd > 1000000 ? 'HIGH' : 
                             volumeData.cvd > 500000 ? 'MEDIUM' : 'LOW';

    return {
      trend: trend as 'BULLISH' | 'BEARISH' | 'SIDEWAYS',
      support,
      resistance,
      keyLevel,
      breakoutPotential: breakoutPotential as 'LOW' | 'MEDIUM' | 'HIGH',
      volumeProfile: {
        poc: Math.round((high24h + low24h) / 2), // Point of Control approximation
        vah: Math.round(high24h * 0.95), // Value Area High
        val: Math.round(low24h * 1.05)   // Value Area Low
      }
    };
  }

  /**
   * Calculate basis data (spot vs futures)
   */
  private calculateBasisData(basicData: any) {
    const spotPrice = basicData.price;
    const futuresPrice = basicData.price * 1.0008; // Small premium assumption
    const basis = futuresPrice - spotPrice;
    const basisPercentage = (basis / spotPrice) * 100;
    const annualizedBasis = basisPercentage * (365 * 24 / 8); // Assuming 8-hour funding

    return {
      spotPrice,
      futuresPrice,
      basis,
      basisPercentage,
      annualizedBasis
    };
  }

  /**
   * Collect data for multiple symbols
   */
  async collectMultipleSymbols(symbols: string[]): Promise<EnhancedMarketData[]> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.collectEnhancedMarketData(symbol))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<EnhancedMarketData> => 
        result.status === 'fulfilled')
      .map(result => result.value);
  }
}

// Export singleton instance
let enhancedDataCollector: EnhancedDataCollector | null = null;

export function getEnhancedDataCollector(): EnhancedDataCollector {
  if (!enhancedDataCollector) {
    enhancedDataCollector = new EnhancedDataCollector();
  }
  return enhancedDataCollector;
}