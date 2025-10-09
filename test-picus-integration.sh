#!/bin/bash

# Test script to verify Picus refresh token configuration

echo "🔧 Testing Picus Integration Configuration"
echo "========================================="

echo ""
echo "1. Testing Backend Endpoint Availability..."
BACKEND_HEALTH=$(curl -s -w "%{http_code}" http://localhost:3001/health -o /dev/null)

if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "✅ Backend is healthy (HTTP $BACKEND_HEALTH)"
else
    echo "❌ Backend unhealthy (HTTP $BACKEND_HEALTH)"
    exit 1
fi

echo ""
echo "2. Testing Picus API Endpoint..."

# Test with valid request structure but dummy credentials
TEST_REQUEST='{
  "provider": "picus",
  "config": {
    "baseUrl": "https://api.picussecurity.com",
    "refreshToken": "test_token_123",
    "enabled": true
  }
}'

echo "Sending test request to /api/test-picus..."
RESPONSE=$(curl -s -X POST \
  http://localhost:3001/api/test-picus \
  -H "Content-Type: application/json" \
  -d "$TEST_REQUEST")

echo ""
echo "Response:"
echo "$RESPONSE" | jq 2>/dev/null || echo "$RESPONSE"

echo ""
echo "3. Checking Frontend Accessibility..."
FRONTEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:5174/ -o /dev/null)

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is accessible (HTTP $FRONTEND_STATUS)"
    echo "🌐 You can access the application at: http://localhost:5174/"
    echo ""
    echo "To test the Picus integration:"
    echo "1. Open http://localhost:5174/ in your browser"
    echo "2. Click the Settings button (gear icon) in the top-right"
    echo "3. Scroll down to 'Picus Security Integration'"
    echo "4. Toggle the enable switch"
    echo "5. Enter your Picus API base URL and refresh token"
    echo "6. Click the 'Test' button to verify connectivity"
else
    echo "❌ Frontend not accessible (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "✅ Test completed!"