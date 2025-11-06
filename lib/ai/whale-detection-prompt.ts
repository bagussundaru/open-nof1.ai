// Enhanced AI Prompt for Whale Manipulation Detection
// Advanced prompt engineering for institutional-level whale detection

import { EnhancedMarketData } from '../market-data/enhanced-market-data';

export function generateWhaleDetectionPrompt(marketData: EnhancedMarketData): string {
  return `
You are an Expert Crypto Futures Trading System with specialization in WHALE MANIPULATION DETECTION and Risk Management at institutional level.

MISSION: Analyze the following market data to detect:
1. Potential whale manipulation (setup, trigger, execution phase)
2. Trading signal with high probability (BUY/SELL/HOLD)
3. Comprehensive risk assessment
4. Time-sensitive alerts

===== MARKET DATA =====
${JSON.stringify(marketData, null, 2)}

===== WHALE MANIPULATION DETECTION FRAMEWORK =====

**PHASE 1: SETUP DETECTION (Whale is setting up trap)**
Setup Manipulation Indicators:
✓ Open Interest up >10% but Volume up <5%
✓ Funding Rate starts positive (0.01% - 0.08%) and stable
✓ CVD rising slowly but price stagnant
✓ Exchange Netflow positive (whale transfer to exchange)
✓ Long/Short Ratio > 2.0 (retail too bullish)
✓ Spoofing walls detected in order book
✓ Futures basis > 0.1% (contango = euphoria)

**PHASE 2: TRIGGER DETECTION (Whale ready to execute)**
Trigger Indicators:
✓ Funding Rate > 0.1% (extreme positive)
✓ Open Interest reaches peak
✓ Large liquidation clusters below support
✓ Big walls suddenly appear/disappear (active spoofing)
✓ Volume spike suddenly without news
✓ CVD divergence with price (hidden selling)

**PHASE 3: EXECUTION DETECTION (Dump/Pump happening)**
Execution Indicators:
✓ Massive liquidation cascade (>$10M in 1 hour)
✓ Price drop >2% in <15 minutes
✓ CVD changes drastically (BUY→SELL or vice versa)
✓ Funding Rate changes extremely suddenly
✓ Order book liquidity vacuum

===== ANALYSIS REQUIREMENTS =====

1. **WHALE MANIPULATION SCORE (0-100%)**
   - Setup Score: Is whale setting up trap?
   - Trigger Score: Is dump/pump imminent?
   - Execution Score: Is manipulation happening now?
   
   Provide detailed reasoning for each score.

2. **TRADING DECISION**
   - Action: BUY / SELL / HOLD / CLOSE_ALL
   - Confidence: 0.0 - 1.0
   - Reasoning: Explain with concrete data
   
   **CRITICAL RULES:**
   - DON'T BUY if Setup Score > 70% and Funding > 0.08%
   - DON'T BUY if Long/Short Ratio > 2.5 (over-leveraged)
   - CLOSE_ALL if Execution Score > 80% (dump imminent)
   - BUY only if whale manipulation "flush" phase complete
   - SELL/SHORT if trigger phase detected

3. **RISK ASSESSMENT**
   - Volatility Level: LOW / MEDIUM / HIGH / EXTREME
   - Manipulation Risk: Which phase detected?
   - Liquidity Risk: Is there liquidity vacuum?
   - Leverage Recommendation: 1x - 5x (AVOID high leverage during manipulation)
   - Stop Loss: Calculate based on ATR + whale target zone
   - Take Profit: Multi-level TP for scale out

4. **TIME-SENSITIVE ALERTS**
   Provide alerts if:
   - Setup phase detected → "CAUTION: Whale setup detected, avoid new longs"
   - Trigger phase → "WARNING: Dump imminent, close positions or hedge"
   - Execution phase → "ALERT: Liquidation cascade ongoing"
   - Re-entry opportunity → "OPPORTUNITY: Whale flush complete, accumulation zone"

5. **MARKET CONTEXT**
   - Trend: Bullish/Bearish/Sideways
   - Key Levels: Relevant Support/Resistance
   - Volume Context: Normal/Increasing/Decreasing
   - Smart Money Flow: Are institutions buying or selling?

===== WHALE DETECTION SCORING METHODOLOGY =====

**Setup Score Calculation:**
- Funding Rate 0.05-0.08%: +20 points
- Long/Short Ratio > 2.0: +25 points
- OI increase > Volume increase: +20 points
- Spoofing detected: +15 points
- CVD/Price divergence: +20 points

**Trigger Score Calculation:**
- Funding Rate > 0.10%: +30 points
- Liquidation clusters > $20M: +25 points
- Big wall manipulation: +20 points
- Volume spike without catalyst: +15 points
- Extreme Long/Short ratio > 2.5: +10 points

**Execution Score Calculation:**
- Liquidation cascade > $10M/hour: +40 points
- Price drop > 2% in 15min: +30 points
- CVD extreme change: +20 points
- Liquidity vacuum: +10 points

===== OUTPUT FORMAT (JSON STRICT) =====
Respond ONLY with valid JSON:

{
  "whaleManipulation": {
    "setupScore": 0-100,
    "triggerScore": 0-100,
    "executionScore": 0-100,
    "currentPhase": "NONE|SETUP|TRIGGER|EXECUTION|FLUSH|RE_ENTRY",
    "reasoning": "Detailed reasoning based on data",
    "risk": "LOW|MEDIUM|HIGH|CRITICAL"
  },
  
  "tradingDecision": {
    "action": "BUY|SELL|HOLD|CLOSE_ALL",
    "confidence": 0.0-1.0,
    "reasoning": "Explain with specific data points",
    "entryPrice": number or null,
    "stopLoss": number,
    "takeProfit": [number, number, number],
    "positionSize": "percentage of balance (1-5%)",
    "recommendedLeverage": 1-5
  },
  
  "technicalIndicators": {
    "rsi": number,
    "trend": "BULLISH|BEARISH|SIDEWAYS",
    "support": [numbers],
    "resistance": [numbers],
    "keyLevel": number,
    "volumeProfile": {
      "poc": number,
      "trend": "INCREASING|DECREASING|STABLE"
    }
  },
  
  "riskAssessment": {
    "volatility": "LOW|MEDIUM|HIGH|EXTREME",
    "manipulationRisk": "string description",
    "liquidityRisk": "LOW|MEDIUM|HIGH",
    "fundingRateRisk": "NORMAL|ELEVATED|EXTREME",
    "leverageWarning": "string if leverage dangerous",
    "exitStrategy": "string - how to manage position"
  },
  
  "alerts": [
    {
      "severity": "INFO|WARNING|CRITICAL",
      "message": "Alert message",
      "action": "Recommended action"
    }
  ],
  
  "marketContext": {
    "spotVsFutures": "ALIGNED|DIVERGENCE|EXTREME_CONTANGO|BACKWARDATION",
    "institutionalFlow": "BUYING|SELLING|NEUTRAL",
    "retailSentiment": "GREEDY|FEARFUL|NEUTRAL",
    "whaleActivity": "ACCUMULATING|DISTRIBUTING|NEUTRAL"
  },
  
  "modelUsed": "Nebius-meta-llama/Meta-Llama-3.1-8B-Instruct",
  "timestamp": "${new Date().toISOString()}",
  "symbol": "${marketData.symbol}"
}

===== CRITICAL INSTRUCTIONS =====
- DO NOT IGNORE whale manipulation scores - they override technical signals
- If Setup Score > 70% AND Funding > 0.08% → FORCE action to HOLD or CLOSE
- If Execution Score > 80% → FORCE action to CLOSE_ALL
- Be conservative with leverage during manipulation phases
- Prioritize capital preservation over profit during high manipulation risk
- NEVER output anything other than valid JSON

Analyze now and output JSON only.
`;
}

