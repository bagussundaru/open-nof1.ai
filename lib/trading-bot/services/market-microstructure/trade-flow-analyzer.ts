// Trade Flow Analysis Service
// Implements volume profile analysis, market maker vs taker flow detection, and institutional flow identification

import { EventEmitter } from 'events';
import { MarketData, TradeExecution } from '../../types';

export interface TradeData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  tradeType: 'market' | 'limit';
  isAggressive: boolean;
}

export interface VolumeProfile {
  symbol: string;
  timestamp: number;
  priceLevel: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  tradeCount: number;
  averageTradeSize: number;
  volumePercentage: number;
}

export interface MarketMakerTakerFlow {
  symbol: string;
  timestamp: number;
  makerVolume: number;
  takerVolume: number;
  makerBuyVolume: number;
  makerSellVolume: number;
  takerBuyVolume: number;
  takerSellVolume: number;
  makerTakerRatio: number;
  aggressiveFlow: 'buy' | 'sell' | 'neutral';
  flowStrength: number;
}

export interface InstitutionalFlow {
  symbol: string;
  timestamp: number;
  largeTradeVolume: number;
  largeTradeCount: number;
  averageLargeTradeSize: number;
  institutionalBuyVolume: number;
  institutionalSellVolume: number;
  institutionalFlow: 'buy' | 'sell' | 'neutral';
  flowIntensity: number;
  blockTradeDetected: boolean;
}

export interface TradeFlowConfig {
  volumeProfileBins: number;
  largeTradeThreshold: number;
  blockTradeThreshold: number;
  timeWindowMinutes: number;
  priceTickSize: number;
  institutionalVolumeThreshold: number;
}

export class TradeFlowAnalyzer extends EventEmitter {
  private config: TradeFlowConfig;
  private tradeHistory: Map<string, TradeData[]> = new Map();
  private volumeProfiles: Map<string, VolumeProfile[]> = new Map();
  private makerTakerHistory: Map<string, MarketMakerTakerFlow[]> = new Map();
  private institutionalHistory: Map<string, InstitutionalFlow[]> = new Map();
  private maxHistoryLength: number = 1000;

