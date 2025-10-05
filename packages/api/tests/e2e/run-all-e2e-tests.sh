#!/bin/bash

###############################################################################
# SAP MVP Framework - E2E Test Runner
# Runs all end-to-end tests for the API layer
###############################################################################

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         SAP MVP Framework - E2E Test Suite Runner              ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}✗ DATABASE_URL environment variable is not set${NC}"
  echo -e "${YELLOW}  Example: export DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/sapframework\"${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL is set"
echo -e "${CYAN}ℹ${NC} Database: $(echo $DATABASE_URL | sed 's/:\/\/.*:.*@/:\/\/****:****@/')"
echo ""

# Check PostgreSQL connectivity
echo -e "${BLUE}▶${NC} Testing database connectivity..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Database is accessible"
else
  echo -e "${RED}✗ Cannot connect to database${NC}"
  echo -e "${YELLOW}  Please ensure PostgreSQL is running and DATABASE_URL is correct${NC}"
  exit 1
fi
echo ""

# Ensure auth is disabled for E2E tests
export AUTH_ENABLED=false
export NODE_ENV=test

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

# Function to run a test
run_test() {
  local test_name=$1
  local test_file=$2

  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}▶${NC} Running: ${test_name}"
  echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if tsx "$test_file"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
    echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
  else
    FAILED_TESTS=$((FAILED_TESTS + 1))
    FAILED_TEST_NAMES+=("$test_name")
    echo -e "${RED}✗ ${test_name} FAILED${NC}"
  fi

  echo ""
}

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run E2E tests
echo -e "${CYAN}Starting E2E Test Suite...${NC}"
echo ""

run_test "Tenant Onboarding" "$SCRIPT_DIR/tenant-onboarding.e2e.ts"
run_test "Service Discovery" "$SCRIPT_DIR/service-discovery.e2e.ts"

# Also run the core SoD E2E test
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}▶${NC} Running: SoD Analysis (Core Package)"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

TOTAL_TESTS=$((TOTAL_TESTS + 1))

if tsx "$SCRIPT_DIR/../../../../core/tests/e2e/test-sod-e2e.ts"; then
  PASSED_TESTS=$((PASSED_TESTS + 1))
  echo -e "${GREEN}✓ SoD Analysis PASSED${NC}"
else
  FAILED_TESTS=$((FAILED_TESTS + 1))
  FAILED_TEST_NAMES+=("SoD Analysis")
  echo -e "${RED}✗ SoD Analysis FAILED${NC}"
fi

echo ""

# Print final results
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    FINAL TEST RESULTS                          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:  ${TOTAL_TESTS}"
echo -e "Passed:       ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed:       ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All E2E tests passed!${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}✗ ${FAILED_TESTS} test suite(s) failed:${NC}"
  for test_name in "${FAILED_TEST_NAMES[@]}"; do
    echo -e "${RED}  - ${test_name}${NC}"
  done
  echo ""
  exit 1
fi