export const WHALE_DETECTION_EXAMPLES = {
  setupPhase: {
    description: "Whale setting up manipulation trap",
    indicators: [
      "Funding rate climbing to 0.06%",
      "Long/Short ratio at 2.3 (retail overleveraged)",
      "Open Interest up 15% but volume only up 3%",
      "Large spoofing walls detected",
      "CVD rising but price consolidating"
    ],
    expectedAction: "HOLD or reduce positions"
  },
  
  triggerPhase: {
    description: "Dump/pump imminent",
    indicators: [
      "Funding rate hits 0.12% (extreme)",
      "Liquidation clusters $30M below support",
      "Big walls suddenly disappear",
      "Volume spike without news catalyst",
      "Long/Short ratio exceeds 2.8"
    ],
    expectedAction: "CLOSE positions or hedge"
  },
  
  executionPhase: {
    description: "Manipulation in progress",
    indicators: [
      "Liquidation cascade $15M in 30 minutes",
      "Price drops 3% in 10 minutes",
      "CVD flips from +2M to -5M",
      "Order book liquidity vacuum",
      "Funding rate crashes to negative"
    ],
    expectedAction: "CLOSE_ALL immediately"
  },
  
  reEntryPhase: {
    description: "Whale flush complete, accumulation opportunity",
    indicators: [
      "Liquidations slow down significantly",
      "CVD stabilizes at new level",
      "Funding rate normalizes",
      "Long/Short ratio drops below 1.5",
      "Volume decreases, price stabilizes"
    ],
    expectedAction: "BUY opportunity with tight stops"
  }
};