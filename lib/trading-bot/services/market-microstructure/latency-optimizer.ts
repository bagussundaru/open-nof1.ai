// Latency Optimization Service
// Implements low-latency data processing, optimized order execution, and network latency monitoring

import { EventEmitter } from 'events';
import { TradeExecution, MarketData } from '../../types';

export interface LatencyMetrics {
  timestamp: number;
  networkLatency: number;
  processingLatency: number;
  orderExecutionLatency: number;
  totalLatency: number;
  target: string; // API endpoint or service
}

export interface OptimizedOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop';
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
}

export interface OrderExecutionResult {
  orderId: string;
  executionLatency: number;
  networkLatency: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface LatencyOptimizationConfig {
  maxAcceptableLatency: number; // milliseconds
  networkTimeoutMs: number;
  retryAttempts: number;
  connectionPoolSize: number;
  enableCompression: boolean;
  enableKeepAlive: boolean;
  priorityQueueEnabled: boolean;
  batchProcessingEnabled: boolean;
  batchSize: number;
  batchTimeoutMs: number;
}

export interface NetworkConnection {
  id: string;
  endpoint: string;
  isActive: boolean;
  lastUsed: number;
  latency: number;
  errorCount: number;
}

export class LatencyOptimizer extends EventEmitter {
  private config: LatencyOptimizationConfig;
  private latencyHistory: Map<string, LatencyMetrics[]> = new Map();
  private connectionPool: Map<string, NetworkConnection[]> = new Map();
  private orderQueue: OptimizedOrderRequest[] = [];
  private batchQueue: OptimizedOrderRequest[] = [];
  private batchTimer?: NodeJS.Timeout;
  private processingQueue: boolean = false;
  private maxHistoryLength: number = 1000;

  constructor(config: LatencyOptimizationConfig) {
    super();
    this.config = config;
    this.validateConfig();
    this.initializeOptimizations();
  }

  private validateConfig(): void {
    if (this.config.maxAcceptableLatency <= 0) {
      throw new Error('Max acceptable latency must be positive');
    }
    if (this.config.connectionPoolSize <= 0) {
      throw new Error('Connection pool size must be positive');
    }
    if (this.config.batchSize <= 0) {
      throw new Error('Batch size must be positive');
    }
  }

  private initializeOptimizations(): void {
    // Initialize connection pools for common endpoints
    this.initializeConnectionPool('gate-api', 'https://fx-api-testnet.gateio.ws');
    this.initializeConnectionPool('nebius-api', process.env.NEBIUS_API_URL || '');

    // Start batch processing if enabled
    if (this.config.batchProcessingEnabled) {
      this.startBatchProcessing();
    }
  }

  /**
   * Process market data with low-latency optimizations
   */
  async processMarketDataOptimized(marketData: MarketData): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Use optimized data structures for faster processing
      const optimizedData = this.optimizeDataStructure(marketData);
      
      // Parallel processing of indicators if possible
      const indicatorPromises = [
        this.calculateRSIOptimized(optimizedData.prices),
        this.calculateMACDOptimized(optimizedData.prices),
        this.calculateMAOptimized(optimizedData.prices)
      ];

      const [rsi, macd, ma] = await Promise.all(indicatorPromises);
      
      const processingTime = performance.now() - startTime;
      
      // Emit optimized market data
      this.emit('optimizedMarketData', {
        ...marketData,
        indicators: { rsi, macd, movingAverage: ma },
        processingLatency: processingTime
      });

      // Track processing latency
      this.recordLatency('market-data-processing', {
        timestamp: Date.now(),
        networkLatency: 0,
        processingLatency: processingTime,
        orderExecutionLatency: 0,
        totalLatency: processingTime,
        target: 'market-data-processing'
      });

