#!/bin/bash

echo "🔍 COMPREHENSIVE DASHBOARD CONTENT CHECK"
echo "======================================="

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

# Wait for system to be ready
sleep 5

# Test 1: Check all API endpoints used by dashboard
echo ""
print_status "Test 1: API Endpoints Verification"
echo "=================================="

declare -a endpoints=(
    "/api/health"
    "/api/pricing" 
    "/api/trading/balance"
    "/api/trading/engine"
    "/api/ai/analysis"
    "/api/news"
    "/api/trading/executor"
)

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint")
    if [ "$response" = "200" ]; then
        print_success "✅ $endpoint - OK"
    else
        print_error "❌ $endpoint - HTTP $response"
    fi
done

echo ""
echo "=================================="

# Test 2: Check dashboard data consistency
echo ""
print_status "Test 2: Dashboard Data Consistency Check"
echo "======================================"

# Get all dashboard data
health_data=$(curl -s http://localhost:3000/api/health)
pricing_data=$(curl -s http://localhost:3000/api/pricing)
balance_data=$(curl -s http://localhost:3000/api/trading/balance)
engine_data=$(curl -s http://localhost:3000/api/trading/engine)
ai_data=$(curl -s http://localhost:3000/api/ai/analysis)
news_data=$(curl -s http://localhost:3000/api/news)
executor_data=$(curl -s http://localhost:3000/api/trading/executor)

# Check each data source
echo "Health API:"
if [[ $health_data == *"success"* ]]; then
    health_status=$(echo "$health_data" | jq -r '.status // "unknown"')
    print_success "✅ Health: $health_status"
else
    print_error "❌ Health API failed"
fi

echo "Pricing API:"
if [[ $pricing_data == *"success"* ]]; then
    pricing_source=$(echo "$pricing_data" | jq -r '.source // "unknown"')
    pricing_count=$(echo "$pricing_data" | jq -r '.data | keys | length')
    print_success "✅ Pricing: $pricing_count symbols from $pricing_source"
else
    print_error "❌ Pricing API failed"
fi

echo "Balance API:"
if [[ $balance_data == *"success"* ]]; then
    balance_total=$(echo "$balance_data" | jq -r '.data.total // 0')
    balance_source=$(echo "$balance_data" | jq -r '.source // "unknown"')
    print_success "✅ Balance: \$$balance_total from $balance_source"
else
    print_error "❌ Balance API failed"
fi

echo "Trading Engine API:"
if [[ $engine_data == *"success"* ]]; then
    engine_status=$(echo "$engine_data" | jq -r '.data.status // "unknown"')
    engine_trades=$(echo "$engine_data" | jq -r '.data.performance.tradesCount // 0')
    print_success "✅ Engine: $engine_status ($engine_trades trades)"
else
    print_error "❌ Trading Engine API failed"
fi

echo "AI Analysis API:"
if [[ $ai_data == *"success"* ]]; then
    ai_status=$(echo "$ai_data" | jq -r '.data.nebiusAIStatus // "unknown"')
    ai_analyzed=$(echo "$ai_data" | jq -r '.data.totalAnalyzed // 0')
    print_success "✅ AI Analysis: $ai_status ($ai_analyzed symbols)"
else
    print_error "❌ AI Analysis API failed"
fi

echo "News API:"
if [[ $news_data == *"success"* ]]; then
    news_count=$(echo "$news_data" | jq -r '.data.news | length // 0')
    news_source=$(echo "$news_data" | jq -r '.data.source // "unknown"')
    print_success "✅ News: $news_count articles from $news_source"
else
    print_error "❌ News API failed"
fi

echo "Trading Executor API:"
if [[ $executor_data == *"success"* ]]; then
    executor_active=$(echo "$executor_data" | jq -r '.data.isActive // false')
    executor_positions=$(echo "$executor_data" | jq -r '.data.activePositions // 0')
    print_success "✅ Executor: Active=$executor_active, Positions=$executor_positions"
else
    print_error "❌ Trading Executor API failed"
fi

echo ""
echo "=================================="

# Test 3: Check data format consistency
echo ""
print_status "Test 3: Data Format Consistency"
echo "============================="

# Check AI Analysis data structure
print_status "Checking AI Analysis data structure..."
if [[ $ai_data == *"success"* ]]; then
    # Check for required fields
    has_nebius_status=$(echo "$ai_data" | jq 'has("data") and .data | has("nebiusAIStatus")')
    has_best_opportunity=$(echo "$ai_data" | jq '.data | has("bestOpportunity")')
    has_analyses=$(echo "$ai_data" | jq '.data | has("analyses")')
    
    if [[ "$has_nebius_status" == "true" ]]; then
        print_success "✅ Nebius AI status field present"
    else
        print_warning "⚠️  Nebius AI status field missing"
    fi
    
    if [[ "$has_best_opportunity" == "true" ]]; then
        print_success "✅ Best opportunity field present"
    else
        print_warning "⚠️  Best opportunity field missing"
    fi
    
    if [[ "$has_analyses" == "true" ]]; then
        analyses_count=$(echo "$ai_data" | jq -r '.data.analyses | length // 0')
        print_success "✅ Individual analyses present ($analyses_count items)"
    else
        print_warning "⚠️  Individual analyses missing"
    fi
fi

# Check Balance data structure
print_status "Checking Balance data structure..."
if [[ $balance_data == *"success"* ]]; then
    has_total=$(echo "$balance_data" | jq '.data | has("total")')
    has_available=$(echo "$balance_data" | jq '.data | has("available")')
    has_positions=$(echo "$balance_data" | jq '.data | has("positions")')
    
    if [[ "$has_total" == "true" ]]; then
        print_success "✅ Total balance field present"
    else
        print_warning "⚠️  Total balance field missing"
    fi
    
    if [[ "$has_available" == "true" ]]; then
        print_success "✅ Available balance field present"
    else
        print_warning "⚠️  Available balance field missing"
    fi
    
    if [[ "$has_positions" == "true" ]]; then
        positions_count=$(echo "$balance_data" | jq -r '.data.positions | length // 0')
        print_success "✅ Positions array present ($positions_count items)"
    else
        print_warning "⚠️  Positions array missing"
    fi
fi

echo ""
echo "=================================="

# Test 4: Check dashboard UI accessibility
echo ""
print_status "Test 4: Dashboard UI Accessibility"
echo "==============================="

dashboard_html=$(curl -s http://localhost:3000)

# Check for key UI elements
if [[ $dashboard_html == *"Pramilupu Trading AI"* ]]; then
    print_success "✅ Main title 'Pramilupu Trading AI' found"
else
    print_warning "⚠️  Main title not found or different"
fi

if [[ $dashboard_html == *"Nebius AI Market Analysis"* ]]; then
    print_success "✅ AI Analysis section title found"
else
    print_warning "⚠️  AI Analysis section title not found"
fi

if [[ $dashboard_html == *"AI Trading Executor"* ]]; then
    print_success "✅ Trading Executor section found"
else
    print_warning "⚠️  Trading Executor section not found"
fi

if [[ $dashboard_html == *"Live Market Data"* ]]; then
    print_success "✅ Market Data section found"
else
    print_warning "⚠️  Market Data section not found"
fi

if [[ $dashboard_html == *"Market News"* ]]; then
    print_success "✅ News section found"
else
    print_warning "⚠️  News section not found"
fi

echo ""
echo "=================================="

# Test 5: Check for JavaScript errors or loading issues
echo ""
print_status "Test 5: JavaScript and Loading Check"
echo "=================================="

# Check if dashboard is stuck in loading state
if [[ $dashboard_html == *"Initializing AI Trading System"* ]]; then
    print_warning "⚠️  Dashboard appears to be stuck in loading state"
else
    print_success "✅ Dashboard loaded successfully"
fi

# Check for error messages in HTML
if [[ $dashboard_html == *"error"* ]] || [[ $dashboard_html == *"Error"* ]]; then
    print_warning "⚠️  Possible error messages in dashboard HTML"
else
    print_success "✅ No obvious error messages in HTML"
fi

echo ""
echo "=================================="

# Test 6: Check data freshness and timestamps
echo ""
print_status "Test 6: Data Freshness Check"
echo "=========================="

# Check AI analysis timestamp
if [[ $ai_data == *"success"* ]]; then
    ai_timestamp=$(echo "$ai_data" | jq -r '.timestamp // .data.timestamp // "unknown"')
    if [[ "$ai_timestamp" != "unknown" ]]; then
        print_success "✅ AI Analysis has timestamp: $ai_timestamp"
    else
        print_warning "⚠️  AI Analysis missing timestamp"
    fi
fi

# Check balance timestamp
if [[ $balance_data == *"success"* ]]; then
    balance_timestamp=$(echo "$balance_data" | jq -r '.timestamp // "unknown"')
    if [[ "$balance_timestamp" != "unknown" ]]; then
        print_success "✅ Balance has timestamp: $balance_timestamp"
    else
        print_warning "⚠️  Balance missing timestamp"
    fi
fi

echo ""
echo "=================================="

# Test 7: Check for missing or broken features
echo ""
print_status "Test 7: Feature Completeness Check"
echo "==============================="

# Test trading executor controls
executor_start_test=$(curl -s -X POST http://localhost:3000/api/trading/executor \
    -H "Content-Type: application/json" \
    -d '{"action": "start"}')

if [[ $executor_start_test == *"success"* ]]; then
    print_success "✅ Trading executor start function works"
    
    # Stop it immediately
    curl -s -X POST http://localhost:3000/api/trading/executor \
        -H "Content-Type: application/json" \
        -d '{"action": "stop"}' > /dev/null
else
    print_error "❌ Trading executor start function failed"
fi

# Test AI analysis trigger
ai_trigger_test=$(curl -s -X POST http://localhost:3000/api/ai/analysis)
if [[ $ai_trigger_test == *"success"* ]]; then
    print_success "✅ AI analysis trigger function works"
else
    print_error "❌ AI analysis trigger function failed"
fi

echo ""
echo "=================================="

# Test 8: Check for console errors in container
echo ""
print_status "Test 8: Container Error Check"
echo "=========================="

# Check recent container logs for errors
recent_errors=$(docker logs live-trading-bot --tail 50 | grep -i "error\|failed\|exception" | wc -l)
if [ "$recent_errors" -eq 0 ]; then
    print_success "✅ No recent errors in container logs"
else
    print_warning "⚠️  Found $recent_errors recent error(s) in logs"
    docker logs live-trading-bot --tail 20 | grep -i "error\|failed\|exception" | tail -3
fi

echo ""
echo "=================================="

# Final Summary
echo ""
print_status "DASHBOARD HEALTH SUMMARY"
echo "======================="

# Count issues
total_checks=20
issues_found=0

# Simple issue counting based on previous outputs
if ! [[ $health_data == *"success"* ]]; then ((issues_found++)); fi
if ! [[ $pricing_data == *"success"* ]]; then ((issues_found++)); fi
if ! [[ $balance_data == *"success"* ]]; then ((issues_found++)); fi
if ! [[ $engine_data == *"success"* ]]; then ((issues_found++)); fi
if ! [[ $ai_data == *"success"* ]]; then ((issues_found++)); fi
if ! [[ $news_data == *"success"* ]]; then ((issues_found++)); fi
if ! [[ $executor_data == *"success"* ]]; then ((issues_found++)); fi

health_percentage=$(( (total_checks - issues_found) * 100 / total_checks ))

echo ""
echo "📊 DASHBOARD HEALTH SCORE: $health_percentage%"
echo "Issues Found: $issues_found"
echo ""

if [ "$health_percentage" -ge 90 ]; then
    print_success "🎯 EXCELLENT: Dashboard is in excellent condition"
elif [ "$health_percentage" -ge 75 ]; then
    print_success "✅ GOOD: Dashboard is working well with minor issues"
elif [ "$health_percentage" -ge 60 ]; then
    print_warning "⚠️  FAIR: Dashboard has some issues that need attention"
else
    print_error "❌ POOR: Dashboard has significant issues requiring fixes"
fi

echo ""
echo "=================================="
echo "✅ Comprehensive Dashboard Check Complete!"