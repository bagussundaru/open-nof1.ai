import { 
  PriceData, 
  CandlestickPattern, 
  SupportResistanceLevel, 
  TrendReversalSignal 
} from './ml-types';

/**
 * Pattern Recognition Service for Technical Analysis
 */
export class PatternRecognitionService {
  private supportResistanceLevels: Map<string, SupportResistanceLevel[]> = new Map();
  private patternHistory: Map<string, CandlestickPattern[]> = new Map();

  constructor() {
    console.log('🔍 Pattern Recognition Service initialized');
  }

  /**
   * Analyze candlestick patterns in price data
   */
  analyzeCandlestickPatterns(symbol: string, data: PriceData[]): CandlestickPattern[] {
    console.log(`🕯️ Analyzing candlestick patterns for ${symbol}...`);
    
    const patterns: CandlestickPattern[] = [];
    
    if (data.length < 3) {
      return patterns;
    }

    // Analyze various candlestick patterns
    patterns.push(...this.detectDojiPatterns(data));
    patterns.push(...this.detectHammerPatterns(data));
    patterns.push(...this.detectEngulfingPatterns(data));
    patterns.push(...this.detectHaramiPatterns(data));
    patterns.push(...this.detectMorningStar(data));
    patterns.push(...this.detectEveningStar(data));
    patterns.push(...this.detectThreeWhiteSoldiers(data));
    patterns.push(...this.detectThreeBlackCrows(data));
    patterns.push(...this.detectPinBar(data));
    patterns.push(...this.detectInsideBar(data));

    // Store pattern history
    this.patternHistory.set(symbol, patterns);

    console.log(`✅ Found ${patterns.length} candlestick patterns for ${symbol}`);
    return patterns;
  }

  /**
   * Detect support and resistance levels
   */
  detectSupportResistanceLevels(symbol: string, data: PriceData[], lookbackPeriods: number = 50): SupportResistanceLevel[] {
    console.log(`📊 Detecting support/resistance levels for ${symbol}...`);
    
    if (data.length < lookbackPeriods) {
      return [];
    }

    const levels: SupportResistanceLevel[] = [];
    const recentData = data.slice(-lookbackPeriods);
    
    // Find pivot highs and lows
    const pivotHighs = this.findPivotHighs(recentData);
    const pivotLows = this.findPivotLows(recentData);
    
    // Group similar levels
    const resistanceLevels = this.groupSimilarLevels(pivotHighs, 'RESISTANCE');
    const supportLevels = this.groupSimilarLevels(pivotLows, 'SUPPORT');
    
    levels.push(...resistanceLevels);
    levels.push(...supportLevels);
    
    // Calculate strength and confidence for each level
    for (const level of levels) {
      level.strength = this.calculateLevelStrength(level, recentData);
      level.confidence = this.calculateLevelConfidence(level, recentData);
    }
    
    // Sort by strength
    levels.sort((a, b) => b.strength - a.strength);
    
    // Store levels
    this.supportResistanceLevels.set(symbol, levels);
    
    console.log(`✅ Found ${levels.length} support/resistance levels for ${symbol}`);
    return levels;
  }

  /**
   * Identify trend reversal signals
   */
  identifyTrendReversals(symbol: string, data: PriceData[]): TrendReversalSignal[] {
    console.log(`🔄 Identifying trend reversals for ${symbol}...`);
    
    const reversals: TrendReversalSignal[] = [];
    
    if (data.length < 20) {
      return reversals;
    }

    // Get recent patterns and levels
    const patterns = this.analyzeCandlestickPatterns(symbol, data);
    const levels = this.detectSupportResistanceLevels(symbol, data);
    
    // Analyze for bullish reversals
    const bullishReversals = this.detectBullishReversals(data, patterns, levels);
    reversals.push(...bullishReversals);
    
    // Analyze for bearish reversals
    const bearishReversals = this.detectBearishReversals(data, patterns, levels);
    reversals.push(...bearishReversals);
    
    console.log(`✅ Found ${reversals.length} trend reversal signals for ${symbol}`);
    return reversals;
  }

  // Candlestick Pattern Detection Methods

  private detectDojiPatterns(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;
      
      // Doji: body is very small relative to the total range
      if (bodySize / totalRange < 0.1 && totalRange > 0) {
        patterns.push({
          name: 'Doji',
          type: 'NEUTRAL',
          reliability: 0.6,
          strength: 1 - (bodySize / totalRange),
          position: i,
          description: 'Indecision pattern - potential reversal signal'
        });
      }
    }
    
