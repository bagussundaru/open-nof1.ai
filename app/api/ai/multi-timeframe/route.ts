import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Multi-timeframe analysis API called...');
    
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const includeStrategy = searchParams.get('strategy') === 'true';
    
    console.log(`📊 Analyzing ${symbol} across multiple timeframes...`);
    
    // Generate mock multi-timeframe analysis data
    const mockAnalysis = generateMockMultiTimeframeAnalysis(symbol);
    
    let strategySignal = null;
    
    // Generate strategy signal if requested
    if (includeStrategy) {
      console.log('🎯 Generating strategy signal...');
      strategySignal = generateMockStrategySignal(symbol, mockAnalysis);
    }
    
    // Calculate summary metrics
    const summary = {
      symbol,
      timestamp: mockAnalysis.timestamp,
      consensusSignal: mockAnalysis.consensus.signal,
      confidence: mockAnalysis.consensus.confidence,
      timeframeAlignment: mockAnalysis.consensus.timeframeAlignment,
      overallRisk: mockAnalysis.riskAssessment.volatility,
      recommendedAction: strategySignal?.action || mockAnalysis.consensus.signal,
      keyInsights: generateKeyInsights(mockAnalysis),
      riskFactors: identifyRiskFactors(mockAnalysis)
    };
    
    const response = {
      success: true,
      data: {
        summary,
        analysis: mockAnalysis,
        strategy: strategySignal,
        metadata: {
          timeframesAnalyzed: Object.keys(mockAnalysis.timeframes).length,
          processingTime: 1500, // Mock processing time
          apiVersion: '3.0.0'
        }
      }
    };
    
    console.log(`✅ Multi-timeframe analysis completed for ${symbol}`);
    console.log(`📊 Consensus: ${mockAnalysis.consensus.signal} (${(mockAnalysis.consensus.confidence * 100).toFixed(1)}% confidence)`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error in multi-timeframe analysis:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Multi-timeframe analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: generateFallbackAnalysis()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, includeStrategy = false } = body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: symbols array required'
      }, { status: 400 });
    }
    
    console.log(`🔍 Batch multi-timeframe analysis for ${symbols.length} symbols...`);
    
    const results = [];
    
    // Process each symbol
    for (const symbol of symbols) {
      try {
        console.log(`📊 Processing ${symbol}...`);
        
        const analysis = generateMockMultiTimeframeAnalysis(symbol);
        let strategySignal = null;
        
        if (includeStrategy) {
          strategySignal = generateMockStrategySignal(symbol, analysis);
        }
        
        results.push({
          symbol,
          success: true,
          analysis,
          strategy: strategySignal,
          summary: {
            consensusSignal: analysis.consensus.signal,
            confidence: analysis.consensus.confidence,
            timeframeAlignment: analysis.consensus.timeframeAlignment,
            riskLevel: analysis.riskAssessment.volatility
          }
        });
        
      } catch (error) {
        console.error(`❌ Error analyzing ${symbol}:`, error);
        results.push({
          symbol,
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
          fallback: generateFallbackAnalysis()
        });
      }
    }
    
    // Calculate batch summary
    const batchSummary = calculateBatchSummary(results);
    
    console.log(`✅ Batch analysis completed: ${results.filter(r => r.success).length}/${symbols.length} successful`);
    
    return NextResponse.json({
      success: true,
      data: {
        batchSummary,
        results,
        metadata: {
          totalSymbols: symbols.length,
          successfulAnalyses: results.filter(r => r.success).length,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in batch multi-timeframe analysis:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Batch analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate mock multi-timeframe analysis
 */
function generateMockMultiTimeframeAnalysis(symbol: string) {
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  const timeframeData: any = {};
  
  // Generate data for each timeframe
  timeframes.forEach(tf => {
    const rsi = 30 + Math.random() * 40; // 30-70 range
    const trend = Math.random() > 0.5 ? 'BULLISH' : Math.random() > 0.3 ? 'BEARISH' : 'NEUTRAL';
    const signal = rsi < 35 ? 'BUY' : rsi > 65 ? 'SELL' : 'HOLD';
    
    timeframeData[tf] = {
      timeframe: tf,
      ohlcv: [], // Mock OHLCV data
      technicalIndicators: {
        rsi: rsi,
        macd: {
          macd: (Math.random() - 0.5) * 0.01,
          signal: (Math.random() - 0.5) * 0.008,
          histogram: (Math.random() - 0.5) * 0.002
        },
        ema20: 43000 + Math.random() * 2000,
        ema50: 42500 + Math.random() * 2000,
        ema200: 41000 + Math.random() * 3000,
        bollinger: {
          upper: 44000 + Math.random() * 1000,
          middle: 43000 + Math.random() * 1000,
          lower: 42000 + Math.random() * 1000
        },
        support: 42000 + Math.random() * 500,
        resistance: 44000 + Math.random() * 500
      },
      trend: {
        direction: trend,
        strength: 50 + Math.random() * 40,
        confidence: 0.6 + Math.random() * 0.3
      },
      signals: {
        entry: signal,
        confidence: 0.5 + Math.random() * 0.4,
        reasoning: `${tf} analysis suggests ${signal} based on RSI ${rsi.toFixed(1)} and ${trend.toLowerCase()} trend`
      }
    };
  });
  
  // Calculate consensus
  const signals = Object.values(timeframeData).map((tf: any) => tf.signals.entry);
  const buyCount = signals.filter(s => s === 'BUY').length;
  const sellCount = signals.filter(s => s === 'SELL').length;
  
  let consensusSignal = 'HOLD';
  if (buyCount > sellCount + 1) consensusSignal = buyCount >= 4 ? 'STRONG_BUY' : 'BUY';
  else if (sellCount > buyCount + 1) consensusSignal = sellCount >= 4 ? 'STRONG_SELL' : 'SELL';
  
  const alignment = Math.max(buyCount, sellCount, signals.filter(s => s === 'HOLD').length) / signals.length;
  const confidence = 0.6 + (alignment - 0.33) * 0.6; // Scale alignment to confidence
  
  return {
    symbol,
    timestamp: new Date().toISOString(),
    timeframes: timeframeData,
    correlation: {
      shortTerm: 0.3 + Math.random() * 0.4,
      mediumTerm: 0.4 + Math.random() * 0.4,
      longTerm: 0.5 + Math.random() * 0.3,
      overall: 0.4 + Math.random() * 0.4
    },
    consensus: {
      signal: consensusSignal,
      confidence: Math.max(0.5, Math.min(0.95, confidence)),
      reasoning: `Multi-timeframe consensus based on ${signals.length} timeframes: ${buyCount} BUY, ${sellCount} SELL, ${signals.length - buyCount - sellCount} HOLD`,
      timeframeAlignment: alignment
    },
    riskAssessment: {
      volatility: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
      trendStability: 0.4 + Math.random() * 0.4,
      reversalProbability: 0.2 + Math.random() * 0.5,
      recommendedPositionSize: 0.01 + Math.random() * 0.04 // 1-5%
    }
  };
}

/**
 * Generate mock strategy signal
 */
function generateMockStrategySignal(symbol: string, analysis: any) {
  const consensus = analysis.consensus;
  
  return {
    symbol,
    action: consensus.signal,
    confidence: consensus.confidence,
    reasoning: `Multi-timeframe strategy: ${consensus.reasoning}. Risk level: ${analysis.riskAssessment.volatility}`,
    positionSize: analysis.riskAssessment.recommendedPositionSize,
    leverage: analysis.riskAssessment.volatility === 'HIGH' ? 2 : 
              analysis.riskAssessment.volatility === 'MEDIUM' ? 3 : 4,
    stopLoss: 43000 * (1 - (analysis.riskAssessment.volatility === 'HIGH' ? 0.03 : 0.02)),
    takeProfit: [
      43000 * 1.02,
      43000 * 1.04,
      43000 * 1.06
    ],
    timeframeAlignment: consensus.timeframeAlignment,
    riskLevel: analysis.riskAssessment.volatility,
    metadata: {
      multiTimeframeAnalysis: analysis,
      entryConditions: [
        `${(consensus.timeframeAlignment * 100).toFixed(1)}% timeframe alignment`,
        `${(consensus.confidence * 100).toFixed(1)}% AI confidence`,
        `${analysis.riskAssessment.volatility.toLowerCase()} volatility environment`
      ],
      exitConditions: [
        'Multi-level take profit strategy',
        'Volatility-adjusted stop loss',
        'Trend reversal protection'
      ],
      riskFactors: [
        `${analysis.riskAssessment.volatility.toLowerCase()} market volatility`,
        `${(analysis.riskAssessment.reversalProbability * 100).toFixed(1)}% reversal probability`
      ]
    }
  };
}

/**
 * Generate key insights from analysis
 */
function generateKeyInsights(analysis: any): string[] {
  const insights = [];
  
  // Timeframe alignment insight
  const alignment = analysis.consensus.timeframeAlignment;
  if (alignment >= 0.8) {
    insights.push(`Strong timeframe alignment (${(alignment * 100).toFixed(1)}%) - high confidence signal`);
  } else if (alignment >= 0.6) {
    insights.push(`Moderate timeframe alignment (${(alignment * 100).toFixed(1)}%) - proceed with caution`);
  } else {
    insights.push(`Low timeframe alignment (${(alignment * 100).toFixed(1)}%) - conflicting signals`);
  }
  
  // Volatility insight
  const volatility = analysis.riskAssessment.volatility;
  if (volatility === 'HIGH') {
    insights.push(`High volatility detected - adjust position sizes accordingly`);
  }
  
  // Reversal probability insight
  const reversalProb = analysis.riskAssessment.reversalProbability;
  if (reversalProb > 0.7) {
    insights.push(`High reversal probability (${(reversalProb * 100).toFixed(1)}%) - consider shorter-term positions`);
  }
  
  return insights;
}

/**
 * Identify risk factors
 */
function identifyRiskFactors(analysis: any): string[] {
  const risks = [];
  
  // Volatility risk
  if (analysis.riskAssessment.volatility === 'HIGH') {
    risks.push('High market volatility');
  }
  
  // Alignment risk
  if (analysis.consensus.timeframeAlignment < 0.5) {
    risks.push('Poor timeframe alignment');
  }
  
  // Confidence risk
  if (analysis.consensus.confidence < 0.6) {
    risks.push('Low AI confidence');
  }
  
  return risks;
}

/**
 * Generate fallback analysis for errors
 */
function generateFallbackAnalysis() {
  return {
    consensusSignal: 'HOLD',
    confidence: 0.5,
    timeframeAlignment: 0.5,
    riskLevel: 'MEDIUM',
    reasoning: 'Fallback analysis due to processing error'
  };
}

/**
 * Calculate batch summary statistics
 */
function calculateBatchSummary(results: any[]) {
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    return {
      averageConfidence: 0,
      averageAlignment: 0,
      signalDistribution: {},
      riskDistribution: {},
      marketSentiment: 'NEUTRAL'
    };
  }
  
  // Calculate averages
  const avgConfidence = successful.reduce((sum, r) => sum + r.summary.confidence, 0) / successful.length;
  const avgAlignment = successful.reduce((sum, r) => sum + r.summary.timeframeAlignment, 0) / successful.length;
  
  // Signal distribution
  const signalCounts: { [key: string]: number } = {};
  successful.forEach(r => {
    const signal = r.summary.consensusSignal;
    signalCounts[signal] = (signalCounts[signal] || 0) + 1;
  });
  
  // Risk distribution
  const riskCounts: { [key: string]: number } = {};
  successful.forEach(r => {
    const risk = r.summary.riskLevel;
    riskCounts[risk] = (riskCounts[risk] || 0) + 1;
  });
  
  // Market sentiment
  const buySignals = (signalCounts['BUY'] || 0) + (signalCounts['STRONG_BUY'] || 0);
  const sellSignals = (signalCounts['SELL'] || 0) + (signalCounts['STRONG_SELL'] || 0);
  
  let marketSentiment = 'NEUTRAL';
  if (buySignals > sellSignals * 1.5) marketSentiment = 'BULLISH';
  else if (sellSignals > buySignals * 1.5) marketSentiment = 'BEARISH';
  
  return {
    averageConfidence: avgConfidence,
    averageAlignment: avgAlignment,
    signalDistribution: signalCounts,
    riskDistribution: riskCounts,
    marketSentiment
  };
}