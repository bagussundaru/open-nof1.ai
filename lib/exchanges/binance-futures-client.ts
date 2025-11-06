import * as crypto from 'crypto';

export interface BinanceBalance {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  maintMargin: string;
  initialMargin: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  crossWalletBalance: string;
  crossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
}

export interface BinancePosition {
  symbol: string;
  initialMargin: string;
  maintMargin: string;
  unrealizedProfit: string;
  positionInitialMargin: string;
  openOrderInitialMargin: string;
  leverage: string;
  isolated: boolean;
  entryPrice: string;
  breakEvenPrice: string;
  maxNotional: string;
  positionSide: string;
  positionAmt: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

export interface BinanceAccountInfo {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  totalInitialMargin: string;
  totalMaintMargin: string;
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  totalCrossWalletBalance: string;
  totalCrossUnPnl: string;
  availableBalance: string;
  maxWithdrawAmount: string;
  assets: BinanceBalance[];
  positions: BinancePosition[];
}

export interface BinanceTickerPrice {
  symbol: string;
  price: string;
  time: number;
}

export class BinanceFuturesClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor(apiKey: string, apiSecret: string, testnet: boolean = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = testnet 
      ? 'https://testnet.binancefuture.com'
      : 'https://fapi.binance.com';
  }

  // ===== NEW: WHALE DETECTION ENDPOINTS =====
  
  /**
   * Get Open Interest for whale detection
   */
  async getOpenInterest(symbol: string): Promise<any> {
    return this.makeRequest('/fapi/v1/openInterest', { symbol });
  }

  /**
   * Get Funding Rate for manipulation detection
   */
  async getFundingRate(symbol: string, limit: number = 100): Promise<any> {
    return this.makeRequest('/fapi/v1/fundingRate', { symbol, limit });
  }

  /**
   * Get Long/Short Ratio for retail sentiment
   */
  async getLongShortRatio(symbol: string, period: string = '5m', limit: number = 30): Promise<any> {
    return this.makeRequest('/fapi/v1/globalLongShortAccountRatio', { symbol, period, limit });
  }

  /**
   * Get Top Trader Long/Short Ratio for smart money sentiment
   */
  async getTopTraderLongShortRatio(symbol: string, period: string = '5m', limit: number = 30): Promise<any> {
    return this.makeRequest('/fapi/v1/topLongShortAccountRatio', { symbol, period, limit });
  }

  /**
   * Get Taker Long/Short Ratio for aggressive trading sentiment
   */
  async getTakerLongShortRatio(symbol: string, period: string = '5m', limit: number = 30): Promise<any> {
    return this.makeRequest('/fapi/v1/takerlongshortRatio', { symbol, period, limit });
  }

  /**
   * Get Order Book for spoofing detection
   */
  async getOrderBook(symbol: string, limit: number = 1000): Promise<any> {
    return this.makeRequest('/fapi/v1/depth', { symbol, limit });
  }

  /**
   * Get Aggregate Trades for CVD calculation
   */
  async getAggTrades(symbol: string, limit: number = 1000): Promise<any> {
    return this.makeRequest('/fapi/v1/aggTrades', { symbol, limit });
  }

  /**
   * Get Kline/Candlestick data for technical analysis
   */
  async getKlines(symbol: string, interval: string = '1m', limit: number = 500): Promise<any> {
    return this.makeRequest('/fapi/v1/klines', { symbol, interval, limit });
  }

  /**
   * Get Mark Price and Funding Rate
   */
  async getMarkPrice(symbol?: string): Promise<any> {
    const params = symbol ? { symbol } : {};
    return this.makeRequest('/fapi/v1/premiumIndex', params);
  }

  /**
   * Get Open Interest Statistics
   */
  async getOpenInterestStats(symbol: string, period: string = '5m', limit: number = 30): Promise<any> {
    return this.makeRequest('/fapi/v1/openInterestHist', { symbol, period, limit });
  }

