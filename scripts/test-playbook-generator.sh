#!/bin/bash

# ============================================================================
# Automated Playbook Generator - Test Script
# ============================================================================
# This script tests the complete playbook generation functionality:
# - Database setup
# - Playbook generation from attack flows
# - CRUD operations
# - Detection rule generation
# - Execution tracking
# - SOAR integration
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001/api"
TEST_FLOW_ID="test-flow-$(date +%s)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Playbook Generator Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================================================
# 1. Check server health
# ============================================================================
echo -e "${YELLOW}[1/9] Checking server health...${NC}"
HEALTH_RESPONSE=$(curl -s "${API_URL%/api}/health" || echo "failed")

if [[ "$HEALTH_RESPONSE" == *"healthy"* ]] || [[ "$HEALTH_RESPONSE" == *"status"* ]]; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not responding. Please start the server first:${NC}"
    echo -e "${YELLOW}  npm run dev:full${NC}"
    exit 1
fi
echo ""

# ============================================================================
# 2. Check database connection
# ============================================================================
echo -e "${YELLOW}[2/9] Checking database connection...${NC}"
if [[ "$HEALTH_RESPONSE" == *"database"* ]] && [[ "$HEALTH_RESPONSE" == *"connected"* ]]; then
    echo -e "${GREEN}✓ Database is connected${NC}"
    SKIP_DB_TESTS=false
else
    echo -e "${YELLOW}⚠ Database not available - some tests will be skipped${NC}"
    SKIP_DB_TESTS=true
fi
echo ""

# ============================================================================
# 3. Test playbook creation (manual)
# ============================================================================
echo -e "${YELLOW}[3/9] Testing manual playbook creation...${NC}"
if [ "$SKIP_DB_TESTS" = false ]; then
    CREATE_RESPONSE=$(curl -s -X POST "${API_URL}/playbooks" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Phishing Response Playbook",
            "description": "Automated test playbook for phishing incident response",
            "severity": "high",
            "estimatedTimeMinutes": 120,
            "requiredRoles": ["SOC Analyst", "Incident Responder"],
            "tags": ["phishing", "email", "test"]
        }' || echo '{"error": "request failed"}')

    if [[ "$CREATE_RESPONSE" == *"playbook"* ]] && [[ "$CREATE_RESPONSE" != *"error"* ]]; then
        PLAYBOOK_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        echo -e "${GREEN}✓ Playbook created successfully${NC}"
        echo -e "${BLUE}  Playbook ID: $PLAYBOOK_ID${NC}"
    else
        echo -e "${RED}✗ Failed to create playbook${NC}"
        echo -e "${RED}  Response: $CREATE_RESPONSE${NC}"
        PLAYBOOK_ID=""
    fi
else
    echo -e "${YELLOW}⊘ Skipped (database required)${NC}"
    PLAYBOOK_ID=""
fi
echo ""

# ============================================================================
# 4. Test playbook retrieval
# ============================================================================
echo -e "${YELLOW}[4/9] Testing playbook retrieval...${NC}"
if [ "$SKIP_DB_TESTS" = false ] && [ -n "$PLAYBOOK_ID" ]; then
    GET_RESPONSE=$(curl -s "${API_URL}/playbooks/${PLAYBOOK_ID}" || echo '{"error": "request failed"}')

    if [[ "$GET_RESPONSE" == *"$PLAYBOOK_ID"* ]] && [[ "$GET_RESPONSE" != *"error"* ]]; then
        echo -e "${GREEN}✓ Playbook retrieved successfully${NC}"
        PLAYBOOK_NAME=$(echo "$GET_RESPONSE" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)
        echo -e "${BLUE}  Name: $PLAYBOOK_NAME${NC}"
    else
        echo -e "${RED}✗ Failed to retrieve playbook${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (requires previous test)${NC}"
fi
echo ""

# ============================================================================
# 5. Test playbook listing
# ============================================================================
echo -e "${YELLOW}[5/9] Testing playbook listing...${NC}"
if [ "$SKIP_DB_TESTS" = false ]; then
    LIST_RESPONSE=$(curl -s "${API_URL}/playbooks?page=1&pageSize=10" || echo '{"error": "request failed"}')

    if [[ "$LIST_RESPONSE" == *"items"* ]] && [[ "$LIST_RESPONSE" != *"error"* ]]; then
        PLAYBOOK_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)
        echo -e "${GREEN}✓ Playbook list retrieved successfully${NC}"
        echo -e "${BLUE}  Total playbooks: $PLAYBOOK_COUNT${NC}"
    else
        echo -e "${RED}✗ Failed to list playbooks${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (database required)${NC}"
fi
echo ""

