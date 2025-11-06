import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedDataCollector } from '@/lib/market-data/enhanced-data-collector';
import { CoinglassClient } from '@/lib/external-apis/coinglass-client';
import { CVDCalculator } from '@/lib/market-data/cvd-calculator';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching enhanced market data...');
    
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    
    // For now, return mock data to ensure API works
    // TODO: Integrate real data sources when external APIs are configured
    const mockData = {
      symbol,
      timestamp: new Date().toISOString(),
      enhancedData: {
        price: 43250.50,
        volume24h: 1250000000,
        change24h: 2.35,
        futuresData: {
          openInterest: 15200000000,
          fundingRate: 0.0085,
          longShortRatio: 2.3
        },
        volumeProfile: {
          trend: 'DECLINING',
          buyVolume: 45,
          sellVolume: 55
        }
      },
      liquidationData: {
        liquidations24h: {
          totalLongs: 450000000,
          totalShorts: 320000000
        }
      },
      fundingRates: {
        rate: 0.0085,
        nextFundingTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      },
      longShortRatio: {
        ratio: 2.3,
        sentiment: 'BEARISH'
      },
      cvdData: {
        currentValue: -125000000,
        trend: [-50000000, -75000000, -100000000, -125000000],
        pressure: 'BEARISH'
      },
      // Market health indicators
      marketHealth: {
        liquidationRisk: 'HIGH',
        fundingRisk: 'MEDIUM',
        sentimentRisk: 'HIGH',
        cvdTrend: 'BEARISH',
        overallRisk: 'HIGH'
      }
    };
    
    return NextResponse.json({
      success: true,
      data: mockData
    });
    
  } catch (error) {
    console.error('❌ Error fetching enhanced data:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch enhanced data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateLiquidationRisk(liquidationData: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (!liquidationData || !liquidationData.liquidations24h) return 'LOW';
  
  const totalLiquidations = liquidationData.liquidations24h.totalLongs + liquidationData.liquidations24h.totalShorts;
  
  if (totalLiquidations > 1000000000) return 'CRITICAL'; // >$1B
  if (totalLiquidations > 500000000) return 'HIGH';      // >$500M
  if (totalLiquidations > 100000000) return 'MEDIUM';    // >$100M
  return 'LOW';
}

function calculateFundingRisk(fundingRate: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (!fundingRate || !fundingRate.rate) return 'LOW';
  
  const rate = Math.abs(fundingRate.rate);
  
  if (rate > 0.01) return 'CRITICAL';  // >1%
  if (rate > 0.005) return 'HIGH';     // >0.5%
  if (rate > 0.002) return 'MEDIUM';   // >0.2%
  return 'LOW';
}

function calculateSentimentRisk(longShortRatio: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (!longShortRatio || !longShortRatio.ratio) return 'LOW';
  
  const ratio = longShortRatio.ratio;
  
  // Extreme ratios indicate high risk
  if (ratio > 4 || ratio < 0.25) return 'CRITICAL';
  if (ratio > 3 || ratio < 0.33) return 'HIGH';
  if (ratio > 2 || ratio < 0.5) return 'MEDIUM';
  return 'LOW';
}

function analyzeCVDTrend(cvdData: any): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (!cvdData || !cvdData.trend) return 'NEUTRAL';
  
  const recentTrend = cvdData.trend.slice(-5); // Last 5 periods
  const positiveCount = recentTrend.filter((t: number) => t > 0).length;
  
  if (positiveCount >= 4) return 'BULLISH';
  if (positiveCount <= 1) return 'BEARISH';
  return 'NEUTRAL';
}

function calculateOverallRisk(marketHealth: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const risks = [
    marketHealth.liquidationRisk,
    marketHealth.fundingRisk,
    marketHealth.sentimentRisk
  ];
  
  const criticalCount = risks.filter(r => r === 'CRITICAL').length;
  const highCount = risks.filter(r => r === 'HIGH').length;
  
  if (criticalCount >= 1) return 'CRITICAL';
  if (highCount >= 2) return 'HIGH';
  if (highCount >= 1) return 'MEDIUM';
  return 'LOW';
}