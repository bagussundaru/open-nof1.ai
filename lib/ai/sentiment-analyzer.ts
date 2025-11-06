import { getNebiusAIService } from './nebius-ai-service';

export interface NewsItem {
  title: string;
  description: string;
  content?: string;
  source: string;
  publishedAt: string;
  url: string;
  category: 'crypto' | 'bitcoin' | 'ethereum' | 'defi' | 'nft' | 'regulation' | 'adoption' | 'general';
  relevanceScore: number; // 0-1
}

export interface SentimentScore {
  score: number; // -1 (very negative) to 1 (very positive)
  confidence: number; // 0-1
  magnitude: number; // 0-1 (intensity of sentiment)
  reasoning: string;
  keywords: string[];
  category: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';
}

export interface SocialMediaPost {
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord';
  content: string;
  author: string;
  timestamp: string;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    views?: number;
  };
  influencerScore: number; // 0-1 (how influential the author is)
  relevanceScore: number; // 0-1
}

export interface MarketSentiment {
  overall: SentimentScore;
  news: {
    sentiment: SentimentScore;
    articles: NewsItem[];
    timeframe: '1h' | '4h' | '24h';
  };
  social: {
    sentiment: SentimentScore;
    posts: SocialMediaPost[];
    platforms: {
      twitter: SentimentScore;
      reddit: SentimentScore;
      telegram: SentimentScore;
    };
  };
  trends: {
    shortTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // 1-4h
    mediumTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // 4-24h
    longTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // 1-7d
  };
  signals: {
    strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG';
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    tradingImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  metadata: {
    timestamp: string;
    symbol: string;
    dataPoints: number;
    processingTime: number;
  };
}

export class SentimentAnalyzer {
  private nebiusAI: any;
  private newsApiKey: string;
  private twitterApiKey: string;
  
  constructor() {
    this.nebiusAI = getNebiusAIService();
    this.newsApiKey = process.env.NEWS_API_KEY || '';
    this.twitterApiKey = process.env.TWITTER_API_KEY || '';
  }

  /**
   * Analyze market sentiment for a given symbol
   */
  async analyzeMarketSentiment(symbol: string, timeframe: '1h' | '4h' | '24h' = '4h'): Promise<MarketSentiment> {
    console.log(`📰 Analyzing market sentiment for ${symbol} (${timeframe} timeframe)...`);
    
    const startTime = Date.now();
    
    try {
      // Collect news and social media data in parallel
      const [newsData, socialData] = await Promise.all([
        this.collectNewsData(symbol, timeframe),
        this.collectSocialMediaData(symbol, timeframe)
      ]);
      
      // Analyze sentiment for news
      const newsSentiment = await this.analyzeNewsSentiment(newsData);
      
      // Analyze sentiment for social media
      const socialSentiment = await this.analyzeSocialMediaSentiment(socialData);
      
      // Calculate overall sentiment
      const overallSentiment = this.calculateOverallSentiment(newsSentiment, socialSentiment);
      
      // Determine trends
      const trends = await this.analyzeSentimentTrends(symbol, newsSentiment, socialSentiment);
      
      // Generate trading signals
      const signals = this.generateSentimentSignals(overallSentiment, newsSentiment, socialSentiment, trends);
      
      const sentiment: MarketSentiment = {
        overall: overallSentiment,
        news: {
          sentiment: newsSentiment,
          articles: newsData,
          timeframe
        },
        social: {
          sentiment: socialSentiment,
          posts: socialData,
          platforms: {
            twitter: await this.analyzePlatformSentiment(socialData.filter(p => p.platform === 'twitter')),
            reddit: await this.analyzePlatformSentiment(socialData.filter(p => p.platform === 'reddit')),
            telegram: await this.analyzePlatformSentiment(socialData.filter(p => p.platform === 'telegram'))
          }
        },
        trends,
        signals,
        metadata: {
          timestamp: new Date().toISOString(),
          symbol,
          dataPoints: newsData.length + socialData.length,
          processingTime: Date.now() - startTime
        }
      };
      
      console.log(`✅ Sentiment analysis completed for ${symbol}`);
      console.log(`📊 Overall sentiment: ${overallSentiment.category} (${(overallSentiment.score * 100).toFixed(1)}%)`);
      console.log(`🎯 Trading signal: ${signals.direction} (${signals.strength})`);
      
      return sentiment;
      
    } catch (error) {
      console.error(`❌ Error analyzing sentiment for ${symbol}:`, error);
      return this.getFallbackSentiment(symbol, timeframe);
    }
  }

