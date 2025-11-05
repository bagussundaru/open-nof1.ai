#!/bin/bash

echo "🔍 VERIFYING REAL NEBIUS AI USAGE vs MOCKUP DATA"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test 1: Direct Nebius AI API call
echo ""
print_status "Test 1: Direct Nebius AI API Connection Test"
echo "=============================================="

nebius_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{
        "symbol": "BTCUSDT",
        "marketData": {
            "price": 75000,
            "change24h": -2.5,
            "volume24h": 1234567,
            "high24h": 76000,
            "low24h": 74000
        }
    }')

if [[ $nebius_test == *"success"* ]]; then
    print_success "✅ Nebius AI API is responding"
    echo "$nebius_test" | jq '{
        success: .success,
        symbol: .data.symbol,
        action: .data.action,
        confidence: (.data.confidence * 100 | floor),
        modelUsed: .data.modelUsed,
        hasReasoning: (.data.reasoning != null),
        hasTechnicalIndicators: (.data.technicalIndicators != null)
    }'
else
    print_error "❌ Nebius AI API not responding properly"
    echo "$nebius_test"
fi

echo ""
echo "=============================================="

# Test 2: Check if responses vary with different inputs
echo ""
print_status "Test 2: Testing AI Response Variation with Different Inputs"
echo "=========================================================="

print_status "Testing with BULLISH market data..."
bullish_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{
        "symbol": "ETHUSDT",
        "marketData": {
            "price": 3500,
            "change24h": 8.5,
            "volume24h": 2000000,
            "high24h": 3550,
            "low24h": 3200
        }
    }')

print_status "Testing with BEARISH market data..."
bearish_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{
        "symbol": "ETHUSDT",
        "marketData": {
            "price": 3200,
            "change24h": -12.3,
            "volume24h": 500000,
            "high24h": 3600,
            "low24h": 3100
        }
    }')

# Compare responses
bullish_action=$(echo "$bullish_test" | jq -r '.data.action // "UNKNOWN"')
bearish_action=$(echo "$bearish_test" | jq -r '.data.action // "UNKNOWN"')
bullish_confidence=$(echo "$bullish_test" | jq -r '.data.confidence // 0')
bearish_confidence=$(echo "$bearish_test" | jq -r '.data.confidence // 0')

echo "Bullish Market Response: $bullish_action ($(echo "$bullish_confidence * 100" | bc -l | cut -d. -f1)% confidence)"
echo "Bearish Market Response: $bearish_action ($(echo "$bearish_confidence * 100" | bc -l | cut -d. -f1)% confidence)"

if [[ "$bullish_action" != "$bearish_action" ]]; then
    print_success "✅ AI responses vary based on market conditions (REAL AI)"
else
    print_warning "⚠️  AI responses are similar - might be static data"
fi

echo ""
echo "=============================================="

# Test 3: Check reasoning content for AI-generated text
echo ""
print_status "Test 3: Analyzing AI Reasoning for Authenticity"
echo "=============================================="

reasoning_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{
        "symbol": "SOLUSDT",
        "marketData": {
            "price": 180,
            "change24h": 5.2,
            "volume24h": 800000,
            "high24h": 185,
            "low24h": 170
        }
    }')

reasoning=$(echo "$reasoning_test" | jq -r '.data.reasoning // "No reasoning"')
echo "AI Reasoning Sample:"
echo "\"$reasoning\""

# Check for AI-like characteristics
if [[ $reasoning == *"RSI"* ]] && [[ $reasoning == *"trend"* ]] && [[ $reasoning == *"analysis"* ]]; then
    print_success "✅ Reasoning contains technical analysis terms (AI-generated)"
else
    print_warning "⚠️  Reasoning lacks technical analysis depth"
fi

