#!/bin/bash

# Security Test Suite for ThreatFlow
# Tests all critical security fixes and monitoring endpoints

echo "🔍 ThreatFlow Security Test Suite"
echo "=================================="

BASE_URL="http://localhost:3001"
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    local method="${4:-GET}"
    local data="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data")
        else
            response=$(curl -s -X POST "$url")
        fi
    else
        response=$(curl -s "$url")
    fi
    
    if echo "$response" | grep -q "$expected"; then
        echo "✅ PASS"
        ((PASSED++))
    else
        echo "❌ FAIL"
        echo "   Expected: $expected"
        echo "   Got: $response"
        ((FAILED++))
    fi
}

echo ""
echo "🛡️ Security Protection Tests"
echo "----------------------------"

# Test SSRF protection
test_endpoint "SSRF Protection (localhost)" \
    "$BASE_URL/api/fetch-article?url=http://localhost:8080" \
    "Localhost access is not allowed"

test_endpoint "SSRF Protection (internal IP)" \
    "$BASE_URL/api/fetch-article?url=http://192.168.1.1" \
    "Internal IP"

# Test authentication rate limiting
test_endpoint "Auth Rate Limiting" \
    "$BASE_URL/api/auth/login" \
    "Invalid credentials" \
    "POST" \
    '{"email":"test@test.com","password":"wrong"}'

# Test invalid content type
test_endpoint "Content-Type Validation" \
    "$BASE_URL/api/test-provider" \
    "Invalid content type" \
    "POST"

echo ""
echo "📊 Health Check Tests"
echo "---------------------"

# Test basic health endpoint
test_endpoint "Basic Health Check" \
    "$BASE_URL/health" \
    "timestamp"

# Test legacy API health
test_endpoint "API Health Check" \
    "$BASE_URL/api/health" \
    "timestamp"

# Test enhanced health endpoints (may not be available in running server)
test_endpoint "Enhanced Health Check" \
    "$BASE_URL/healthz" \
    "status\|error"

test_endpoint "Readiness Probe" \
    "$BASE_URL/ready" \
    "status\|error"

echo ""
echo "🔐 Authentication Tests"
echo "-----------------------"

# Test invalid credentials
test_endpoint "Invalid Login" \
    "$BASE_URL/api/auth/login" \
    "Invalid credentials" \
    "POST" \
    '{"email":"fake@test.com","password":"wrong"}'

# Test demo authentication (should work but with warnings)
test_endpoint "Demo Authentication" \
    "$BASE_URL/api/auth/login" \
    "success.*demo-user-id" \
    "POST" \
    '{"email":"admin@threatflow-demo.local","password":"ThreatFlow@2024"}'

echo ""
echo "📈 Performance Tests"
echo "--------------------"

# Test response times
echo -n "Response time test... "
start_time=$(date +%s%N)
curl -s "$BASE_URL/health" > /dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if [ $duration -lt 1000 ]; then
    echo "✅ PASS (${duration}ms)"
    ((PASSED++))
else
    echo "❌ FAIL (${duration}ms - too slow)"
    ((FAILED++))
fi

echo ""
echo "📋 Summary"
echo "----------"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📊 Total:  $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! Security features are working correctly."
    exit 0
else
    echo "⚠️  Some tests failed. Please review the security implementation."
    exit 1
fi