  /**
   * Collect news data from various sources
   */
  private async collectNewsData(symbol: string, timeframe: string): Promise<NewsItem[]> {
    try {
      const newsItems: NewsItem[] = [];
      
      // Try to collect from multiple news sources
      const sources = [
        this.collectNewsAPIData(symbol, timeframe),
        this.collectCryptoNewsData(symbol, timeframe),
        this.collectRedditNewsData(symbol, timeframe)
      ];
      
      const results = await Promise.allSettled(sources);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          newsItems.push(...result.value);
          console.log(`✅ Collected ${result.value.length} articles from source ${index + 1}`);
        } else if (result.status === 'rejected') {
          console.log(`⚠️ Failed to collect from news source ${index + 1}:`, result.reason);
        }
      });
      
      // If no real news data available, fall back to mock data
      if (newsItems.length === 0) {
        console.log('📰 Using mock news data as fallback');
        return this.getMockNewsData(symbol, timeframe);
      }
      
      // Sort by relevance and recency
      return newsItems
        .sort((a, b) => {
          const scoreA = a.relevanceScore * (1 - (Date.now() - new Date(a.publishedAt).getTime()) / (24 * 60 * 60 * 1000));
          const scoreB = b.relevanceScore * (1 - (Date.now() - new Date(b.publishedAt).getTime()) / (24 * 60 * 60 * 1000));
          return scoreB - scoreA;
        })
        .slice(0, 20); // Limit to top 20 articles
      
    } catch (error) {
      console.error('❌ Error collecting news data:', error);
      return this.getMockNewsData(symbol, timeframe);
    }
  }

  /**
   * Collect news from NewsAPI
   */
  private async collectNewsAPIData(symbol: string, timeframe: string): Promise<NewsItem[]> {
    if (!this.newsApiKey) {
      throw new Error('NewsAPI key not configured');
    }
    
    try {
      const cryptoKeywords = this.getCryptoKeywords(symbol);
      const query = cryptoKeywords.join(' OR ');
      const fromDate = this.getTimeframeDate(timeframe);
      
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&from=${fromDate}&sortBy=relevancy&language=en&apiKey=${this.newsApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.articles) {
        throw new Error('No articles returned from NewsAPI');
      }
      
      return data.articles.slice(0, 10).map((article: any) => ({
        title: article.title,
        description: article.description || '',
        content: article.content || '',
        source: article.source.name,
        publishedAt: article.publishedAt,
        url: article.url,
        category: this.categorizeNews(article.title + ' ' + article.description),
        relevanceScore: this.calculateNewsRelevance(article, symbol)
      }));
      
    } catch (error) {
      console.error('❌ NewsAPI collection failed:', error);
      throw error;
    }
  }

  /**
   * Collect crypto-specific news
   */
  private async collectCryptoNewsData(symbol: string, timeframe: string): Promise<NewsItem[]> {
    try {
      // This would integrate with CoinDesk, CoinTelegraph, etc.
      // For now, simulate crypto news collection
      const cryptoNews = await this.simulateCryptoNewsCollection(symbol, timeframe);
      return cryptoNews;
      
    } catch (error) {
      console.error('❌ Crypto news collection failed:', error);
      throw error;
    }
  }

  /**
   * Collect news from Reddit
   */
  private async collectRedditNewsData(symbol: string, timeframe: string): Promise<NewsItem[]> {
    try {
      // This would integrate with Reddit API
      // For now, simulate Reddit news collection
      const redditNews = await this.simulateRedditNewsCollection(symbol, timeframe);
      return redditNews;
      
    } catch (error) {
      console.error('❌ Reddit news collection failed:', error);
      throw error;
    }
  }

  /**
   * Collect social media data with enhanced tracking
   */
  private async collectSocialMediaData(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    try {
      const socialPosts: SocialMediaPost[] = [];
      
      // Collect from multiple social media platforms
      const platforms = [
        this.collectTwitterData(symbol, timeframe),
        this.collectRedditData(symbol, timeframe),
        this.collectTelegramData(symbol, timeframe),
        this.collectDiscordData(symbol, timeframe)
      ];
      
      const results = await Promise.allSettled(platforms);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          socialPosts.push(...result.value);
          console.log(`✅ Collected ${result.value.length} posts from platform ${index + 1}`);
        } else if (result.status === 'rejected') {
          console.log(`⚠️ Failed to collect from platform ${index + 1}:`, result.reason);
        }
      });
      
      // If no real social data available, fall back to mock data
      if (socialPosts.length === 0) {
        console.log('💬 Using mock social media data as fallback');
        return this.getMockSocialMediaData(symbol, timeframe);
      }
      
      // Sort by engagement and influence
      return socialPosts
        .sort((a, b) => {
          const scoreA = (a.engagement.likes + a.engagement.shares * 2 + a.engagement.comments) * a.influencerScore;
          const scoreB = (b.engagement.likes + b.engagement.shares * 2 + b.engagement.comments) * b.influencerScore;
          return scoreB - scoreA;
        })
        .slice(0, 50); // Limit to top 50 posts
      
    } catch (error) {
      console.error('❌ Error collecting social media data:', error);
      return this.getMockSocialMediaData(symbol, timeframe);
    }
  }

  /**
   * Collect Twitter data
   */
  private async collectTwitterData(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    try {
      // This would integrate with Twitter API v2
      // For now, simulate Twitter data collection
      return this.simulateTwitterCollection(symbol, timeframe);
      
    } catch (error) {
      console.error('❌ Twitter collection failed:', error);
      throw error;
    }
  }

  /**
   * Collect Reddit data
   */
  private async collectRedditData(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    try {
      // This would integrate with Reddit API
      // For now, simulate Reddit data collection
      return this.simulateRedditCollection(symbol, timeframe);
      
    } catch (error) {
      console.error('❌ Reddit collection failed:', error);
      throw error;
    }
  }

  /**
   * Collect Telegram data
   */
  private async collectTelegramData(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    try {
      // This would integrate with Telegram Bot API
      // For now, simulate Telegram data collection
      return this.simulateTelegramCollection(symbol, timeframe);
      
    } catch (error) {
      console.error('❌ Telegram collection failed:', error);
      throw error;
    }
  }

  /**
   * Collect Discord data
   */
  private async collectDiscordData(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    try {
      // This would integrate with Discord API
      // For now, simulate Discord data collection
      return this.simulateDiscordCollection(symbol, timeframe);
      
    } catch (error) {
      console.error('❌ Discord collection failed:', error);
      throw error;
    }
  }  /**
   
* Analyze sentiment of news articles using AI
   */
  private async analyzeNewsSentiment(articles: NewsItem[]): Promise<SentimentScore> {
    if (articles.length === 0) {
      return {
        score: 0,
        confidence: 0.5,
        magnitude: 0,
        reasoning: 'No news articles available for analysis',
        keywords: [],
        category: 'NEUTRAL'
      };
    }

    try {
      // Prepare news content for AI analysis
      const newsContent = articles.map(article => 
        `Title: ${article.title}\nDescription: ${article.description}\nSource: ${article.source}`
      ).join('\n\n---\n\n');

      const prompt = `Analyze the sentiment of the following cryptocurrency news articles and provide a comprehensive sentiment analysis:

${newsContent}

Please analyze:
1. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
2. Confidence level (0 to 1)
3. Sentiment magnitude/intensity (0 to 1)
4. Key reasoning for the sentiment
5. Important keywords that influenced the sentiment
6. Overall category (VERY_NEGATIVE, NEGATIVE, NEUTRAL, POSITIVE, VERY_POSITIVE)

Respond with JSON: {
  "score": -1 to 1,
  "confidence": 0 to 1,
  "magnitude": 0 to 1,
  "reasoning": "detailed explanation",
  "keywords": ["keyword1", "keyword2"],
  "category": "CATEGORY"
}`;

      const aiResponse = await this.nebiusAI.analyzeWithPrompt(prompt);
      const parsed = JSON.parse(aiResponse);
      
      return {
        score: Math.max(-1, Math.min(1, parsed.score || 0)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        magnitude: Math.max(0, Math.min(1, parsed.magnitude || 0)),
        reasoning: parsed.reasoning || 'AI sentiment analysis of news articles',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        category: parsed.category || 'NEUTRAL'
      };
      
    } catch (error) {
      console.error('❌ Error analyzing news sentiment:', error);
      return this.calculateBasicSentiment(articles.map(a => a.title + ' ' + a.description));
    }
  }

  /**
   * Analyze sentiment of social media posts with enhanced weighting
   */
  private async analyzeSocialMediaSentiment(posts: SocialMediaPost[]): Promise<SentimentScore> {
    if (posts.length === 0) {
      return {
        score: 0,
        confidence: 0.5,
        magnitude: 0,
        reasoning: 'No social media posts available for analysis',
        keywords: [],
        category: 'NEUTRAL'
      };
    }

    try {
      // Weight posts by engagement and influencer score
      const weightedPosts = posts.map(post => ({
        content: post.content,
        platform: post.platform,
        weight: (post.engagement.likes + post.engagement.shares * 2 + post.engagement.comments) * post.influencerScore,
        timestamp: post.timestamp
      }));

      // Sort by weight and take top posts
      const topPosts = weightedPosts
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 20);

      const socialContent = topPosts.map(post => 
        `Platform: ${post.platform}\nContent: ${post.content}\nWeight: ${post.weight.toFixed(2)}`
      ).join('\n\n---\n\n');

      const prompt = `Analyze the sentiment of the following cryptocurrency-related social media posts:

${socialContent}

Consider:
1. Overall market sentiment expressed
2. Emotional tone and intensity
3. Bullish vs bearish indicators
4. Fear, greed, and FOMO indicators
5. Technical vs fundamental discussions
6. Platform-specific sentiment patterns
7. Post engagement and influence weights

Provide sentiment analysis in JSON format:
{
  "score": -1 to 1,
  "confidence": 0 to 1,
  "magnitude": 0 to 1,
  "reasoning": "detailed explanation",
  "keywords": ["keyword1", "keyword2"],
  "category": "VERY_NEGATIVE|NEGATIVE|NEUTRAL|POSITIVE|VERY_POSITIVE"
}`;

      const aiResponse = await this.nebiusAI.analyzeWithPrompt(prompt);
      const parsed = JSON.parse(aiResponse);
      
      return {
        score: Math.max(-1, Math.min(1, parsed.score || 0)),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        magnitude: Math.max(0, Math.min(1, parsed.magnitude || 0)),
        reasoning: parsed.reasoning || 'AI sentiment analysis of social media posts',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        category: parsed.category || 'NEUTRAL'
      };
      
    } catch (error) {
      console.error('❌ Error analyzing social media sentiment:', error);
      return this.calculateBasicSentiment(posts.map(p => p.content));
    }
  }

  /**
   * Analyze sentiment for specific platform
   */
  private async analyzePlatformSentiment(posts: SocialMediaPost[]): Promise<SentimentScore> {
    if (posts.length === 0) {
      return {
        score: 0,
        confidence: 0.5,
        magnitude: 0,
        reasoning: 'No posts available for platform analysis',
        keywords: [],
        category: 'NEUTRAL'
      };
    }

    // Use enhanced sentiment calculation for platform-specific analysis
    return this.calculateEnhancedSentiment(posts.map(p => p.content), posts[0].platform);
  }

  /**
   * Calculate overall sentiment from news and social media with dynamic weighting
   */
  private calculateOverallSentiment(newsSentiment: SentimentScore, socialSentiment: SentimentScore): SentimentScore {
    // Dynamic weighting based on confidence levels
    const newsConfidence = newsSentiment.confidence;
    const socialConfidence = socialSentiment.confidence;
    
    // Base weights: news 60%, social 40%
    let newsWeight = 0.6;
    let socialWeight = 0.4;
    
    // Adjust weights based on confidence
    if (newsConfidence > socialConfidence + 0.2) {
      newsWeight = 0.7;
      socialWeight = 0.3;
    } else if (socialConfidence > newsConfidence + 0.2) {
      newsWeight = 0.5;
      socialWeight = 0.5;
    }
    
    const overallScore = (newsSentiment.score * newsWeight) + (socialSentiment.score * socialWeight);
    const overallConfidence = (newsSentiment.confidence * newsWeight) + (socialSentiment.confidence * socialWeight);
    const overallMagnitude = Math.max(newsSentiment.magnitude, socialSentiment.magnitude);
    
    const category = this.scoreToCategory(overallScore);
    
    const reasoning = `Combined sentiment analysis: News (${newsSentiment.category}, ${(newsSentiment.score * 100).toFixed(1)}%, ${(newsWeight * 100).toFixed(0)}% weight) + Social (${socialSentiment.category}, ${(socialSentiment.score * 100).toFixed(1)}%, ${(socialWeight * 100).toFixed(0)}% weight) = ${category} overall sentiment`;
    
    const keywords = [...new Set([...newsSentiment.keywords, ...socialSentiment.keywords])];
    
    return {
      score: overallScore,
      confidence: overallConfidence,
      magnitude: overallMagnitude,
      reasoning,
      keywords,
      category
    };
  }

  /**
   * Analyze sentiment trends over time with historical context
   */
  private async analyzeSentimentTrends(
    symbol: string, 
    newsSentiment: SentimentScore, 
    socialSentiment: SentimentScore
  ): Promise<MarketSentiment['trends']> {
    
    // Enhanced trend analysis using current sentiment and momentum
    const overallScore = (newsSentiment.score + socialSentiment.score) / 2;
    const sentimentMomentum = this.calculateSentimentMomentum(newsSentiment, socialSentiment);
    
    let shortTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let mediumTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let longTerm: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    
    // Short-term trend (1-4h) - more sensitive to current sentiment
    if (overallScore > 0.15 || sentimentMomentum > 0.3) {
      shortTerm = 'BULLISH';
    } else if (overallScore < -0.15 || sentimentMomentum < -0.3) {
      shortTerm = 'BEARISH';
    }
    
    // Medium-term trend (4-24h) - requires stronger sentiment
    if (overallScore > 0.3 && sentimentMomentum > 0.2) {
      mediumTerm = 'BULLISH';
    } else if (overallScore < -0.3 && sentimentMomentum < -0.2) {
      mediumTerm = 'BEARISH';
    }
    
    // Long-term trend (1-7d) - requires very strong and consistent sentiment
    if (overallScore > 0.5 && sentimentMomentum > 0.4) {
      longTerm = 'BULLISH';
    } else if (overallScore < -0.5 && sentimentMomentum < -0.4) {
      longTerm = 'BEARISH';
    }
    
    return { shortTerm, mediumTerm, longTerm };
  }

  /**
   * Generate enhanced trading signals based on sentiment
   */
  private generateSentimentSignals(
    overall: SentimentScore,
    news: SentimentScore,
    social: SentimentScore,
    trends: MarketSentiment['trends']
  ): MarketSentiment['signals'] {
    
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'VERY_STRONG' = 'WEAK';
    let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let tradingImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    
    const absScore = Math.abs(overall.score);
    const confidence = overall.confidence;
    const magnitude = overall.magnitude;
    
    // Determine direction with enhanced logic
    if (overall.score > 0.1) {
      direction = 'BULLISH';
    } else if (overall.score < -0.1) {
      direction = 'BEARISH';
    }
    
    // Determine strength based on multiple factors
    const strengthScore = (absScore * 0.4) + (confidence * 0.3) + (magnitude * 0.3);
    
    if (strengthScore > 0.8) {
      strength = 'VERY_STRONG';
      tradingImpact = 'CRITICAL';
    } else if (strengthScore > 0.6) {
      strength = 'STRONG';
      tradingImpact = 'HIGH';
    } else if (strengthScore > 0.4) {
      strength = 'MODERATE';
      tradingImpact = 'MEDIUM';
    } else if (strengthScore > 0.2) {
      strength = 'WEAK';
      tradingImpact = 'LOW';
    }
    
    // Boost impact if trends align across timeframes
    const trendsAlign = (trends.shortTerm === trends.mediumTerm) && (trends.mediumTerm === trends.longTerm);
    if (trendsAlign && trends.shortTerm !== 'NEUTRAL') {
      const impactLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const currentIndex = impactLevels.indexOf(tradingImpact);
      if (currentIndex < 3) {
        tradingImpact = impactLevels[currentIndex + 1] as any;
      }
    }
    
    // Check for sentiment divergence (news vs social)
    const sentimentDivergence = Math.abs(news.score - social.score);
    if (sentimentDivergence > 0.4) {
      // Reduce confidence for conflicting signals
      const adjustedConfidence = Math.max(0.3, confidence * 0.8);
      return {
        strength: strength === 'VERY_STRONG' ? 'STRONG' : strength,
        direction,
        confidence: adjustedConfidence,
        tradingImpact: tradingImpact === 'CRITICAL' ? 'HIGH' : tradingImpact
      };
    }
    
    return {
      strength,
      direction,
      confidence: overall.confidence,
      tradingImpact
    };
  }

  /**
   * Calculate enhanced sentiment using advanced techniques
   */
  private calculateEnhancedSentiment(texts: string[], platform?: string): SentimentScore {
    const positiveWords = ['bullish', 'moon', 'pump', 'buy', 'long', 'up', 'rise', 'gain', 'profit', 'bull', 'green', 'rocket', 'lambo', 'hodl', 'diamond', 'hands', 'breakout', 'rally', 'surge'];
    const negativeWords = ['bearish', 'dump', 'sell', 'short', 'down', 'fall', 'loss', 'bear', 'red', 'crash', 'rekt', 'fud', 'panic', 'fear', 'correction', 'decline', 'drop'];
    
    // Platform-specific sentiment modifiers
    const platformModifiers = {
      twitter: 1.2, // Twitter tends to be more reactive
      reddit: 1.0,  // Reddit is baseline
      telegram: 1.1, // Telegram groups can be influential
      discord: 0.9   // Discord is more casual
    };
    
    let positiveCount = 0;
    let negativeCount = 0;
    let totalWords = 0;
    let emotionalIntensity = 0;
    
    const foundKeywords: string[] = [];
    
    texts.forEach(text => {
      const words = text.toLowerCase().split(/\s+/);
      totalWords += words.length;
      
      // Count emojis and caps for emotional intensity
      const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
      const capsWords = words.filter(word => word === word.toUpperCase() && word.length > 2).length;
      emotionalIntensity += (emojiCount * 0.1) + (capsWords * 0.05);
      
      words.forEach(word => {
        if (positiveWords.includes(word)) {
          positiveCount++;
          if (!foundKeywords.includes(word)) foundKeywords.push(word);
        }
        if (negativeWords.includes(word)) {
          negativeCount++;
          if (!foundKeywords.includes(word)) foundKeywords.push(word);
        }
      });
    });
    
    const sentimentWords = positiveCount + negativeCount;
    let score = sentimentWords > 0 ? (positiveCount - negativeCount) / sentimentWords : 0;
    
    // Apply platform modifier
    if (platform && platformModifiers[platform as keyof typeof platformModifiers]) {
      score *= platformModifiers[platform as keyof typeof platformModifiers];
    }
    
    const magnitude = Math.min(1, (sentimentWords / Math.max(totalWords, 1)) + (emotionalIntensity / texts.length));
    const confidence = Math.min(0.9, magnitude * 1.5 + (sentimentWords / Math.max(totalWords, 1))); // Enhanced confidence calculation
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence,
      magnitude: Math.max(0, Math.min(1, magnitude)),
      reasoning: `Enhanced sentiment analysis: ${positiveCount} positive, ${negativeCount} negative words found across ${texts.length} ${platform || 'social media'} posts`,
      keywords: foundKeywords,
      category: this.scoreToCategory(score)
    };
  }

  /**
   * Calculate basic sentiment using keyword analysis (fallback)
   */
  private calculateBasicSentiment(texts: string[]): SentimentScore {
    const positiveWords = ['bullish', 'moon', 'pump', 'buy', 'long', 'up', 'rise', 'gain', 'profit', 'bull', 'green', 'rocket', 'lambo', 'hodl', 'diamond', 'hands'];
    const negativeWords = ['bearish', 'dump', 'sell', 'short', 'down', 'fall', 'loss', 'bear', 'red', 'crash', 'rekt', 'fud', 'panic', 'fear'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let totalWords = 0;
    
    const foundKeywords: string[] = [];
    
    texts.forEach(text => {
      const words = text.toLowerCase().split(/\s+/);
      totalWords += words.length;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) {
          positiveCount++;
          if (!foundKeywords.includes(word)) foundKeywords.push(word);
        }
        if (negativeWords.includes(word)) {
          negativeCount++;
          if (!foundKeywords.includes(word)) foundKeywords.push(word);
        }
      });
    });
    
    const sentimentWords = positiveCount + negativeCount;
    const score = sentimentWords > 0 ? (positiveCount - negativeCount) / sentimentWords : 0;
    const magnitude = sentimentWords / Math.max(totalWords, 1);
    const confidence = Math.min(0.8, magnitude * 2); // Basic confidence based on sentiment word density
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      confidence,
      magnitude: Math.max(0, Math.min(1, magnitude)),
      reasoning: `Basic sentiment analysis: ${positiveCount} positive, ${negativeCount} negative words found`,
      keywords: foundKeywords,
      category: this.scoreToCategory(score)
    };
  }

  /**
   * Calculate sentiment momentum
   */
  private calculateSentimentMomentum(newsSentiment: SentimentScore, socialSentiment: SentimentScore): number {
    // Simple momentum calculation based on magnitude and alignment
    const alignment = Math.abs(newsSentiment.score - socialSentiment.score) < 0.3 ? 1 : 0.5;
    const avgMagnitude = (newsSentiment.magnitude + socialSentiment.magnitude) / 2;
    const avgScore = (newsSentiment.score + socialSentiment.score) / 2;
    
    return avgScore * avgMagnitude * alignment;
  }

  /**
   * Convert score to category
   */
  private scoreToCategory(score: number): SentimentScore['category'] {
    if (score >= 0.6) return 'VERY_POSITIVE';
    if (score >= 0.2) return 'POSITIVE';
    if (score <= -0.6) return 'VERY_NEGATIVE';
    if (score <= -0.2) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Get crypto keywords for news search
   */
  private getCryptoKeywords(symbol: string): string[] {
    const baseKeywords = ['cryptocurrency', 'crypto', 'bitcoin', 'blockchain', 'digital currency'];
    
    // Add symbol-specific keywords
    if (symbol.includes('BTC')) {
      baseKeywords.push('bitcoin', 'BTC');
    } else if (symbol.includes('ETH')) {
      baseKeywords.push('ethereum', 'ETH');
    } else if (symbol.includes('ADA')) {
      baseKeywords.push('cardano', 'ADA');
    }
    
    return baseKeywords;
  }

  /**
   * Get date for timeframe
   */
  private getTimeframeDate(timeframe: string): string {
    const now = new Date();
    let hours = 4; // default 4h
    
    if (timeframe === '1h') hours = 1;
    else if (timeframe === '24h') hours = 24;
    
    const fromDate = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return fromDate.toISOString().split('T')[0];
  }

  /**
   * Categorize news article
   */
  private categorizeNews(content: string): NewsItem['category'] {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('regulation') || lowerContent.includes('sec') || lowerContent.includes('government')) {
      return 'regulation';
    } else if (lowerContent.includes('adoption') || lowerContent.includes('institutional')) {
      return 'adoption';
    } else if (lowerContent.includes('defi') || lowerContent.includes('decentralized')) {
      return 'defi';
    } else if (lowerContent.includes('nft')) {
      return 'nft';
    } else if (lowerContent.includes('bitcoin') || lowerContent.includes('btc')) {
      return 'bitcoin';
    } else if (lowerContent.includes('ethereum') || lowerContent.includes('eth')) {
      return 'ethereum';
    }
    
    return 'crypto';
  }

  /**
   * Calculate news relevance score
   */
  private calculateNewsRelevance(article: any, symbol: string): number {
    let relevance = 0.5; // base relevance
    
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    
    // Check for symbol mentions
    if (title.includes(symbol.toLowerCase()) || description.includes(symbol.toLowerCase())) {
      relevance += 0.3;
    }
    
    // Check for crypto-related terms
    const cryptoTerms = ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi'];
    cryptoTerms.forEach(term => {
      if (title.includes(term) || description.includes(term)) {
        relevance += 0.1;
      }
    });
    
    return Math.min(1, relevance);
  } 
 /**
   * Simulate crypto news collection (placeholder for real API integration)
   */
  private async simulateCryptoNewsCollection(symbol: string, timeframe: string): Promise<NewsItem[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return [
      {
        title: `${symbol} Technical Analysis: Key Support Levels Hold Strong`,
        description: `Market analysis shows ${symbol} maintaining crucial support levels with potential for upward momentum.`,
        source: 'CryptoAnalytics',
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/crypto-news-1',
        category: 'crypto',
        relevanceScore: 0.85
      },
      {
        title: 'Institutional Interest in Cryptocurrency Markets Grows',
        description: 'Major financial institutions continue to show increased interest in cryptocurrency investments.',
        source: 'CryptoInstitutional',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/crypto-news-2',
        category: 'adoption',
        relevanceScore: 0.75
      }
    ];
  }

  /**
   * Simulate Reddit news collection
   */
  private async simulateRedditNewsCollection(symbol: string, timeframe: string): Promise<NewsItem[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return [
      {
        title: `r/CryptoCurrency: ${symbol} Discussion Thread - Bullish Sentiment`,
        description: `Community discussion shows positive sentiment around ${symbol} with strong technical indicators.`,
        source: 'Reddit',
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        url: 'https://reddit.com/r/cryptocurrency',
        category: 'general',
        relevanceScore: 0.7
      }
    ];
  }

  /**
   * Simulate Twitter data collection
   */
  private async simulateTwitterCollection(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return [
      {
        platform: 'twitter',
        content: `${symbol} breaking above key resistance! 📈 Volume is picking up and momentum looks strong. Could be the start of a major move. #crypto #bullish`,
        author: 'CryptoTraderPro',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        engagement: { likes: 342, shares: 89, comments: 56 },
        influencerScore: 0.8,
        relevanceScore: 0.9
      },
      {
        platform: 'twitter',
        content: `Market sentiment shifting positive for ${symbol}. Seeing increased whale activity and accumulation patterns. 🐋💎`,
        author: 'WhaleWatcher',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        engagement: { likes: 198, shares: 45, comments: 23 },
        influencerScore: 0.7,
        relevanceScore: 0.85
      }
    ];
  }

  /**
   * Simulate Reddit data collection
   */
  private async simulateRedditCollection(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    return [
      {
        platform: 'reddit',
        content: `${symbol} TA Update: We're seeing a beautiful cup and handle formation on the 4H chart. If we can break above $45k with volume, next target is $50k. Diamond hands! 💎🙌`,
        author: 'TechnicalAnalyst99',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 234, shares: 67, comments: 89 },
        influencerScore: 0.6,
        relevanceScore: 0.8
      },
      {
        platform: 'reddit',
        content: `Fundamental analysis on ${symbol}: Strong network growth, increasing adoption, and positive regulatory developments. Long-term outlook remains bullish despite short-term volatility.`,
        author: 'FundamentalCrypto',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 156, shares: 34, comments: 67 },
        influencerScore: 0.65,
        relevanceScore: 0.75
      }
    ];
  }

  /**
   * Simulate Telegram data collection
   */
  private async simulateTelegramCollection(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    await new Promise(resolve => setTimeout(resolve, 160));
    
    return [
      {
        platform: 'telegram',
        content: `${symbol} update: Market structure looking healthy. We've held key support and now testing resistance. Good risk/reward setup for longs here. 🎯`,
        author: 'TradingSignals',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 89, shares: 23, comments: 45 },
        influencerScore: 0.75,
        relevanceScore: 0.8
      }
    ];
  }

  /**
   * Simulate Discord data collection
   */
  private async simulateDiscordCollection(symbol: string, timeframe: string): Promise<SocialMediaPost[]> {
    await new Promise(resolve => setTimeout(resolve, 140));
    
    return [
      {
        platform: 'discord',
        content: `Just saw some interesting ${symbol} on-chain data. Large wallets have been accumulating over the past week. Could be setting up for a move 👀`,
        author: 'OnChainAnalyst',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 67, shares: 12, comments: 34 },
        influencerScore: 0.6,
        relevanceScore: 0.7
      }
    ];
  }

  /**
   * Get mock news data for testing
   */
  private getMockNewsData(symbol: string, timeframe: string): NewsItem[] {
    const mockNews: NewsItem[] = [
      {
        title: `${symbol} Shows Strong Technical Breakout Above Key Resistance`,
        description: `Technical analysis indicates ${symbol} has broken above critical resistance levels with strong volume confirmation.`,
        source: 'CoinDesk',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/news1',
        category: 'crypto',
        relevanceScore: 0.9
      },
      {
        title: 'Major Institution Announces Crypto Investment Strategy',
        description: 'Leading financial institution reveals plans to allocate significant portion of portfolio to cryptocurrency assets.',
        source: 'Bloomberg',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/news2',
        category: 'adoption',
        relevanceScore: 0.8
      },
      {
        title: 'Regulatory Clarity Brings Positive Sentiment to Crypto Markets',
        description: 'New regulatory framework provides much-needed clarity for cryptocurrency operations and trading.',
        source: 'CoinTelegraph',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/news3',
        category: 'regulation',
        relevanceScore: 0.7
      },
      {
        title: `${symbol} Network Upgrade Brings Enhanced Scalability`,
        description: `Latest network upgrade for ${symbol} introduces significant improvements in transaction throughput and efficiency.`,
        source: 'CryptoNews',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        url: 'https://example.com/news4',
        category: 'crypto',
        relevanceScore: 0.85
      }
    ];
    
    return mockNews;
  }

  /**
   * Get mock social media data for testing
   */
  private getMockSocialMediaData(symbol: string, timeframe: string): SocialMediaPost[] {
    const mockPosts: SocialMediaPost[] = [
      {
        platform: 'twitter',
        content: `${symbol} looking bullish! Just broke above the 200 EMA with strong volume. This could be the start of a major move up! 🚀 #crypto #bullish`,
        author: 'CryptoTrader123',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 245, shares: 67, comments: 34 },
        influencerScore: 0.7,
        relevanceScore: 0.9
      },
      {
        platform: 'reddit',
        content: `Technical analysis on ${symbol}: We're seeing a clear cup and handle pattern forming. If we can hold above current support, next target is $50k. Diamond hands! 💎🙌`,
        author: 'DiamondHandsHODLer',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 156, shares: 23, comments: 45 },
        influencerScore: 0.6,
        relevanceScore: 0.8
      },
      {
        platform: 'telegram',
        content: `Market looking uncertain right now. Lots of FUD in the news but fundamentals remain strong. Good time to DCA if you believe in the long term vision.`,
        author: 'CryptoAnalyst',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 89, shares: 12, comments: 28 },
        influencerScore: 0.8,
        relevanceScore: 0.7
      },
      {
        platform: 'twitter',
        content: `${symbol} whale alert! 🐋 Large transaction detected: 1,000 ${symbol} moved to unknown wallet. Could be institutional accumulation or exchange deposit. Watch the charts! 📊`,
        author: 'WhaleAlerts',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 567, shares: 123, comments: 89 },
        influencerScore: 0.9,
        relevanceScore: 0.95
      },
      {
        platform: 'discord',
        content: `${symbol} on-chain metrics looking strong. Network activity up 15% this week, active addresses growing. Bullish fundamentals despite price consolidation.`,
        author: 'OnChainMetrics',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        engagement: { likes: 78, shares: 19, comments: 34 },
        influencerScore: 0.65,
        relevanceScore: 0.8
      }
    ];
    
    return mockPosts;
  }

  /**
   * Get fallback sentiment for errors
   */
  private getFallbackSentiment(symbol: string, timeframe: string): MarketSentiment {
    return {
      overall: {
        score: 0,
        confidence: 0.5,
        magnitude: 0,
        reasoning: 'Fallback sentiment due to analysis error',
        keywords: [],
        category: 'NEUTRAL'
      },
      news: {
        sentiment: {
          score: 0,
          confidence: 0.5,
          magnitude: 0,
          reasoning: 'No news data available',
          keywords: [],
          category: 'NEUTRAL'
        },
        articles: [],
        timeframe: timeframe as '1h' | '4h' | '24h'
      },
      social: {
        sentiment: {
          score: 0,
          confidence: 0.5,
          magnitude: 0,
          reasoning: 'No social media data available',
          keywords: [],
          category: 'NEUTRAL'
        },
        posts: [],
        platforms: {
          twitter: { score: 0, confidence: 0.5, magnitude: 0, reasoning: 'No Twitter data', keywords: [], category: 'NEUTRAL' },
          reddit: { score: 0, confidence: 0.5, magnitude: 0, reasoning: 'No Reddit data', keywords: [], category: 'NEUTRAL' },
          telegram: { score: 0, confidence: 0.5, magnitude: 0, reasoning: 'No Telegram data', keywords: [], category: 'NEUTRAL' }
        }
      },
      trends: {
        shortTerm: 'NEUTRAL',
        mediumTerm: 'NEUTRAL',
        longTerm: 'NEUTRAL'
      },
      signals: {
        strength: 'WEAK',
        direction: 'NEUTRAL',
        confidence: 0.5,
        tradingImpact: 'LOW'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        symbol,
        dataPoints: 0,
        processingTime: 0
      }
    };
  }
}