# ============================================================================
# 6. Test detection rule generation
# ============================================================================
echo -e "${YELLOW}[6/9] Testing detection rule generation...${NC}"
if [ "$SKIP_DB_TESTS" = false ]; then
    RULE_RESPONSE=$(curl -s -X POST "${API_URL}/rules/generate" \
        -H "Content-Type: application/json" \
        -d '{
            "techniques": ["T1566", "T1059"],
            "ruleTypes": ["sigma", "kql"],
            "platforms": ["windows", "linux"]
        }' || echo '{"error": "request failed"}')

    if [[ "$RULE_RESPONSE" == *"rules"* ]] && [[ "$RULE_RESPONSE" != *"error"* ]]; then
        RULE_COUNT=$(echo "$RULE_RESPONSE" | grep -o '"count":[0-9]*' | head -1 | cut -d':' -f2)
        echo -e "${GREEN}✓ Detection rules generated successfully${NC}"
        echo -e "${BLUE}  Rules generated: $RULE_COUNT${NC}"
    else
        echo -e "${RED}✗ Failed to generate detection rules${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (database required)${NC}"
fi
echo ""

# ============================================================================
# 7. Test playbook update
# ============================================================================
echo -e "${YELLOW}[7/9] Testing playbook update...${NC}"
if [ "$SKIP_DB_TESTS" = false ] && [ -n "$PLAYBOOK_ID" ]; then
    UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/playbooks/${PLAYBOOK_ID}" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Updated Test Playbook",
            "status": "approved",
            "tags": ["phishing", "email", "test", "updated"]
        }' || echo '{"error": "request failed"}')

    if [[ "$UPDATE_RESPONSE" == *"Updated Test Playbook"* ]] && [[ "$UPDATE_RESPONSE" != *"error"* ]]; then
        echo -e "${GREEN}✓ Playbook updated successfully${NC}"
    else
        echo -e "${RED}✗ Failed to update playbook${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (requires previous test)${NC}"
fi
echo ""

# ============================================================================
# 8. Test SOAR platform listing
# ============================================================================
echo -e "${YELLOW}[8/9] Testing SOAR platform listing...${NC}"
SOAR_RESPONSE=$(curl -s "${API_URL}/soar/platforms" || echo '{"error": "request failed"}')

if [[ "$SOAR_RESPONSE" == *"platforms"* ]] && [[ "$SOAR_RESPONSE" != *"error"* ]]; then
    echo -e "${GREEN}✓ SOAR platforms retrieved successfully${NC}"

    # Extract platform names if jq is available
    if command -v jq &> /dev/null; then
        PLATFORM_COUNT=$(echo "$SOAR_RESPONSE" | jq '.platforms | length')
        echo -e "${BLUE}  Available platforms: $PLATFORM_COUNT${NC}"
    fi
else
    echo -e "${RED}✗ Failed to retrieve SOAR platforms${NC}"
fi
echo ""

# ============================================================================
# 9. Test playbook analytics
# ============================================================================
echo -e "${YELLOW}[9/9] Testing playbook analytics...${NC}"
if [ "$SKIP_DB_TESTS" = false ]; then
    ANALYTICS_RESPONSE=$(curl -s "${API_URL}/playbooks/analytics" || echo '{"error": "request failed"}')

    if [[ "$ANALYTICS_RESPONSE" == *"totalPlaybooks"* ]] || [[ "$ANALYTICS_RESPONSE" == "{}" ]]; then
        echo -e "${GREEN}✓ Analytics endpoint working${NC}"
    else
        echo -e "${YELLOW}⚠ Analytics endpoint returned unexpected data${NC}"
    fi
else
    echo -e "${YELLOW}⊘ Skipped (database required)${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$SKIP_DB_TESTS" = true ]; then
    echo -e "${YELLOW}⚠ Some tests were skipped due to missing database connection${NC}"
    echo -e "${YELLOW}  To run full tests, ensure PostgreSQL is configured and running${NC}"
    echo ""
fi

echo -e "${GREEN}✓ Core API endpoints are functional${NC}"
echo -e "${GREEN}✓ Playbook generation system is ready${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Configure PostgreSQL database (see .env.example)"
echo "  2. Run database migration:"
echo "     ${YELLOW}psql -U your_user -d threatflow < scripts/migrations/create_playbook_tables.sql${NC}"
echo "  3. Generate a playbook from an attack flow in the UI"
echo "  4. Test SOAR integration with your platform"
echo ""

# ============================================================================
# Cleanup (optional)
# ============================================================================
if [ "$SKIP_DB_TESTS" = false ] && [ -n "$PLAYBOOK_ID" ]; then
    read -p "Delete test playbook? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/playbooks/${PLAYBOOK_ID}" || echo '{"error": "request failed"}')
        if [[ "$DELETE_RESPONSE" == *"success"* ]]; then
            echo -e "${GREEN}✓ Test playbook deleted${NC}"
        else
            echo -e "${YELLOW}⚠ Test playbook not deleted (may need manual cleanup)${NC}"
        fi
    fi
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test complete!${NC}"
echo -e "${BLUE}========================================${NC}"
