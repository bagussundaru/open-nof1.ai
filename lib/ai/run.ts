import { getMarketAnalyzer } from './market-analyzer';
import { getNebiusAIService } from './nebius-ai-service';
import { DatabaseService } from '@/lib/trading-bot/database/database-service';
import { getEnhancedDataCollector } from '@/lib/market-data/enhanced-data-collector';
import { generateWhaleDetectionPrompt } from './whale-detection-prompt';
import { getBinanceClient } from '@/lib/exchanges/binance-futures-client';

// Trading symbols to analyze
const TRADING_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOGEUSDT'];

export async function runAIAnalysis() {
  try {
    console.log('🚀 Starting Enhanced Nebius AI Trading Analysis with Whale Detection...');
    
    const marketAnalyzer = getMarketAnalyzer();
    const nebiusAI = getNebiusAIService();
    const binanceClient = getBinanceClient();
    const enhancedDataCollector = getEnhancedDataCollector();
    
    // Test Nebius AI connection first
    const isNebiusConnected = await nebiusAI.testConnection();
    console.log(`🔗 Nebius AI connection: ${isNebiusConnected ? 'Connected' : 'Failed'}`);
    
    // Enhanced analysis with whale detection
    const analyses = [];
    
    for (const symbol of TRADING_SYMBOLS) {
      try {
        console.log(`🐋 Enhanced analysis for ${symbol}...`);
        
        // Collect enhanced market data
        const enhancedData = await enhancedDataCollector.collectEnhancedMarketData(symbol);
        
        // Generate whale detection prompt
        const whalePrompt = generateWhaleDetectionPrompt(enhancedData);
        
        // Get AI analysis with whale detection
        let whaleAnalysis;
        if (isNebiusConnected) {
          try {
            const aiResponse = await nebiusAI.analyzeWithPrompt(whalePrompt);
            whaleAnalysis = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
          } catch (aiError) {
            console.warn(`⚠️ Whale AI analysis failed for ${symbol}, using fallback:`, aiError);
            // Fallback to regular analysis
            whaleAnalysis = await marketAnalyzer.analyzeSingleSymbol(symbol);
          }
        } else {
          // Fallback to regular analysis
          whaleAnalysis = await marketAnalyzer.analyzeSingleSymbol(symbol);
        }
        
        analyses.push(whaleAnalysis);
        
      } catch (error) {
        console.error(`❌ Error in enhanced analysis for ${symbol}:`, error);
        // Fallback to regular analysis
        try {
          const fallbackAnalysis = await marketAnalyzer.analyzeSingleSymbol(symbol);
          analyses.push(fallbackAnalysis);
        } catch (fallbackError) {
          console.error(`❌ Fallback analysis also failed for ${symbol}:`, fallbackError);
        }
      }
    }
    
    // Store analyses in database
    const storedAnalyses = [];
    
    const db = DatabaseService.getInstance();
    const prisma = db.getPrismaClient();
    
    for (const analysis of analyses) {
      try {
        // Store in database
        const stored = await prisma.aIAnalysis.create({
          data: {
            symbol: analysis.symbol,
            action: analysis.action,
            confidence: analysis.confidence,
            reasoning: analysis.reasoning,
            technicalData: JSON.stringify(analysis.technicalIndicators),
            riskData: JSON.stringify(analysis.riskAssessment),
            modelUsed: analysis.modelUsed,
            timestamp: new Date(analysis.timestamp)
          }
        });
        
        storedAnalyses.push({
          id: stored.id,
          ...analysis
        });
        
        console.log(`✅ Analysis stored for ${analysis.symbol}: ${analysis.action} (${(analysis.confidence * 100).toFixed(1)}%)`);
        
      } catch (dbError) {
        console.error(`❌ Failed to store analysis for ${analysis.symbol}:`, dbError);
        // Continue with other analyses even if one fails to store
        storedAnalyses.push(analysis);
      }
    }
    
    // Get quick market sentiment from Nebius AI
    let marketSentiment = 'NEUTRAL 50% - Sentiment analysis unavailable';
    try {
      if (isNebiusConnected && analyses.length > 0) {
        const marketData = analyses.map(a => ({
          price: 0, // Will be filled by sentiment analysis
          change24h: 0 // Will be extracted from reasoning
        }));
        marketSentiment = await nebiusAI.getQuickSentiment(TRADING_SYMBOLS, marketData);
      }
    } catch (sentimentError) {
      console.log('Market sentiment analysis failed:', sentimentError);
    }

    // Find the best trading opportunity
    const bestOpportunity = analyses
      .filter(a => a.action !== 'HOLD')
      .sort((a, b) => b.confidence - a.confidence)[0];
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalAnalyzed: analyses.length,
      buySignals: analyses.filter(a => a.action === 'BUY').length,
      sellSignals: analyses.filter(a => a.action === 'SELL').length,
      holdSignals: analyses.filter(a => a.action === 'HOLD').length,
      marketSentiment: marketSentiment,
      nebiusAIStatus: isNebiusConnected ? 'Connected' : 'Disconnected',
      bestOpportunity: bestOpportunity ? {
        symbol: bestOpportunity.symbol,
        action: bestOpportunity.action,
        confidence: bestOpportunity.confidence,
        reasoning: bestOpportunity.reasoning,
        modelUsed: bestOpportunity.modelUsed
      } : null,
      analyses: storedAnalyses
    };
    
    console.log('🎯 Nebius AI Analysis Summary:', {
      total: summary.totalAnalyzed,
      buy: summary.buySignals,
      sell: summary.sellSignals,
      hold: summary.holdSignals,
      sentiment: summary.marketSentiment,
      nebiusStatus: summary.nebiusAIStatus,
      best: summary.bestOpportunity?.symbol || 'None'
    });
    
    return summary;
    
  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    
    // Return fallback analysis
    return {
      timestamp: new Date().toISOString(),
      totalAnalyzed: 0,
      buySignals: 0,
      sellSignals: 0,
      holdSignals: 0,
      bestOpportunity: null,
      error: (error as Error).message,
      analyses: []
    };
  }
}

export default runAIAnalysis