  private createSignature(queryString: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}, method: 'GET' | 'POST' = 'GET'): Promise<any> {
    const timestamp = Date.now();
    const queryParams = new URLSearchParams({
      ...params,
      timestamp: timestamp.toString()
    });

    const queryString = queryParams.toString();
    const signature = this.createSignature(queryString);
    const finalUrl = `${this.baseUrl}${endpoint}?${queryString}&signature=${signature}`;

    const response = await fetch(finalUrl, {
      method,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getAccountInfo(): Promise<BinanceAccountInfo> {
    return this.makeRequest('/fapi/v2/account');
  }

  async getBalance(): Promise<BinanceBalance[]> {
    const accountInfo = await this.getAccountInfo();
    return accountInfo.assets.filter(asset => 
      parseFloat(asset.walletBalance) > 0 || parseFloat(asset.marginBalance) > 0
    );
  }

  async getPositions(): Promise<BinancePosition[]> {
    const accountInfo = await this.getAccountInfo();
    return accountInfo.positions.filter(position => 
      parseFloat(position.positionAmt) !== 0
    );
  }

  async getTickerPrice(symbol?: string): Promise<BinanceTickerPrice[]> {
    const endpoint = '/fapi/v1/ticker/price';
    const params = symbol ? { symbol } : {};
    const result = await this.makeRequest(endpoint, params);
    
    // If single symbol, wrap in array
    return Array.isArray(result) ? result : [result];
  }

  async get24hrTicker(symbol?: string): Promise<any> {
    const endpoint = '/fapi/v1/ticker/24hr';
    const params = symbol ? { symbol } : {};
    const result = await this.makeRequest(endpoint, params);
    
    return Array.isArray(result) ? result : [result];
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/fapi/v1/ping');
      return true;
    } catch (error) {
      console.error('Binance connection test failed:', error);
      return false;
    }
  }

  // Get formatted balance for dashboard
  async getFormattedBalance(): Promise<{
    totalBalance: number;
    availableBalance: number;
    unrealizedPnl: number;
    assets: Array<{
      asset: string;
      balance: number;
      available: number;
      usdValue: number;
    }>;
  }> {
    try {
      const accountInfo = await this.getAccountInfo();
      
      const totalBalance = parseFloat(accountInfo.totalWalletBalance);
      const availableBalance = parseFloat(accountInfo.availableBalance);
      const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit);

      const assets = accountInfo.assets
        .filter(asset => parseFloat(asset.walletBalance) > 0.001)
        .map(asset => ({
          asset: asset.asset,
          balance: parseFloat(asset.walletBalance),
          available: parseFloat(asset.availableBalance),
          usdValue: asset.asset === 'USDT' ? parseFloat(asset.walletBalance) : 0
        }));

      return {
        totalBalance,
        availableBalance,
        unrealizedPnl,
        assets
      };
    } catch (error) {
      console.error('Error getting formatted balance:', error);
      throw error;
    }
  }

  // Get formatted positions for dashboard
  async getFormattedPositions(): Promise<Array<{
    symbol: string;
    side: 'LONG' | 'SHORT';
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    pnlPercent: number;
    leverage: number;
  }>> {
    try {
      const positions = await this.getPositions();
      const tickers = await this.getTickerPrice();
      
      const tickerMap = new Map(
        tickers.map(ticker => [ticker.symbol, parseFloat(ticker.price)])
      );

      return positions.map(position => {
        const size = Math.abs(parseFloat(position.positionAmt));
        const entryPrice = parseFloat(position.entryPrice);
        const markPrice = tickerMap.get(position.symbol) || entryPrice;
        const pnl = parseFloat(position.unrealizedProfit);
        const notional = parseFloat(position.notional);
        const pnlPercent = notional > 0 ? (pnl / Math.abs(notional)) * 100 : 0;

        return {
          symbol: position.symbol,
          side: parseFloat(position.positionAmt) > 0 ? 'LONG' : 'SHORT',
          size,
          entryPrice,
          markPrice,
          pnl,
          pnlPercent,
          leverage: parseFloat(position.leverage)
        };
      });
    } catch (error) {
      console.error('Error getting formatted positions:', error);
      throw error;
    }
  }
}

// Create singleton instance
let binanceClient: BinanceFuturesClient | null = null;

export function getBinanceClient(): BinanceFuturesClient {
  if (!binanceClient) {
    const apiKey = process.env.BINANCE_API_KEY || '76fb2a378ee0ca45e304830483f5a775865e1c98f1832c6ab01d3417c9db52d5';
    const apiSecret = process.env.BINANCE_API_SECRET || '652d9989ae15cfab4325042450a2899de9e389661216a54af7180d553b81900f';
    
    binanceClient = new BinanceFuturesClient(apiKey, apiSecret, true); // testnet = true
  }
  
  return binanceClient;
}