  constructor(config: TradeFlowConfig) {
    super();
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.volumeProfileBins <= 0) {
      throw new Error('Volume profile bins must be positive');
    }
    if (this.config.largeTradeThreshold <= 0) {
      throw new Error('Large trade threshold must be positive');
    }
    if (this.config.timeWindowMinutes <= 0) {
      throw new Error('Time window must be positive');
    }
  }

  /**
   * Process new trade data and perform flow analysis
   */
  processTrade(tradeData: TradeData): {
    volumeProfile: VolumeProfile[];
    makerTakerFlow: MarketMakerTakerFlow;
    institutionalFlow: InstitutionalFlow;
  } {
    const { symbol } = tradeData;

    // Store trade in history
    this.storeTradeHistory(symbol, tradeData);

    // Perform analyses
    const volumeProfile = this.analyzeVolumeProfile(symbol);
    const makerTakerFlow = this.analyzeMakerTakerFlow(symbol);
    const institutionalFlow = this.analyzeInstitutionalFlow(symbol);

    // Store analysis results
    this.storeAnalysisResults(symbol, volumeProfile, makerTakerFlow, institutionalFlow);

    // Emit events for significant findings
    if (institutionalFlow.blockTradeDetected) {
      this.emit('blockTradeDetected', institutionalFlow);
    }

    if (Math.abs(makerTakerFlow.flowStrength) > 0.7) {
      this.emit('strongFlow', makerTakerFlow);
    }

    return { volumeProfile, makerTakerFlow, institutionalFlow };
  }

  /**
   * Create volume profile analysis
   */
  private analyzeVolumeProfile(symbol: string): VolumeProfile[] {
    const trades = this.getRecentTrades(symbol);
    
    if (trades.length === 0) {
      return [];
    }

    // Find price range
    const prices = trades.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    if (priceRange === 0) {
      // All trades at same price
      const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
      const buyVolume = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.volume, 0);
      const sellVolume = totalVolume - buyVolume;
      
      return [{
        symbol,
        timestamp: Date.now(),
        priceLevel: minPrice,
        volume: totalVolume,
        buyVolume,
        sellVolume,
        tradeCount: trades.length,
        averageTradeSize: totalVolume / trades.length,
        volumePercentage: 100
      }];
    }

    // Create price bins
    const binSize = priceRange / this.config.volumeProfileBins;
    const bins: Map<number, {
      volume: number;
      buyVolume: number;
      sellVolume: number;
      tradeCount: number;
    }> = new Map();

    // Initialize bins
    for (let i = 0; i < this.config.volumeProfileBins; i++) {
      const priceLevel = minPrice + (i * binSize);
      bins.set(priceLevel, {
        volume: 0,
        buyVolume: 0,
        sellVolume: 0,
        tradeCount: 0
      });
    }

    // Aggregate trades into bins
    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
    
    for (const trade of trades) {
      const binIndex = Math.floor((trade.price - minPrice) / binSize);
      const priceLevel = minPrice + (binIndex * binSize);
      
      const bin = bins.get(priceLevel);
      if (bin) {
        bin.volume += trade.volume;
        bin.tradeCount += 1;
        
        if (trade.side === 'buy') {
          bin.buyVolume += trade.volume;
        } else {
          bin.sellVolume += trade.volume;
        }
      }
    }

    // Convert to VolumeProfile array
    const volumeProfile: VolumeProfile[] = [];
    
    for (const [priceLevel, bin] of bins.entries()) {
      if (bin.volume > 0) {
        volumeProfile.push({
          symbol,
          timestamp: Date.now(),
          priceLevel,
          volume: bin.volume,
          buyVolume: bin.buyVolume,
          sellVolume: bin.sellVolume,
          tradeCount: bin.tradeCount,
          averageTradeSize: bin.volume / bin.tradeCount,
          volumePercentage: (bin.volume / totalVolume) * 100
        });
      }
    }

    return volumeProfile.sort((a, b) => b.volume - a.volume); // Sort by volume descending
  }

  /**
   * Analyze market maker vs taker flow
   */
  private analyzeMakerTakerFlow(symbol: string): MarketMakerTakerFlow {
    const trades = this.getRecentTrades(symbol);
    
    if (trades.length === 0) {
      return this.createEmptyMakerTakerFlow(symbol);
    }

    let makerVolume = 0;
    let takerVolume = 0;
    let makerBuyVolume = 0;
    let makerSellVolume = 0;
    let takerBuyVolume = 0;
    let takerSellVolume = 0;

    for (const trade of trades) {
      if (trade.isAggressive) {
        // Aggressive trades are typically taker trades
        takerVolume += trade.volume;
        if (trade.side === 'buy') {
          takerBuyVolume += trade.volume;
        } else {
          takerSellVolume += trade.volume;
        }
      } else {
        // Non-aggressive trades are typically maker trades
        makerVolume += trade.volume;
        if (trade.side === 'buy') {
          makerBuyVolume += trade.volume;
        } else {
          makerSellVolume += trade.volume;
        }
      }
    }

    const totalVolume = makerVolume + takerVolume;
    const makerTakerRatio = totalVolume > 0 ? makerVolume / takerVolume : 0;

    // Determine aggressive flow direction
    const netTakerFlow = takerBuyVolume - takerSellVolume;
    let aggressiveFlow: 'buy' | 'sell' | 'neutral';
    
    if (Math.abs(netTakerFlow) < takerVolume * 0.1) {
      aggressiveFlow = 'neutral';
    } else {
      aggressiveFlow = netTakerFlow > 0 ? 'buy' : 'sell';
    }

    // Calculate flow strength (0-1)
    const flowStrength = totalVolume > 0 ? Math.abs(netTakerFlow) / totalVolume : 0;

    return {
      symbol,
      timestamp: Date.now(),
      makerVolume,
      takerVolume,
      makerBuyVolume,
      makerSellVolume,
      takerBuyVolume,
      takerSellVolume,
      makerTakerRatio,
      aggressiveFlow,
      flowStrength
    };
  }

  /**
   * Analyze institutional flow patterns
   */
  private analyzeInstitutionalFlow(symbol: string): InstitutionalFlow {
    const trades = this.getRecentTrades(symbol);
    
    if (trades.length === 0) {
      return this.createEmptyInstitutionalFlow(symbol);
    }

    // Identify large trades (potential institutional activity)
    const largeTrades = trades.filter(t => t.volume >= this.config.largeTradeThreshold);
    const blockTrades = trades.filter(t => t.volume >= this.config.blockTradeThreshold);

    const largeTradeVolume = largeTrades.reduce((sum, t) => sum + t.volume, 0);
    const largeTradeCount = largeTrades.length;
    const averageLargeTradeSize = largeTradeCount > 0 ? largeTradeVolume / largeTradeCount : 0;

    // Separate institutional buy/sell volume
    const institutionalBuyVolume = largeTrades
      .filter(t => t.side === 'buy')
      .reduce((sum, t) => sum + t.volume, 0);
    
    const institutionalSellVolume = largeTrades
      .filter(t => t.side === 'sell')
      .reduce((sum, t) => sum + t.volume, 0);

    // Determine institutional flow direction
    const netInstitutionalFlow = institutionalBuyVolume - institutionalSellVolume;
    let institutionalFlow: 'buy' | 'sell' | 'neutral';
    
    if (Math.abs(netInstitutionalFlow) < largeTradeVolume * 0.15) {
      institutionalFlow = 'neutral';
    } else {
      institutionalFlow = netInstitutionalFlow > 0 ? 'buy' : 'sell';
    }

    // Calculate flow intensity (0-1)
    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
    const flowIntensity = totalVolume > 0 ? largeTradeVolume / totalVolume : 0;

    // Detect block trades
    const blockTradeDetected = blockTrades.length > 0;

    return {
      symbol,
      timestamp: Date.now(),
      largeTradeVolume,
      largeTradeCount,
      averageLargeTradeSize,
      institutionalBuyVolume,
      institutionalSellVolume,
      institutionalFlow,
      flowIntensity,
      blockTradeDetected
    };
  }

  /**
   * Store trade in history
   */
  private storeTradeHistory(symbol: string, tradeData: TradeData): void {
    if (!this.tradeHistory.has(symbol)) {
      this.tradeHistory.set(symbol, []);
    }

    const history = this.tradeHistory.get(symbol)!;
    history.push(tradeData);

    // Maintain max history length
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Get recent trades within time window
   */
  private getRecentTrades(symbol: string): TradeData[] {
    const history = this.tradeHistory.get(symbol) || [];
    const cutoffTime = Date.now() - (this.config.timeWindowMinutes * 60 * 1000);
    
    return history.filter(trade => trade.timestamp >= cutoffTime);
  }

  /**
   * Store analysis results
   */
  private storeAnalysisResults(
    symbol: string,
    volumeProfile: VolumeProfile[],
    makerTakerFlow: MarketMakerTakerFlow,
    institutionalFlow: InstitutionalFlow
  ): void {
    // Store volume profiles
    if (!this.volumeProfiles.has(symbol)) {
      this.volumeProfiles.set(symbol, []);
    }
    // Store only the highest volume level for history
    if (volumeProfile.length > 0) {
      const profiles = this.volumeProfiles.get(symbol)!;
      profiles.push(volumeProfile[0]);
      if (profiles.length > this.maxHistoryLength) {
        profiles.shift();
      }
    }

    // Store maker-taker flow
    if (!this.makerTakerHistory.has(symbol)) {
      this.makerTakerHistory.set(symbol, []);
    }
    const makerTakerHist = this.makerTakerHistory.get(symbol)!;
    makerTakerHist.push(makerTakerFlow);
    if (makerTakerHist.length > this.maxHistoryLength) {
      makerTakerHist.shift();
    }

    // Store institutional flow
    if (!this.institutionalHistory.has(symbol)) {
      this.institutionalHistory.set(symbol, []);
    }
    const institutionalHist = this.institutionalHistory.get(symbol)!;
    institutionalHist.push(institutionalFlow);
    if (institutionalHist.length > this.maxHistoryLength) {
      institutionalHist.shift();
    }
  }

  /**
   * Create empty maker-taker flow object
   */
  private createEmptyMakerTakerFlow(symbol: string): MarketMakerTakerFlow {
    return {
      symbol,
      timestamp: Date.now(),
      makerVolume: 0,
      takerVolume: 0,
      makerBuyVolume: 0,
      makerSellVolume: 0,
      takerBuyVolume: 0,
      takerSellVolume: 0,
      makerTakerRatio: 0,
      aggressiveFlow: 'neutral',
      flowStrength: 0
    };
  }

  /**
   * Create empty institutional flow object
   */
  private createEmptyInstitutionalFlow(symbol: string): InstitutionalFlow {
    return {
      symbol,
      timestamp: Date.now(),
      largeTradeVolume: 0,
      largeTradeCount: 0,
      averageLargeTradeSize: 0,
      institutionalBuyVolume: 0,
      institutionalSellVolume: 0,
      institutionalFlow: 'neutral',
      flowIntensity: 0,
      blockTradeDetected: false
    };
  }

  /**
   * Get volume profile history
   */
  getVolumeProfileHistory(symbol: string): VolumeProfile[] {
    return this.volumeProfiles.get(symbol) || [];
  }

  /**
   * Get maker-taker flow history
   */
  getMakerTakerFlowHistory(symbol: string): MarketMakerTakerFlow[] {
    return this.makerTakerHistory.get(symbol) || [];
  }

  /**
   * Get institutional flow history
   */
  getInstitutionalFlowHistory(symbol: string): InstitutionalFlow[] {
    return this.institutionalHistory.get(symbol) || [];
  }

  /**
   * Get current flow summary
   */
  getCurrentFlowSummary(symbol: string): {
    makerTakerFlow?: MarketMakerTakerFlow;
    institutionalFlow?: InstitutionalFlow;
    dominantVolumeLevel?: VolumeProfile;
  } {
    const makerTakerHist = this.makerTakerHistory.get(symbol);
    const institutionalHist = this.institutionalHistory.get(symbol);
    const volumeHist = this.volumeProfiles.get(symbol);

    return {
      makerTakerFlow: makerTakerHist?.[makerTakerHist.length - 1],
      institutionalFlow: institutionalHist?.[institutionalHist.length - 1],
      dominantVolumeLevel: volumeHist?.[volumeHist.length - 1]
    };
  }

  /**
   * Detect flow regime changes
   */
  detectFlowRegimeChange(symbol: string): {
    makerTakerRegimeChange: boolean;
    institutionalRegimeChange: boolean;
    changeDirection: 'bullish' | 'bearish' | 'neutral';
  } {
    const makerTakerHist = this.makerTakerHistory.get(symbol) || [];
    const institutionalHist = this.institutionalHistory.get(symbol) || [];

    if (makerTakerHist.length < 2 || institutionalHist.length < 2) {
      return {
        makerTakerRegimeChange: false,
        institutionalRegimeChange: false,
        changeDirection: 'neutral'
      };
    }

    const currentMT = makerTakerHist[makerTakerHist.length - 1];
    const previousMT = makerTakerHist[makerTakerHist.length - 2];
    
    const currentInst = institutionalHist[institutionalHist.length - 1];
    const previousInst = institutionalHist[institutionalHist.length - 2];

    // Detect maker-taker regime change
    const makerTakerRegimeChange = currentMT.aggressiveFlow !== previousMT.aggressiveFlow;
    
    // Detect institutional regime change
    const institutionalRegimeChange = currentInst.institutionalFlow !== previousInst.institutionalFlow;

    // Determine overall change direction
    let changeDirection: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (currentMT.aggressiveFlow === 'buy' && currentInst.institutionalFlow === 'buy') {
      changeDirection = 'bullish';
    } else if (currentMT.aggressiveFlow === 'sell' && currentInst.institutionalFlow === 'sell') {
      changeDirection = 'bearish';
    }

    return {
      makerTakerRegimeChange,
      institutionalRegimeChange,
      changeDirection
    };
  }

  /**
   * Calculate flow momentum
   */
  calculateFlowMomentum(symbol: string, periods: number = 5): {
    makerTakerMomentum: number;
    institutionalMomentum: number;
    overallMomentum: number;
  } {
    const makerTakerHist = this.makerTakerHistory.get(symbol) || [];
    const institutionalHist = this.institutionalHistory.get(symbol) || [];

    if (makerTakerHist.length < periods || institutionalHist.length < periods) {
      return {
        makerTakerMomentum: 0,
        institutionalMomentum: 0,
        overallMomentum: 0
      };
    }

    // Calculate maker-taker momentum
    const recentMT = makerTakerHist.slice(-periods);
    const mtMomentum = recentMT.reduce((sum, flow) => {
      let score = 0;
      if (flow.aggressiveFlow === 'buy') score = flow.flowStrength;
      else if (flow.aggressiveFlow === 'sell') score = -flow.flowStrength;
      return sum + score;
    }, 0) / periods;

    // Calculate institutional momentum
    const recentInst = institutionalHist.slice(-periods);
    const instMomentum = recentInst.reduce((sum, flow) => {
      let score = 0;
      if (flow.institutionalFlow === 'buy') score = flow.flowIntensity;
      else if (flow.institutionalFlow === 'sell') score = -flow.flowIntensity;
      return sum + score;
    }, 0) / periods;

    // Overall momentum (weighted average)
    const overallMomentum = (mtMomentum * 0.6) + (instMomentum * 0.4);

    return {
      makerTakerMomentum: mtMomentum,
      institutionalMomentum: instMomentum,
      overallMomentum
    };
  }
}