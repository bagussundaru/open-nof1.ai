# Machine Learning Services

This directory contains the machine learning components for the trading bot, implementing advanced AI-driven trading strategies.

## Components

### 1. Price Prediction Service (`price-prediction-service.ts`)
- **LSTM Neural Network**: Primary model for price prediction using Long Short-Term Memory networks
- **GRU Model**: Secondary model using Gated Recurrent Units as an alternative to LSTM
- **Linear Regression**: Baseline model for comparison and ensemble weighting
- **Ensemble Method**: Combines multiple models using weighted averaging for improved accuracy
- **Technical Indicators**: Calculates RSI, MACD, Bollinger Bands, SMA, EMA, and volatility
- **Performance Tracking**: Monitors model accuracy and automatically updates ensemble weights

### 2. Pattern Recognition Service (`pattern-recognition-service.ts`)
- **Candlestick Patterns**: Detects 10+ patterns including Doji, Hammer, Engulfing, Harami, Morning/Evening Star
- **Support/Resistance Detection**: Identifies key price levels using pivot point analysis
- **Trend Reversal Signals**: Combines patterns with technical levels for reversal identification
- **Pattern Reliability Scoring**: Each pattern includes confidence and strength metrics
- **Volume Confirmation**: Incorporates volume analysis for pattern validation

### 3. Adaptive Learning Service (`adaptive-learning-service.ts`)
- **Performance Monitoring**: Tracks model accuracy, precision, recall, and Sharpe ratio
- **Model Drift Detection**: Identifies when models need retraining due to changing market conditions
- **Real-time Adaptation**: Adjusts model parameters based on recent performance
- **Strategy Optimization**: Uses Bayesian optimization for parameter tuning
- **Feedback Loops**: Continuous learning from trading results
- **Retraining Triggers**: Automatic model updates when performance degrades

### 4. ML Integration Service (`ml-integration-service.ts`)
- **Orchestration**: Coordinates all ML components for comprehensive analysis
- **Ensemble Analysis**: Combines predictions, patterns, and levels into unified recommendations
- **Caching**: Optimizes performance with intelligent result caching
- **Performance Monitoring**: Tracks system-wide ML metrics and health
- **Error Handling**: Robust error management and graceful degradation

## Key Features

### Advanced Algorithms
- **LSTM/GRU Networks**: Deep learning models for time series prediction
- **Ensemble Methods**: Multiple model combination for improved accuracy
- **Bayesian Optimization**: Intelligent parameter tuning
- **Technical Analysis**: Comprehensive pattern and indicator analysis

### Real-time Adaptation
- **Model Drift Detection**: Identifies when market conditions change
- **Performance Feedback**: Continuous learning from trading results
- **Parameter Optimization**: Automatic strategy improvement
- **Retraining Automation**: Scheduled and triggered model updates

### Risk Management Integration
- **Confidence Scoring**: All predictions include confidence levels
- **Pattern Reliability**: Historical success rates for each pattern
- **Ensemble Weighting**: Dynamic model weights based on performance
- **Graceful Degradation**: Fallback mechanisms for model failures

## Usage Example

```typescript
import { MLIntegrationService } from './ml-integration-service';

const mlService = new MLIntegrationService();

// Analyze a trading symbol
const analysis = await mlService.analyzeSymbol('BTCUSDT', historicalData);

console.log(`Recommendation: ${analysis.recommendation}`);
console.log(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
console.log(`Reasoning: ${analysis.reasoning.join(', ')}`);

// Update model performance with actual results
await mlService.updateModelPerformance(
  'BTCUSDT',
  predictedPrice,
  actualPrice,
  timestamp
);

// Get comprehensive metrics
const metrics = mlService.getMLMetrics();
```

## Performance Metrics

The ML system tracks multiple performance indicators:

- **Accuracy**: Percentage of correct predictions
- **Sharpe Ratio**: Risk-adjusted returns
- **Model Drift**: Changes in prediction patterns
- **Confidence Levels**: Prediction certainty scores
- **Pattern Success Rates**: Historical pattern reliability

## Testing

Run the ML integration tests:

```bash
npm test lib/trading-bot/services/ml/__tests__/ml-integration.test.ts
```

## Configuration

The ML services are configured with sensible defaults but can be customized:

- **Lookback Periods**: 60 periods for LSTM input
- **Prediction Horizons**: 1h, 4h, 1d forecasts
- **Retraining Thresholds**: 15% performance drop triggers retraining
- **Cache Timeout**: 1 minute for analysis results
- **Ensemble Weights**: Dynamic based on model performance

## Integration

The ML services integrate seamlessly with:

- **Trading Engine**: Provides AI-driven trading signals
- **Risk Management**: Supplies confidence-weighted recommendations
- **Market Data**: Processes real-time price and volume data
- **Monitoring**: Reports performance and health metrics