      // Alert if processing exceeds acceptable latency
      if (processingTime > this.config.maxAcceptableLatency) {
        this.emit('highLatencyAlert', {
          type: 'processing',
          latency: processingTime,
          threshold: this.config.maxAcceptableLatency
        });
      }

    } catch (error) {
      this.emit('processingError', error);
      throw error;
    }
  }

  /**
   * Execute order with latency optimization
   */
  async executeOrderOptimized(orderRequest: OptimizedOrderRequest): Promise<OrderExecutionResult> {
    const startTime = performance.now();
    
    try {
      // Add to priority queue if enabled
      if (this.config.priorityQueueEnabled) {
        return await this.executeWithPriorityQueue(orderRequest);
      }

      // Direct execution with optimized connection
      const connection = await this.getOptimalConnection('gate-api');
      const networkStart = performance.now();
      
      // Simulate optimized order execution
      const executionResult = await this.executeOrderDirect(orderRequest, connection);
      
      const networkLatency = performance.now() - networkStart;
      const totalLatency = performance.now() - startTime;
      
      // Record latency metrics
      this.recordLatency('order-execution', {
        timestamp: Date.now(),
        networkLatency,
        processingLatency: totalLatency - networkLatency,
        orderExecutionLatency: totalLatency,
        totalLatency,
        target: 'gate-api'
      });

      return {
        orderId: executionResult.orderId,
        executionLatency: totalLatency,
        networkLatency,
        processingTime: totalLatency - networkLatency,
        success: true
      };

    } catch (error) {
      const totalLatency = performance.now() - startTime;
      
      return {
        orderId: '',
        executionLatency: totalLatency,
        networkLatency: 0,
        processingTime: totalLatency,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Monitor network latency to various endpoints
   */
  async monitorNetworkLatency(): Promise<Map<string, number>> {
    const latencies = new Map<string, number>();
    
    const endpoints = [
      { name: 'gate-api', url: 'https://fx-api-testnet.gateio.ws/api/v4/spot/time' },
      { name: 'nebius-api', url: process.env.NEBIUS_API_URL || '' }
    ];

    const latencyPromises = endpoints.map(async (endpoint) => {
      if (!endpoint.url) return;
      
      try {
        const startTime = performance.now();
        
        // Use optimized fetch with connection reuse
        const response = await this.optimizedFetch(endpoint.url, {
          method: 'GET',
          timeout: this.config.networkTimeoutMs,
          keepAlive: this.config.enableKeepAlive
        });
        
        const latency = performance.now() - startTime;
        latencies.set(endpoint.name, latency);
        
        // Update connection pool latency
        this.updateConnectionLatency(endpoint.name, latency);
        
        // Record latency metrics
        this.recordLatency(endpoint.name, {
          timestamp: Date.now(),
          networkLatency: latency,
          processingLatency: 0,
          orderExecutionLatency: 0,
          totalLatency: latency,
          target: endpoint.name
        });

      } catch (error) {
        console.error(`Latency monitoring failed for ${endpoint.name}:`, error);
        latencies.set(endpoint.name, Infinity);
      }
    });

    await Promise.all(latencyPromises);
    
    // Emit latency update
    this.emit('latencyUpdate', latencies);
    
    return latencies;
  }

  /**
   * Get optimal connection from pool
   */
  private async getOptimalConnection(poolName: string): Promise<NetworkConnection> {
    const pool = this.connectionPool.get(poolName) || [];
    
    if (pool.length === 0) {
      throw new Error(`No connections available in pool: ${poolName}`);
    }

    // Find connection with lowest latency and error count
    const optimalConnection = pool
      .filter(conn => conn.isActive)
      .sort((a, b) => {
        const scoreA = a.latency + (a.errorCount * 100);
        const scoreB = b.latency + (b.errorCount * 100);
        return scoreA - scoreB;
      })[0];

    if (!optimalConnection) {
      throw new Error(`No active connections in pool: ${poolName}`);
    }

    // Update last used timestamp
    optimalConnection.lastUsed = Date.now();
    
    return optimalConnection;
  }

  /**
   * Execute order with priority queue
   */
  private async executeWithPriorityQueue(orderRequest: OptimizedOrderRequest): Promise<OrderExecutionResult> {
    return new Promise((resolve, reject) => {
      // Add to queue based on priority
      const insertIndex = this.findInsertionIndex(orderRequest);
      this.orderQueue.splice(insertIndex, 0, orderRequest);
      
      // Process queue if not already processing
      if (!this.processingQueue) {
        this.processOrderQueue();
      }

      // Set up timeout for order execution
      const timeout = setTimeout(() => {
        reject(new Error('Order execution timeout'));
      }, this.config.networkTimeoutMs);

      // Listen for order completion
      const onOrderComplete = (result: OrderExecutionResult) => {
        clearTimeout(timeout);
        resolve(result);
      };

      this.once(`orderComplete:${orderRequest.symbol}:${orderRequest.timestamp}`, onOrderComplete);
    });
  }

  /**
   * Process order queue with optimization
   */
  private async processOrderQueue(): Promise<void> {
    if (this.processingQueue || this.orderQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.orderQueue.length > 0) {
        const order = this.orderQueue.shift()!;
        
        try {
          const connection = await this.getOptimalConnection('gate-api');
          const result = await this.executeOrderDirect(order, connection);
          
          this.emit(`orderComplete:${order.symbol}:${order.timestamp}`, {
            orderId: result.orderId,
            executionLatency: 0,
            networkLatency: 0,
            processingTime: 0,
            success: true
          });

        } catch (error) {
          this.emit(`orderComplete:${order.symbol}:${order.timestamp}`, {
            orderId: '',
            executionLatency: 0,
            networkLatency: 0,
            processingTime: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Find insertion index for priority queue
   */
  private findInsertionIndex(orderRequest: OptimizedOrderRequest): number {
    const priorityValues = { high: 3, medium: 2, low: 1 };
    const requestPriority = priorityValues[orderRequest.priority];

    for (let i = 0; i < this.orderQueue.length; i++) {
      const queuePriority = priorityValues[this.orderQueue[i].priority];
      if (requestPriority > queuePriority) {
        return i;
      }
    }

    return this.orderQueue.length;
  }

  /**
   * Initialize connection pool for endpoint
   */
  private initializeConnectionPool(poolName: string, endpoint: string): void {
    const connections: NetworkConnection[] = [];
    
    for (let i = 0; i < this.config.connectionPoolSize; i++) {
      connections.push({
        id: `${poolName}-${i}`,
        endpoint,
        isActive: true,
        lastUsed: 0,
        latency: 0,
        errorCount: 0
      });
    }

    this.connectionPool.set(poolName, connections);
  }

  /**
   * Update connection latency
   */
  private updateConnectionLatency(poolName: string, latency: number): void {
    const pool = this.connectionPool.get(poolName);
    if (pool && pool.length > 0) {
      // Update the most recently used connection
      const recentConnection = pool.reduce((prev, current) => 
        current.lastUsed > prev.lastUsed ? current : prev
      );
      recentConnection.latency = latency;
    }
  }

  /**
   * Optimized data structure conversion
   */
  private optimizeDataStructure(marketData: MarketData): { prices: Float64Array; volumes: Float64Array } {
    // Convert to typed arrays for better performance
    const prices = new Float64Array([marketData.price]);
    const volumes = new Float64Array([marketData.volume]);
    
    return { prices, volumes };
  }

  /**
   * Optimized RSI calculation
   */
  private async calculateRSIOptimized(prices: Float64Array): Promise<number> {
    // Simplified RSI calculation for demonstration
    if (prices.length < 2) return 50;
    
    // Use WebAssembly or optimized algorithms in production
    return 50 + (Math.random() - 0.5) * 40; // Placeholder
  }

  /**
   * Optimized MACD calculation
   */
  private async calculateMACDOptimized(prices: Float64Array): Promise<number> {
    // Simplified MACD calculation for demonstration
    if (prices.length < 2) return 0;
    
    return (Math.random() - 0.5) * 2; // Placeholder
  }

  /**
   * Optimized Moving Average calculation
   */
  private async calculateMAOptimized(prices: Float64Array): Promise<number> {
    // Simplified MA calculation for demonstration
    if (prices.length === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < prices.length; i++) {
      sum += prices[i];
    }
    
    return sum / prices.length;
  }

  /**
   * Optimized fetch with connection reuse
   */
  private async optimizedFetch(url: string, options: any): Promise<Response> {
    // Implement optimized fetch with connection pooling
    // This is a simplified version - in production, use libraries like 'undici'
    
    const fetchOptions = {
      ...options,
      headers: {
        'Connection': this.config.enableKeepAlive ? 'keep-alive' : 'close',
        'Accept-Encoding': this.config.enableCompression ? 'gzip, deflate' : 'identity',
        ...options.headers
      }
    };

    return fetch(url, fetchOptions);
  }

  /**
   * Execute order directly (placeholder implementation)
   */
  private async executeOrderDirect(
    orderRequest: OptimizedOrderRequest, 
    connection: NetworkConnection
  ): Promise<{ orderId: string }> {
    // Placeholder implementation - replace with actual Gate.io API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); // Simulate network delay
    
    return {
      orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  /**
   * Start batch processing
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, this.config.batchTimeoutMs);
  }

  /**
   * Process batch of orders
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = this.batchQueue.splice(0, this.config.batchSize);
    
    try {
      // Process batch in parallel
      const batchPromises = batch.map(order => this.executeOrderOptimized(order));
      await Promise.all(batchPromises);
      
      this.emit('batchProcessed', { size: batch.length, success: true });
    } catch (error) {
      this.emit('batchProcessed', { size: batch.length, success: false, error });
    }
  }

  /**
   * Record latency metrics
   */
  private recordLatency(target: string, metrics: LatencyMetrics): void {
    if (!this.latencyHistory.has(target)) {
      this.latencyHistory.set(target, []);
    }

    const history = this.latencyHistory.get(target)!;
    history.push(metrics);

    // Maintain max history length
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  /**
   * Get latency statistics
   */
  getLatencyStats(target: string): {
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  } {
    const history = this.latencyHistory.get(target) || [];
    
    if (history.length === 0) {
      return { average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const latencies = history.map(h => h.totalLatency).sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);
    
    return {
      average: sum / latencies.length,
      min: latencies[0],
      max: latencies[latencies.length - 1],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)]
    };
  }

  /**
   * Get current latency metrics
   */
  getCurrentLatencyMetrics(): Map<string, LatencyMetrics> {
    const current = new Map<string, LatencyMetrics>();
    
    for (const [target, history] of this.latencyHistory.entries()) {
      if (history.length > 0) {
        current.set(target, history[history.length - 1]);
      }
    }
    
    return current;
  }

  /**
   * Optimize connection pool
   */
  optimizeConnectionPool(): void {
    const now = Date.now();
    const maxIdleTime = 300000; // 5 minutes

    for (const [poolName, connections] of this.connectionPool.entries()) {
      for (const connection of connections) {
        // Deactivate idle connections
        if (now - connection.lastUsed > maxIdleTime) {
          connection.isActive = false;
        }

        // Reset error count for connections that haven't been used recently
        if (now - connection.lastUsed > maxIdleTime && connection.errorCount > 0) {
          connection.errorCount = Math.max(0, connection.errorCount - 1);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.orderQueue = [];
    this.batchQueue = [];
    this.connectionPool.clear();
    this.latencyHistory.clear();
  }
}