    return patterns;
  }

  private detectHammerPatterns(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const candle = data[i];
      const prevCandle = data[i - 1];
      
      const bodySize = Math.abs(candle.close - candle.open);
      const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
      const upperShadow = candle.high - Math.max(candle.open, candle.close);
      const totalRange = candle.high - candle.low;
      
      // Hammer: small body, long lower shadow, short upper shadow
      if (lowerShadow > bodySize * 2 && 
          upperShadow < bodySize * 0.5 && 
          totalRange > 0 &&
          candle.close < prevCandle.close) {
        
        patterns.push({
          name: 'Hammer',
          type: 'BULLISH',
          reliability: 0.7,
          strength: lowerShadow / totalRange,
          position: i,
          description: 'Bullish reversal pattern after downtrend'
        });
      }
      
      // Hanging Man: same structure but in uptrend
      if (lowerShadow > bodySize * 2 && 
          upperShadow < bodySize * 0.5 && 
          totalRange > 0 &&
          candle.close > prevCandle.close) {
        
        patterns.push({
          name: 'Hanging Man',
          type: 'BEARISH',
          reliability: 0.65,
          strength: lowerShadow / totalRange,
          position: i,
          description: 'Bearish reversal pattern after uptrend'
        });
      }
    }
    
    return patterns;
  }

  private detectEngulfingPatterns(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      const currentBody = Math.abs(current.close - current.open);
      const previousBody = Math.abs(previous.close - previous.open);
      
      // Bullish Engulfing
      if (previous.close < previous.open && // Previous red candle
          current.close > current.open && // Current green candle
          current.open < previous.close && // Current opens below previous close
          current.close > previous.open && // Current closes above previous open
          currentBody > previousBody) { // Current body is larger
        
        patterns.push({
          name: 'Bullish Engulfing',
          type: 'BULLISH',
          reliability: 0.75,
          strength: currentBody / previousBody,
          position: i,
          description: 'Strong bullish reversal pattern'
        });
      }
      
      // Bearish Engulfing
      if (previous.close > previous.open && // Previous green candle
          current.close < current.open && // Current red candle
          current.open > previous.close && // Current opens above previous close
          current.close < previous.open && // Current closes below previous open
          currentBody > previousBody) { // Current body is larger
        
        patterns.push({
          name: 'Bearish Engulfing',
          type: 'BEARISH',
          reliability: 0.75,
          strength: currentBody / previousBody,
          position: i,
          description: 'Strong bearish reversal pattern'
        });
      }
    }
    
    return patterns;
  }

  private detectHaramiPatterns(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      const currentBody = Math.abs(current.close - current.open);
      const previousBody = Math.abs(previous.close - previous.open);
      
      // Harami: current candle body is inside previous candle body
      if (currentBody < previousBody &&
          Math.max(current.open, current.close) < Math.max(previous.open, previous.close) &&
          Math.min(current.open, current.close) > Math.min(previous.open, previous.close)) {
        
        const type = previous.close < previous.open ? 'BULLISH' : 'BEARISH';
        
        patterns.push({
          name: `${type === 'BULLISH' ? 'Bullish' : 'Bearish'} Harami`,
          type,
          reliability: 0.6,
          strength: 1 - (currentBody / previousBody),
          position: i,
          description: `${type.toLowerCase()} reversal pattern - indecision after strong move`
        });
      }
    }
    
    return patterns;
  }

  private detectMorningStar(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 2; i < data.length; i++) {
      const first = data[i - 2];
      const second = data[i - 1];
      const third = data[i];
      
      // Morning Star: bearish candle, small body (gap down), bullish candle (gap up)
      if (first.close < first.open && // First candle is bearish
          Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3 && // Second is small
          third.close > third.open && // Third is bullish
          third.close > (first.open + first.close) / 2) { // Third closes above first's midpoint
        
        patterns.push({
          name: 'Morning Star',
          type: 'BULLISH',
          reliability: 0.8,
          strength: (third.close - third.open) / (first.open - first.close),
          position: i,
          description: 'Strong bullish reversal pattern - three candle formation'
        });
      }
    }
    
    return patterns;
  }

  private detectEveningStar(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 2; i < data.length; i++) {
      const first = data[i - 2];
      const second = data[i - 1];
      const third = data[i];
      
      // Evening Star: bullish candle, small body (gap up), bearish candle (gap down)
      if (first.close > first.open && // First candle is bullish
          Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3 && // Second is small
          third.close < third.open && // Third is bearish
          third.close < (first.open + first.close) / 2) { // Third closes below first's midpoint
        
        patterns.push({
          name: 'Evening Star',
          type: 'BEARISH',
          reliability: 0.8,
          strength: (third.open - third.close) / (first.close - first.open),
          position: i,
          description: 'Strong bearish reversal pattern - three candle formation'
        });
      }
    }
    
    return patterns;
  }

  private detectThreeWhiteSoldiers(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 2; i < data.length; i++) {
      const first = data[i - 2];
      const second = data[i - 1];
      const third = data[i];
      
      // Three White Soldiers: three consecutive bullish candles with higher closes
      if (first.close > first.open &&
          second.close > second.open &&
          third.close > third.open &&
          second.close > first.close &&
          third.close > second.close &&
          second.open > first.open &&
          third.open > second.open) {
        
        patterns.push({
          name: 'Three White Soldiers',
          type: 'BULLISH',
          reliability: 0.85,
          strength: (third.close - first.open) / first.open,
          position: i,
          description: 'Very strong bullish continuation pattern'
        });
      }
    }
    
    return patterns;
  }

  private detectThreeBlackCrows(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 2; i < data.length; i++) {
      const first = data[i - 2];
      const second = data[i - 1];
      const third = data[i];
      
      // Three Black Crows: three consecutive bearish candles with lower closes
      if (first.close < first.open &&
          second.close < second.open &&
          third.close < third.open &&
          second.close < first.close &&
          third.close < second.close &&
          second.open < first.open &&
          third.open < second.open) {
        
        patterns.push({
          name: 'Three Black Crows',
          type: 'BEARISH',
          reliability: 0.85,
          strength: (first.open - third.close) / first.open,
          position: i,
          description: 'Very strong bearish continuation pattern'
        });
      }
    }
    
    return patterns;
  }

  private detectPinBar(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const bodySize = Math.abs(candle.close - candle.open);
      const totalRange = candle.high - candle.low;
      const upperShadow = candle.high - Math.max(candle.open, candle.close);
      const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
      
      // Pin Bar: small body with long wick on one side
      if (totalRange > 0 && bodySize / totalRange < 0.3) {
        if (upperShadow > bodySize * 2 && lowerShadow < bodySize) {
          patterns.push({
            name: 'Bearish Pin Bar',
            type: 'BEARISH',
            reliability: 0.7,
            strength: upperShadow / totalRange,
            position: i,
            description: 'Rejection of higher prices - bearish signal'
          });
        } else if (lowerShadow > bodySize * 2 && upperShadow < bodySize) {
          patterns.push({
            name: 'Bullish Pin Bar',
            type: 'BULLISH',
            reliability: 0.7,
            strength: lowerShadow / totalRange,
            position: i,
            description: 'Rejection of lower prices - bullish signal'
          });
        }
      }
    }
    
    return patterns;
  }

  private detectInsideBar(data: PriceData[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      // Inside Bar: current candle's range is inside previous candle's range
      if (current.high < previous.high && current.low > previous.low) {
        patterns.push({
          name: 'Inside Bar',
          type: 'NEUTRAL',
          reliability: 0.5,
          strength: 1 - ((current.high - current.low) / (previous.high - previous.low)),
          position: i,
          description: 'Consolidation pattern - potential breakout setup'
        });
      }
    }
    
    return patterns;
  }

  // Support/Resistance Detection Methods

  private findPivotHighs(data: PriceData[], window: number = 5): number[] {
    const pivots: number[] = [];
    
    for (let i = window; i < data.length - window; i++) {
      const current = data[i].high;
      let isPivot = true;
      
      // Check if current high is higher than surrounding highs
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && data[j].high >= current) {
          isPivot = false;
          break;
        }
      }
      
      if (isPivot) {
        pivots.push(current);
      }
    }
    
    return pivots;
  }

  private findPivotLows(data: PriceData[], window: number = 5): number[] {
    const pivots: number[] = [];
    
    for (let i = window; i < data.length - window; i++) {
      const current = data[i].low;
      let isPivot = true;
      
      // Check if current low is lower than surrounding lows
      for (let j = i - window; j <= i + window; j++) {
        if (j !== i && data[j].low <= current) {
          isPivot = false;
          break;
        }
      }
      
      if (isPivot) {
        pivots.push(current);
      }
    }
    
    return pivots;
  }

  private groupSimilarLevels(levels: number[], type: 'SUPPORT' | 'RESISTANCE'): SupportResistanceLevel[] {
    const grouped: SupportResistanceLevel[] = [];
    const tolerance = 0.005; // 0.5% tolerance for grouping
    
    for (const level of levels) {
      let foundGroup = false;
      
      for (const group of grouped) {
        if (Math.abs(group.level - level) / level < tolerance) {
          // Update group level to average
          group.level = (group.level + level) / 2;
          group.touches++;
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        grouped.push({
          level,
          type,
          strength: 0,
          touches: 1,
          lastTouch: new Date(),
          confidence: 0
        });
      }
    }
    
    return grouped;
  }

  private calculateLevelStrength(level: SupportResistanceLevel, data: PriceData[]): number {
    let strength = level.touches * 0.2; // Base strength from touches
    
    // Add strength based on how well the level held
    let bounces = 0;
    for (const candle of data) {
      const distance = Math.abs(candle.close - level.level) / level.level;
      if (distance < 0.01) { // Within 1% of level
        if ((level.type === 'SUPPORT' && candle.low <= level.level && candle.close > level.level) ||
            (level.type === 'RESISTANCE' && candle.high >= level.level && candle.close < level.level)) {
          bounces++;
        }
      }
    }
    
    strength += bounces * 0.3;
    return Math.min(1, strength);
  }

  private calculateLevelConfidence(level: SupportResistanceLevel, data: PriceData[]): number {
    let confidence = level.touches * 0.15;
    
    // Add confidence based on volume at level (simplified)
    let volumeAtLevel = 0;
    let totalVolume = 0;
    
    for (const candle of data) {
      totalVolume += candle.volume;
      const distance = Math.abs(candle.close - level.level) / level.level;
      if (distance < 0.01) {
        volumeAtLevel += candle.volume;
      }
    }
    
    if (totalVolume > 0) {
      confidence += (volumeAtLevel / totalVolume) * 0.5;
    }
    
    return Math.min(1, confidence);
  }

  // Trend Reversal Detection

  private detectBullishReversals(data: PriceData[], patterns: CandlestickPattern[], levels: SupportResistanceLevel[]): TrendReversalSignal[] {
    const reversals: TrendReversalSignal[] = [];
    
    // Look for bullish patterns near support levels
    const bullishPatterns = patterns.filter(p => p.type === 'BULLISH');
    const supportLevels = levels.filter(l => l.type === 'SUPPORT');
    
    for (const pattern of bullishPatterns) {
      if (pattern.position >= data.length) continue;
      
      const candle = data[pattern.position];
      const nearSupport = supportLevels.some(level => 
        Math.abs(candle.low - level.level) / level.level < 0.02
      );
      
      if (nearSupport && pattern.reliability > 0.6) {
        const indicators = this.analyzeReversalIndicators(data, pattern.position, 'BULLISH');
        
        reversals.push({
          type: 'BULLISH_REVERSAL',
          confidence: pattern.reliability * (nearSupport ? 1.2 : 1),
          patterns: [pattern],
          indicators,
          targetPrice: candle.close * 1.05, // 5% target
          stopLoss: candle.close * 0.98 // 2% stop loss
        });
      }
    }
    
    return reversals;
  }

  private detectBearishReversals(data: PriceData[], patterns: CandlestickPattern[], levels: SupportResistanceLevel[]): TrendReversalSignal[] {
    const reversals: TrendReversalSignal[] = [];
    
    // Look for bearish patterns near resistance levels
    const bearishPatterns = patterns.filter(p => p.type === 'BEARISH');
    const resistanceLevels = levels.filter(l => l.type === 'RESISTANCE');
    
    for (const pattern of bearishPatterns) {
      if (pattern.position >= data.length) continue;
      
      const candle = data[pattern.position];
      const nearResistance = resistanceLevels.some(level => 
        Math.abs(candle.high - level.level) / level.level < 0.02
      );
      
      if (nearResistance && pattern.reliability > 0.6) {
        const indicators = this.analyzeReversalIndicators(data, pattern.position, 'BEARISH');
        
        reversals.push({
          type: 'BEARISH_REVERSAL',
          confidence: pattern.reliability * (nearResistance ? 1.2 : 1),
          patterns: [pattern],
          indicators,
          targetPrice: candle.close * 0.95, // 5% target
          stopLoss: candle.close * 1.02 // 2% stop loss
        });
      }
    }
    
    return reversals;
  }

  private analyzeReversalIndicators(data: PriceData[], position: number, type: 'BULLISH' | 'BEARISH'): any {
    // Simplified indicator analysis
    const recentData = data.slice(Math.max(0, position - 14), position + 1);
    const volumes = recentData.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = data[position].volume;
    
    return {
      divergence: false, // Would need RSI/MACD calculation
      oversold: type === 'BULLISH', // Simplified
      overbought: type === 'BEARISH', // Simplified
      volumeConfirmation: currentVolume > avgVolume * 1.2
    };
  }

  /**
   * Get pattern history for a symbol
   */
  getPatternHistory(symbol: string): CandlestickPattern[] {
    return this.patternHistory.get(symbol) || [];
  }

  /**
   * Get support/resistance levels for a symbol
   */
  getSupportResistanceLevels(symbol: string): SupportResistanceLevel[] {
    return this.supportResistanceLevels.get(symbol) || [];
  }

  /**
   * Clear old pattern data
   */
  clearOldData(symbol: string): void {
    this.patternHistory.delete(symbol);
    this.supportResistanceLevels.delete(symbol);
  }
}