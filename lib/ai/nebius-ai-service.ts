interface NebiusAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface TradingAnalysisResult {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  technicalIndicators: {
    rsi: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    support: number;
    resistance: number;
    sentiment: string;
  };
  riskAssessment: {
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    recommendedLeverage: number;
    stopLoss: number;
    takeProfit: number;
  };
  modelUsed: string;
  timestamp: string;
}

export class NebiusAIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.studio.nebius.ai/v1';
  private model: string = 'meta-llama/Meta-Llama-3.1-8B-Instruct';
  private fastModel: string = 'meta-llama/Meta-Llama-3.1-8B-Instruct-fast';

  constructor() {
    this.apiKey = process.env.NEBIUS_API_KEY || 'eyJhbGciOiJIUzI1NiIsImtpZCI6IlV6SXJWd1h0dnprLVRvdzlLZWstc0M1akptWXBvX1VaVkxUZlpnMDRlOFUiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiJnb29nbGUtb2F1dGgyfDExNDE3OTYwNTEwMjcyNDQ2MjIxNyIsInNjb3BlIjoib3BlbmlkIG9mZmxpbmVfYWNjZXNzIiwiaXNzIjoiYXBpX2tleV9pc3N1ZXIiLCJhdWQiOlsiaHR0cHM6Ly9uZWJpdXMtaW5mZXJlbmNlLmV1LmF1dGgwLmNvbS9hcGkvdjIvIl0sImV4cCI6MTkxMjY3MDg1MCwidXVpZCI6IjE5OWE1YWM5LTFiMjQtNDQ1Zi1hNDFmLTJjNGE0MDdlMzU5MCIsIm5hbWUiOiJNQ1AiLCJleHBpcmVzX2F0IjoiMjAzMC0wOC0xMVQwOToyNzozMCswMDAwIn0.ajJ9NJVIqpQSb6so-xJsSn0Img9EYCO8XTopZUYuHRA';
  }

  /**
   * NEW: Analyze with custom prompt for whale detection
   */
  async analyzeWithPrompt(prompt: string, maxTokens: number = 2000): Promise<any> {
    try {
      console.log('🐋 Nebius AI analyzing with whale detection prompt...');
      
      const messages = [
        {
          role: "user",
          content: prompt
        }
      ];

      const response = await this.makeRequest(messages, this.model, maxTokens);
      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in Nebius AI response');
      }

      // Try to parse as JSON
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.warn('⚠️ Nebius AI response is not valid JSON, returning raw content');
        return content;
      }

    } catch (error) {
      console.error('❌ Error in Nebius AI whale analysis:', error);
      throw error;
    }
  }

  private async makeRequest(messages: any[], useModel?: string, maxTokens: number = 500): Promise<NebiusAIResponse> {
    const requestBody = {
      model: useModel || this.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2,
      top_p: 0.9
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nebius AI API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async analyzeCryptocurrency(
    symbol: string, 
    marketData: {
      price: number;
      change24h: number;
      volume24h: number;
      high24h: number;
      low24h: number;
      rsi?: number;
    }
  ): Promise<TradingAnalysisResult> {
    try {
      console.log(`🤖 Nebius AI analyzing ${symbol}...`);

      // Calculate technical indicators
      const rsi = marketData.rsi || this.calculateRSI(marketData.price, marketData.change24h);
      const volatility = this.calculateVolatility(marketData.high24h, marketData.low24h, marketData.price);
      
      // Create comprehensive analysis prompt
      const analysisPrompt = [
        {
          role: "system",
          content: `You are an expert cryptocurrency trading analyst with deep knowledge of technical analysis, market psychology, and risk management. 

Your task is to analyze cryptocurrency market data and provide precise trading recommendations. You must respond in a specific JSON format.

Always consider:
- Technical indicators (RSI, support/resistance, trend analysis)
- Market sentiment and psychology
- Risk-reward ratios
- Volume analysis
- Market volatility

Respond ONLY with valid JSON in this exact format:
{
  "action": "BUY|SELL|HOLD",
  "confidence": 0.XX,
  "sentiment": "BULLISH|BEARISH|NEUTRAL",
  "trend": "BULLISH|BEARISH|NEUTRAL", 
  "support": XXXX.XX,
  "resistance": XXXX.XX,
  "volatility": "LOW|MEDIUM|HIGH",
  "leverage": X,
  "stopLoss": X.X,
  "takeProfit": XX.X,
  "reasoning": "Brief explanation of the analysis and recommendation"
}`
        },
        {
          role: "user",
          content: `Analyze ${symbol} cryptocurrency:

Current Market Data:
- Price: $${marketData.price.toLocaleString()}
- 24h Change: ${marketData.change24h.toFixed(2)}%
- 24h Volume: $${marketData.volume24h.toLocaleString()}
- 24h High: $${marketData.high24h.toLocaleString()}
- 24h Low: $${marketData.low24h.toLocaleString()}
- RSI: ${rsi.toFixed(1)}
- Volatility: ${volatility}

Market Context:
- Current trend: ${marketData.change24h > 2 ? 'Strong bullish' : marketData.change24h < -2 ? 'Strong bearish' : 'Neutral'}
- RSI level: ${rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Normal'}
- Volume: ${marketData.volume24h > 1000000000 ? 'High' : 'Normal'}

Provide your analysis as JSON only.`
        }
      ];

      const response = await this.makeRequest(analysisPrompt, this.model, 400);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from Nebius AI');
      }

      const aiResponse = response.choices[0].message.content;
      console.log(`🎯 Nebius AI raw response for ${symbol}:`, aiResponse);

      // Parse AI response
      let parsedAnalysis;
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        parsedAnalysis = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Fallback analysis if JSON parsing fails
        parsedAnalysis = this.createFallbackAnalysis(symbol, marketData, aiResponse);
      }

      // Validate and format the analysis
      const analysis: TradingAnalysisResult = {
        symbol,
        action: this.validateAction(parsedAnalysis.action),
        confidence: Math.min(Math.max(parsedAnalysis.confidence || 0.5, 0), 1),
        reasoning: parsedAnalysis.reasoning || aiResponse.substring(0, 200),
        technicalIndicators: {
          rsi: rsi,
          trend: parsedAnalysis.trend || 'NEUTRAL',
          support: parsedAnalysis.support || marketData.low24h,
          resistance: parsedAnalysis.resistance || marketData.high24h,
          sentiment: parsedAnalysis.sentiment || 'NEUTRAL'
        },
        riskAssessment: {
          volatility: parsedAnalysis.volatility || volatility,
          marketSentiment: parsedAnalysis.sentiment || 'NEUTRAL',
          recommendedLeverage: Math.min(Math.max(parsedAnalysis.leverage || 5, 1), 20),
          stopLoss: parsedAnalysis.stopLoss || 3,
          takeProfit: parsedAnalysis.takeProfit || 10
        },
        modelUsed: `Nebius-${this.model}`,
        timestamp: new Date().toISOString()
      };

      // Log token usage if available
      if (response.usage) {
        console.log(`💰 Token usage for ${symbol}: ${response.usage.total_tokens} tokens (~$${(response.usage.total_tokens * 0.0001).toFixed(4)})`);
      }

      console.log(`✅ Nebius AI analysis completed for ${symbol}: ${analysis.action} (${(analysis.confidence * 100).toFixed(1)}%)`);
      
      return analysis;

    } catch (error) {
      console.error(`❌ Nebius AI analysis failed for ${symbol}:`, error);
      
      // Return fallback analysis on error
      return this.createFallbackAnalysis(symbol, marketData, `Error: ${(error as Error).message}`);
    }
  }

  async getQuickSentiment(symbols: string[], marketData: any[]): Promise<string> {
    try {
      const marketSummary = symbols.map((symbol, index) => {
        const data = marketData[index];
        return `${symbol}: $${data.price} (${data.change24h > 0 ? '+' : ''}${data.change24h.toFixed(2)}%)`;
      }).join(', ');

      const sentimentPrompt = [
        {
          role: "user",
          content: `Quick market sentiment analysis for crypto market:

${marketSummary}

Respond with only: BULLISH/BEARISH/NEUTRAL + confidence percentage + one sentence explanation.`
        }
      ];

      const response = await this.makeRequest(sentimentPrompt, this.fastModel, 100);
      
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      }
      
      return 'NEUTRAL 50% - Unable to determine market sentiment';
    } catch (error) {
      console.error('Quick sentiment analysis failed:', error);
      return 'NEUTRAL 50% - Sentiment analysis unavailable';
    }
  }

  private validateAction(action: string): 'BUY' | 'SELL' | 'HOLD' {
    const upperAction = action?.toUpperCase();
    if (upperAction === 'BUY' || upperAction === 'SELL' || upperAction === 'HOLD') {
      return upperAction as 'BUY' | 'SELL' | 'HOLD';
    }
    return 'HOLD';
  }

  private calculateRSI(currentPrice: number, change24h: number): number {
    // Simplified RSI calculation based on price change
    const priceChange = change24h;
    
    if (priceChange > 0) {
      return Math.min(50 + (priceChange * 2), 100);
    } else {
      return Math.max(50 + (priceChange * 2), 0);
    }
  }

  private calculateVolatility(high: number, low: number, price: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    const range = ((high - low) / price) * 100;
    
    if (range < 3) return 'LOW';
    if (range > 8) return 'HIGH';
    return 'MEDIUM';
  }

  private createFallbackAnalysis(symbol: string, marketData: any, reasoning: string): TradingAnalysisResult {
    const rsi = this.calculateRSI(marketData.price, marketData.change24h);
    const volatility = this.calculateVolatility(marketData.high24h, marketData.low24h, marketData.price);
    
    // Simple fallback logic
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 0.3;
    
    if (marketData.change24h > 3 && rsi < 70) {
      action = 'BUY';
      confidence = 0.6;
    } else if (marketData.change24h < -3 && rsi > 30) {
      action = 'SELL';
      confidence = 0.6;
    }

    return {
      symbol,
      action,
      confidence,
      reasoning: `Fallback analysis: ${reasoning}`,
      technicalIndicators: {
        rsi,
        trend: marketData.change24h > 1 ? 'BULLISH' : marketData.change24h < -1 ? 'BEARISH' : 'NEUTRAL',
        support: marketData.low24h,
        resistance: marketData.high24h,
        sentiment: 'NEUTRAL'
      },
      riskAssessment: {
        volatility,
        marketSentiment: 'NEUTRAL',
        recommendedLeverage: 5,
        stopLoss: 3,
        takeProfit: 10
      },
      modelUsed: 'Nebius-Fallback',
      timestamp: new Date().toISOString()
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = [
        {
          role: "user",
          content: "Respond with 'OK' if you can analyze cryptocurrency markets."
        }
      ];

      const response = await this.makeRequest(testPrompt, this.fastModel, 50);
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('Nebius AI connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let nebiusAIService: NebiusAIService | null = null;

export function getNebiusAIService(): NebiusAIService {
  if (!nebiusAIService) {
    nebiusAIService = new NebiusAIService();
  }
  return nebiusAIService;
}