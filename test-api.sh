#!/bin/bash

###############################################################################
# SAP MVP Framework - API Test Script
# Description: Tests all API endpoints
###############################################################################

API_URL="${API_URL:-http://localhost:3001}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

separator() {
    echo "=============================================================================="
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4

    echo -e "\n${BLUE}Testing:${NC} $description"
    echo -e "${YELLOW}$method $API_URL$endpoint${NC}"

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ Success ($http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed ($http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
}

main() {
    clear
    separator
    echo -e "${BLUE}SAP MVP Framework - API Tests${NC}"
    separator

    # Wait for API to be ready
    echo -e "\n${YELLOW}Waiting for API to be ready...${NC}"
    for i in {1..30}; do
        if curl -s "$API_URL/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API is ready${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done

    separator
    echo -e "${BLUE}PUBLIC ENDPOINTS (No Auth)${NC}"
    separator

    test_endpoint "GET" "/api/health" "Health Check"
    test_endpoint "GET" "/api/version" "Version Info"

    separator
    echo -e "${BLUE}ADMIN ENDPOINTS${NC}"
    separator

    test_endpoint "GET" "/api/admin/tenants" "List All Tenants"

    test_endpoint "POST" "/api/admin/tenants" "Create Tenant" '{
        "tenantId": "test-tenant-001",
        "companyName": "Test Company",
        "sapConfig": {
            "baseUrl": "https://sap-test.com",
            "clientId": "test-client"
        }
    }'

    test_endpoint "GET" "/api/admin/tenants/test-tenant-001" "Get Tenant Details"

    separator
    echo -e "${BLUE}SOD ANALYSIS ENDPOINTS${NC}"
    separator

    test_endpoint "POST" "/api/modules/sod/analyze" "Run SoD Analysis" '{
        "tenantId": "test-tenant-001",
        "fromDate": "2025-01-01",
        "toDate": "2025-12-31"
    }'

    test_endpoint "GET" "/api/modules/sod" "List SoD Analyses"

    separator
    echo -e "${BLUE}MONITORING ENDPOINTS${NC}"
    separator

    test_endpoint "GET" "/api/monitoring/health" "System Health"
    test_endpoint "GET" "/api/monitoring/metrics" "System Metrics"

    separator
    echo -e "${BLUE}ANALYTICS ENDPOINTS${NC}"
    separator

    test_endpoint "GET" "/api/analytics/usage" "Usage Statistics"
    test_endpoint "GET" "/api/dashboard/summary" "Dashboard Summary"

    separator
    echo -e "${GREEN}All tests completed!${NC}"
    separator
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: 'jq' is not installed. Output will not be formatted.${NC}"
    echo "Install jq: apt-get install jq (Ubuntu) or brew install jq (Mac)"
    echo ""
fi

main
