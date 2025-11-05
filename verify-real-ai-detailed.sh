#!/bin/bash

echo "🔍 DETAILED VERIFICATION: REAL NEBIUS AI vs MOCKUP"
echo "================================================="

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

# Test 1: Check Nebius AI connection status
echo ""
print_status "Test 1: Nebius AI Connection Status"
echo "===================================="

connection_test=$(curl -s http://localhost:3000/api/ai/nebius)
echo "$connection_test" | jq '{
    success: .success,
    connected: .data.connected,
    status: .data.status,
    model: .data.model,
    provider: .data.provider
}'

is_connected=$(echo "$connection_test" | jq -r '.data.connected // false')
if [[ "$is_connected" == "true" ]]; then
    print_success "✅ Nebius AI is connected"
else
    print_error "❌ Nebius AI connection failed"
fi

echo ""
echo "===================================="

# Test 2: Test real AI analysis with specific symbol
echo ""
print_status "Test 2: Real AI Analysis Test"
echo "============================="

analysis_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{
        "symbol": "BTCUSDT",
        "testType": "analysis"
    }')

if [[ $analysis_test == *"success"* ]]; then
    print_success "✅ AI Analysis test successful"
    echo "$analysis_test" | jq '{
        success: .success,
        symbol: .data.symbol,
        analysis: {
            action: .data.analysis.action,
            confidence: (.data.analysis.confidence * 100 | floor),
            modelUsed: .data.analysis.modelUsed,
            hasReasoning: (.data.analysis.reasoning != null),
            hasTechnicalIndicators: (.data.analysis.technicalIndicators != null)
        }
    }'
else
    print_error "❌ AI Analysis test failed"
    echo "$analysis_test"
fi

echo ""
echo "===================================="

# Test 3: Test market sentiment analysis
echo ""
print_status "Test 3: Market Sentiment Analysis Test"
echo "====================================="

sentiment_test=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
    -H "Content-Type: application/json" \
    -d '{
        "testType": "sentiment"
    }')