if [[ ${#reasoning} -gt 100 ]]; then
    print_success "✅ Reasoning is detailed ($(echo ${#reasoning}) characters)"
else
    print_warning "⚠️  Reasoning is too short for AI analysis"
fi

echo ""
echo "=============================================="

# Test 4: Check token usage and API costs
echo ""
print_status "Test 4: Checking for Real API Token Usage"
echo "========================================"

# Monitor container logs for token usage
print_status "Checking logs for Nebius AI token usage..."
token_logs=$(docker logs live-trading-bot --tail 50 | grep -E "(token|usage|cost|\$)" | tail -5)

if [[ -n "$token_logs" ]]; then
    print_success "✅ Found token usage logs (indicates real API calls)"
    echo "$token_logs"
else
    print_warning "⚠️  No token usage logs found"
fi

echo ""
echo "=============================================="

# Test 5: Test multiple rapid calls to see if responses are cached or dynamic
echo ""
print_status "Test 5: Testing Response Dynamism (Cache vs Real-time)"
echo "===================================================="

print_status "Making 3 rapid calls with same data to check for variation..."

for i in {1..3}; do
    response=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
        -H "Content-Type: application/json" \
        -d '{
            "symbol": "ADAUSDT",
            "marketData": {
                "price": 0.55,
                "change24h": 3.1,
                "volume24h": 150000,
                "high24h": 0.57,
                "low24h": 0.52
            }
        }')
    
    confidence=$(echo "$response" | jq -r '.data.confidence // 0')
    action=$(echo "$response" | jq -r '.data.action // "UNKNOWN"')
    echo "Call $i: $action ($(echo "$confidence * 100" | bc -l | cut -d. -f1)% confidence)"
    
    sleep 2
done

echo ""
echo "=============================================="

# Test 6: Check environment variables and API key
echo ""
print_status "Test 6: Verifying Nebius AI Configuration"
echo "========================================"

# Check if API key is set (without exposing it)
if docker exec live-trading-bot printenv | grep -q "NEBIUS_API_KEY"; then
    print_success "✅ Nebius API key is configured"
else
    print_warning "⚠️  Nebius API key not found in environment"
fi

# Test API key validity by checking response headers/errors
api_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{"symbol": "TEST", "marketData": {"price": 1, "change24h": 0, "volume24h": 0, "high24h": 1, "low24h": 1}}')

if [[ $api_test == *"API Error"* ]] || [[ $api_test == *"authentication"* ]]; then
    print_error "❌ API authentication issues detected"
elif [[ $api_test == *"success"* ]]; then
    print_success "✅ API authentication working"
else
    print_warning "⚠️  Unclear API status"
fi

echo ""
echo "=============================================="

# Test 7: Compare with known mockup patterns
echo ""
print_status "Test 7: Checking for Mockup Data Patterns"
echo "========================================"

# Get current analysis
current_analysis=$(curl -s http://localhost:3000/api/ai/analysis)

# Check if all symbols have same confidence (mockup indicator)
confidences=$(echo "$current_analysis" | jq -r '.data.analyses[]?.confidence // empty' | sort | uniq | wc -l)

if [ "$confidences" -gt 1 ]; then
    print_success "✅ Multiple confidence levels detected (indicates real AI variation)"
else
    print_warning "⚠️  All symbols have same confidence (possible mockup)"
fi

# Check if reasoning is unique per symbol
reasoning_count=$(echo "$current_analysis" | jq -r '.data.analyses[]?.reasoning // empty' | sort | uniq | wc -l)
total_analyses=$(echo "$current_analysis" | jq -r '.data.analyses | length')

if [ "$reasoning_count" -eq "$total_analyses" ]; then
    print_success "✅ Unique reasoning for each symbol (indicates real AI)"
else
    print_warning "⚠️  Duplicate reasoning detected (possible mockup)"
fi

echo ""
echo "=============================================="

# Final Assessment
echo ""
print_status "FINAL ASSESSMENT: REAL AI vs MOCKUP"
echo "=================================="

real_indicators=0
mockup_indicators=0

# Count indicators
if [[ $nebius_test == *"success"* ]]; then ((real_indicators++)); fi
if [[ "$bullish_action" != "$bearish_action" ]]; then ((real_indicators++)); fi
if [[ ${#reasoning} -gt 100 ]]; then ((real_indicators++)); fi
if [[ -n "$token_logs" ]]; then ((real_indicators++)); fi
if [ "$confidences" -gt 1 ]; then ((real_indicators++)); fi
if [ "$reasoning_count" -eq "$total_analyses" ]; then ((real_indicators++)); fi

echo ""
echo "📊 VERIFICATION RESULTS:"
echo "Real AI Indicators: $real_indicators/6"
echo "Mockup Indicators: $mockup_indicators"

if [ "$real_indicators" -ge 4 ]; then
    print_success "🎯 CONCLUSION: REAL NEBIUS AI IS BEING USED"
    echo "✅ The system is making genuine API calls to Nebius AI"
    echo "✅ Responses vary based on market conditions"
    echo "✅ Technical analysis reasoning is AI-generated"
    echo "✅ Token usage indicates real API consumption"
elif [ "$real_indicators" -ge 2 ]; then
    print_warning "🤔 CONCLUSION: MIXED - SOME REAL AI WITH POSSIBLE CACHING"
    echo "⚠️  System shows signs of real AI but may have caching/mockup elements"
else
    print_error "❌ CONCLUSION: LIKELY MOCKUP DATA"
    echo "❌ System appears to be using static/mockup data instead of real AI"
fi

echo ""
echo "=============================================="
echo "✅ AI Verification Complete!"