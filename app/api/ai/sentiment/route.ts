import { NextRequest, NextResponse } from 'next/server';
import { SentimentAnalyzer } from '@/lib/ai/sentiment-analyzer';
import { SentimentEnhancedStrategy } from '@/lib/trading-bot/strategies/sentiment-enhanced-strategy';
import { getBinanceClient } from '@/lib/exchanges/binance-futures-client';
import { getNebiusAIService } from '@/lib/ai/nebius-ai-service';

export async function GET(request: NextRequest) {
  try {
    console.log('📰 Sentiment analysis API called...');
    
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = (searchParams.get('timeframe') || '4h') as '1h' | '4h' | '24h';
    const includeStrategy = searchParams.get('strategy') === 'true';
    
    console.log(`📊 Analyzing sentiment for ${symbol} (${timeframe} timeframe)...`);
    
    // Initialize sentiment analyzer
    const sentimentAnalyzer = new SentimentAnalyzer();
    
    // Perform sentiment analysis
    const marketSentiment = await sentimentAnalyzer.analyzeMarketSentiment(symbol, timeframe);
    
    let enhancedStrategy = null;
    
    // Generate sentiment-enhanced strategy if requested
    if (includeStrategy) {
      console.log('🎯 Generating sentiment-enhanced strategy...');
      const binanceClient = getBinanceClient();
      const nebiusAI = getNebiusAIService();
      const strategy = new SentimentEnhancedStrategy(binanceClient, nebiusAI);
      
      enhancedStrategy = await strategy.generateEnhancedSignal(symbol, timeframe);
    }
    
    // Calculate summary metrics
    const summary = {
      symbol,
      timestamp: marketSentiment.metadata.timestamp,
      overallSentiment: marketSentiment.overall.category,
      sentimentScore: marketSentiment.overall.score,
      confidence: marketSentiment.overall.confidence,
      tradingImpact: marketSentiment.signals.tradingImpact,
      direction: marketSentiment.signals.direction,
      strength: marketSentiment.signals.strength,
      keyInsights: generateSentimentInsights(marketSentiment),
      riskFactors: identifySentimentRisks(marketSentiment)
    };
    
    const response = {
      success: true,
      data: {
        summary,
        sentiment: marketSentiment,
        strategy: enhancedStrategy,
        metadata: {
          processingTime: marketSentiment.metadata.processingTime,
          dataPoints: marketSentiment.metadata.dataPoints,
          apiVersion: '3.0.0',
          analysisType: includeStrategy ? 'sentiment_with_strategy' : 'sentiment_only'
        }
      }
    };
    
    console.log(`✅ Sentiment analysis completed for ${symbol}`);
    console.log(`📊 Overall sentiment: ${marketSentiment.overall.category} (${(marketSentiment.overall.score * 100).toFixed(1)}%)`);
    console.log(`🎯 Trading impact: ${marketSentiment.signals.tradingImpact}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error in sentiment analysis:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Sentiment analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: generateFallbackSentiment()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, timeframe = '4h', includeStrategy = false, config } = body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request: symbols array required'
      }, { status: 400 });
    }
    
    console.log(`📰 Batch sentiment analysis for ${symbols.length} symbols...`);
    
    // Initialize services
    const sentimentAnalyzer = new SentimentAnalyzer();
    let strategy = null;
    
    if (includeStrategy) {
      const binanceClient = getBinanceClient();
      const nebiusAI = getNebiusAIService();
      strategy = new SentimentEnhancedStrategy(binanceClient, nebiusAI);
      
      // Update strategy config if provided
      if (config) {
        strategy.updateConfig(config);
      }
    }
    
    const results = [];
    
    // Process each symbol
    for (const symbol of symbols) {
      try {
        console.log(`📊 Processing sentiment for ${symbol}...`);
        
        const marketSentiment = await sentimentAnalyzer.analyzeMarketSentiment(symbol, timeframe);
        let enhancedStrategy = null;
        
        if (includeStrategy && strategy) {
          enhancedStrategy = await strategy.generateEnhancedSignal(symbol, timeframe);
        }
        
        results.push({
          symbol,
          success: true,
          sentiment: marketSentiment,
          strategy: enhancedStrategy,
          summary: {
            overallSentiment: marketSentiment.overall.category,
            sentimentScore: marketSentiment.overall.score,
            confidence: marketSentiment.overall.confidence,
            tradingImpact: marketSentiment.signals.tradingImpact,
            direction: marketSentiment.signals.direction
          }
        });
        
      } catch (error) {
        console.error(`❌ Error analyzing sentiment for ${symbol}:`, error);
        results.push({
          symbol,
          success: false,
          error: error instanceof Error ? error.message : 'Sentiment analysis failed',
          fallback: generateFallbackSentiment()
        });
      }
    }
    
    // Calculate batch summary
    const batchSummary = calculateSentimentBatchSummary(results);
    
    console.log(`✅ Batch sentiment analysis completed: ${results.filter(r => r.success).length}/${symbols.length} successful`);
    
    return NextResponse.json({
      success: true,
      data: {
        batchSummary,
        results,
        metadata: {
          totalSymbols: symbols.length,
          successfulAnalyses: results.filter(r => r.success).length,
          timeframe,
          timestamp: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in batch sentiment analysis:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Batch sentiment analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate sentiment insights
 */
function generateSentimentInsights(sentiment: any): string[] {
  const insights = [];
  
  // Overall sentiment insight
  const score = sentiment.overall.score;
  const confidence = sentiment.overall.confidence;
  
  if (Math.abs(score) > 0.6 && confidence > 0.8) {
    insights.push(`Strong ${score > 0 ? 'positive' : 'negative'} sentiment detected with high confidence (${(confidence * 100).toFixed(1)}%)`);
  }
  
  // News vs social sentiment comparison
  const newsScore = sentiment.news.sentiment.score;
  const socialScore = sentiment.social.sentiment.score;
  const scoreDiff = Math.abs(newsScore - socialScore);
  
  if (scoreDiff > 0.3) {
    const dominant = Math.abs(newsScore) > Math.abs(socialScore) ? 'news' : 'social media';
    insights.push(`Sentiment divergence detected: ${dominant} sentiment is driving overall direction`);
  }
  
  // Trading impact insight
  if (sentiment.signals.tradingImpact === 'CRITICAL') {
    insights.push(`Critical trading impact: ${sentiment.signals.direction.toLowerCase()} sentiment may cause significant price movement`);
  }
  
  // Trend alignment
  const trends = sentiment.trends;
  if (trends.shortTerm === trends.mediumTerm && trends.mediumTerm === trends.longTerm) {
    insights.push(`Strong trend alignment: ${trends.shortTerm.toLowerCase()} sentiment across all timeframes`);
  }
  
  // Keywords insight
  if (sentiment.overall.keywords.length > 0) {
    insights.push(`Key sentiment drivers: ${sentiment.overall.keywords.slice(0, 3).join(', ')}`);
  }
  
  return insights;
}

/**
 * Identify sentiment-based risks
 */
function identifySentimentRisks(sentiment: any): string[] {
  const risks = [];
  
  // Extreme sentiment risk
  if (Math.abs(sentiment.overall.score) > 0.8) {
    risks.push(`Extreme sentiment detected (${(sentiment.overall.score * 100).toFixed(1)}%) - potential for sentiment reversal`);
  }
  
  // Low confidence risk
  if (sentiment.overall.confidence < 0.5) {
    risks.push(`Low sentiment confidence (${(sentiment.overall.confidence * 100).toFixed(1)}%) - unreliable signals`);
  }
  
  // Data quality risk
  if (sentiment.metadata.dataPoints < 5) {
    risks.push(`Limited data points (${sentiment.metadata.dataPoints}) - may not represent full market sentiment`);
  }
  
  // Conflicting signals risk
  const newsScore = sentiment.news.sentiment.score;
  const socialScore = sentiment.social.sentiment.score;
  
  if ((newsScore > 0.2 && socialScore < -0.2) || (newsScore < -0.2 && socialScore > 0.2)) {
    risks.push('Conflicting sentiment between news and social media - mixed market signals');
  }
  
  // Critical impact risk
  if (sentiment.signals.tradingImpact === 'CRITICAL') {
    risks.push('Critical sentiment impact - high volatility and unpredictable price movements expected');
  }
  
  return risks;
}

/**
 * Generate fallback sentiment for errors
 */
function generateFallbackSentiment() {
  return {
    overallSentiment: 'NEUTRAL',
    sentimentScore: 0,
    confidence: 0.5,
    tradingImpact: 'LOW',
    direction: 'NEUTRAL',
    strength: 'WEAK',
    reasoning: 'Fallback sentiment due to analysis error'
  };
}

/**
 * Calculate batch sentiment summary
 */
function calculateSentimentBatchSummary(results: any[]) {
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    return {
      averageSentimentScore: 0,
      averageConfidence: 0,
      sentimentDistribution: {},
      impactDistribution: {},
      marketMood: 'NEUTRAL'
    };
  }
  
  // Calculate averages
  const avgSentimentScore = successful.reduce((sum, r) => sum + r.summary.sentimentScore, 0) / successful.length;
  const avgConfidence = successful.reduce((sum, r) => sum + r.summary.confidence, 0) / successful.length;
  
  // Sentiment distribution
  const sentimentCounts: { [key: string]: number } = {};
  successful.forEach(r => {
    const sentiment = r.summary.overallSentiment;
    sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
  });
  
  // Impact distribution
  const impactCounts: { [key: string]: number } = {};
  successful.forEach(r => {
    const impact = r.summary.tradingImpact;
    impactCounts[impact] = (impactCounts[impact] || 0) + 1;
  });
  
  // Market mood
  const positiveCount = (sentimentCounts['POSITIVE'] || 0) + (sentimentCounts['VERY_POSITIVE'] || 0);
  const negativeCount = (sentimentCounts['NEGATIVE'] || 0) + (sentimentCounts['VERY_NEGATIVE'] || 0);
  
  let marketMood = 'NEUTRAL';
  if (positiveCount > negativeCount * 1.5) marketMood = 'OPTIMISTIC';
  else if (negativeCount > positiveCount * 1.5) marketMood = 'PESSIMISTIC';
  
  return {
    averageSentimentScore: avgSentimentScore,
    averageConfidence: avgConfidence,
    sentimentDistribution: sentimentCounts,
    impactDistribution: impactCounts,
    marketMood
  };
}