if [[ $sentiment_test == *"success"* ]]; then
    print_success "✅ Market Sentiment test successful"
    sentiment=$(echo "$sentiment_test" | jq -r '.data.sentiment // "No sentiment"')
    echo "Market Sentiment: \"$sentiment\""
    
    if [[ ${#sentiment} -gt 50 ]]; then
        print_success "✅ Detailed sentiment analysis (AI-generated)"
    else
        print_warning "⚠️  Short sentiment response"
    fi
else
    print_error "❌ Market Sentiment test failed"
    echo "$sentiment_test"
fi

echo ""
echo "===================================="

# Test 4: Check current live analysis for real AI patterns
echo ""
print_status "Test 4: Live Analysis Verification"
echo "================================="

live_analysis=$(curl -s http://localhost:3000/api/ai/analysis)

if [[ $live_analysis == *"success"* ]]; then
    print_success "✅ Live analysis data available"
    
    # Check Nebius AI status
    nebius_status=$(echo "$live_analysis" | jq -r '.data.nebiusAIStatus // "Unknown"')
    echo "Nebius AI Status: $nebius_status"
    
    # Check if we have real analysis data
    total_analyzed=$(echo "$live_analysis" | jq -r '.data.totalAnalyzed // 0')
    echo "Total Symbols Analyzed: $total_analyzed"
    
    # Check best opportunity
    best_symbol=$(echo "$live_analysis" | jq -r '.data.bestOpportunity.symbol // "None"')
    best_confidence=$(echo "$live_analysis" | jq -r '.data.bestOpportunity.confidence // 0')
    best_reasoning=$(echo "$live_analysis" | jq -r '.data.bestOpportunity.reasoning // "No reasoning"')
    
    echo "Best Opportunity: $best_symbol ($(echo "$best_confidence * 100" | bc -l | cut -d. -f1)% confidence)"
    echo "Reasoning Length: ${#best_reasoning} characters"
    
    if [[ ${#best_reasoning} -gt 100 ]]; then
        print_success "✅ Detailed AI reasoning found"
    else
        print_warning "⚠️  Short or missing reasoning"
    fi
    
else
    print_error "❌ Live analysis not available"
fi

echo ""
echo "===================================="

# Test 5: Check for real-time token usage in logs
echo ""
print_status "Test 5: Real-time Token Usage Verification"
echo "=========================================="

print_status "Triggering fresh AI analysis..."
trigger_result=$(curl -s -X POST http://localhost:3000/api/ai/analysis)

if [[ $trigger_result == *"success"* ]]; then
    print_success "✅ Fresh analysis triggered"
    
    # Wait a moment for processing
    sleep 5
    
    # Check logs for token usage
    print_status "Checking logs for token usage..."
    recent_tokens=$(docker logs live-trading-bot --tail 20 | grep -E "(token|usage|\$0\.|💰)" | tail -3)
    
    if [[ -n "$recent_tokens" ]]; then
        print_success "✅ Recent token usage found:"
        echo "$recent_tokens"
    else
        print_warning "⚠️  No recent token usage in logs"
    fi
else
    print_error "❌ Failed to trigger fresh analysis"
fi

echo ""
echo "===================================="

# Test 6: Compare multiple analysis calls for variation
echo ""
print_status "Test 6: AI Response Variation Test"
echo "================================="

print_status "Making multiple analysis calls to check for variation..."

declare -a confidences
declare -a actions

for i in {1..3}; do
    analysis=$(curl -s -X POST http://localhost:3000/api/ai/nebius \
        -H "Content-Type: application/json" \
        -d "{
            \"symbol\": \"ETHUSDT\",
            \"testType\": \"analysis\"
        }")
    
    if [[ $analysis == *"success"* ]]; then
        confidence=$(echo "$analysis" | jq -r '.data.analysis.confidence // 0')
        action=$(echo "$analysis" | jq -r '.data.analysis.action // "UNKNOWN"')
        
        confidences[$i]=$confidence
        actions[$i]=$action
        
        echo "Call $i: $action ($(echo "$confidence * 100" | bc -l | cut -d. -f1)% confidence)"
    else
        echo "Call $i: Failed"
    fi
    
    sleep 3
done

# Check for variation
unique_confidences=$(printf '%s\n' "${confidences[@]}" | sort -u | wc -l)
unique_actions=$(printf '%s\n' "${actions[@]}" | sort -u | wc -l)

if [[ $unique_confidences -gt 1 ]] || [[ $unique_actions -gt 1 ]]; then
    print_success "✅ AI responses show variation (indicates real AI)"
else
    print_warning "⚠️  AI responses are identical (possible caching/mockup)"
fi

echo ""
echo "===================================="

# Test 7: Check environment and configuration
echo ""
print_status "Test 7: Environment Configuration Check"
echo "======================================"

# Check if Nebius AI service is properly configured
print_status "Checking Nebius AI service configuration..."

# Test the service directly through the analysis endpoint
config_test=$(curl -s http://localhost:3000/api/ai/analysis)
model_used=$(echo "$config_test" | jq -r '.data.bestOpportunity.modelUsed // "Unknown"')

echo "Model Used: $model_used"

if [[ $model_used == *"Nebius"* ]] && [[ $model_used == *"llama"* ]]; then
    print_success "✅ Nebius AI model attribution found"
else
    print_warning "⚠️  Model attribution unclear"
fi

echo ""
echo "===================================="

# Final comprehensive assessment
echo ""
print_status "COMPREHENSIVE AI VERIFICATION RESULTS"
echo "===================================="

real_ai_score=0
total_tests=7

# Score each test
if [[ "$is_connected" == "true" ]]; then ((real_ai_score++)); fi
if [[ $analysis_test == *"success"* ]]; then ((real_ai_score++)); fi
if [[ $sentiment_test == *"success"* ]]; then ((real_ai_score++)); fi
if [[ ${#best_reasoning} -gt 100 ]]; then ((real_ai_score++)); fi
if [[ -n "$recent_tokens" ]]; then ((real_ai_score++)); fi
if [[ $unique_confidences -gt 1 ]] || [[ $unique_actions -gt 1 ]]; then ((real_ai_score++)); fi
if [[ $model_used == *"Nebius"* ]]; then ((real_ai_score++)); fi

percentage=$((real_ai_score * 100 / total_tests))

echo ""
echo "📊 VERIFICATION SCORE: $real_ai_score/$total_tests ($percentage%)"
echo ""

if [[ $percentage -ge 80 ]]; then
    print_success "🎯 CONCLUSION: REAL NEBIUS AI IS ACTIVELY USED"
    echo "✅ High confidence that the system uses genuine Nebius AI"
    echo "✅ Multiple indicators confirm real API usage"
    echo "✅ Token consumption and model attribution verified"
    echo "✅ AI responses show appropriate variation and depth"
elif [[ $percentage -ge 60 ]]; then
    print_warning "🤔 CONCLUSION: MOSTLY REAL AI WITH SOME CONCERNS"
    echo "⚠️  System appears to use real AI but may have some caching"
    echo "⚠️  Some tests show mixed results"
elif [[ $percentage -ge 40 ]]; then
    print_warning "🔍 CONCLUSION: MIXED REAL AI AND MOCKUP ELEMENTS"
    echo "⚠️  System shows signs of both real AI and static data"
    echo "⚠️  Further investigation needed"
else
    print_error "❌ CONCLUSION: LIKELY USING MOCKUP DATA"
    echo "❌ Low confidence in real AI usage"
    echo "❌ Multiple indicators suggest static/mockup data"
fi

echo ""
echo "===================================="
echo "✅ Detailed AI Verification Complete!"