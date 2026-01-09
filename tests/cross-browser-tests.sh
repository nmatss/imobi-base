#!/bin/bash

# Cross-Browser Testing Script
# Runs all cross-browser compatibility tests

set -e

echo "======================================"
echo "CROSS-BROWSER COMPATIBILITY TESTS"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ $2${NC}"
  else
    echo -e "${RED}✗ $2${NC}"
  fi
}

# Check if server is running
echo "Checking if development server is running..."
if ! curl -s http://localhost:5000 > /dev/null; then
  echo -e "${YELLOW}⚠ Development server not running. Starting server...${NC}"
  npm run dev &
  SERVER_PID=$!
  sleep 10
else
  echo -e "${GREEN}✓ Development server is running${NC}"
  SERVER_PID=""
fi

echo ""
echo "Running test suites..."
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test suite
run_test_suite() {
  SUITE_NAME=$1
  COMMAND=$2

  echo "----------------------------------------"
  echo "Running: $SUITE_NAME"
  echo "----------------------------------------"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  if eval $COMMAND; then
    print_status 0 "$SUITE_NAME"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    print_status 1 "$SUITE_NAME"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    return 1
  fi
}

# Run responsive tests
run_test_suite "Responsive Breakpoint Tests" \
  "npx playwright test tests/responsive/breakpoints.spec.ts --reporter=list"

# Run CSS compatibility tests
run_test_suite "CSS Compatibility Tests" \
  "npx playwright test tests/visual/css-compat.spec.ts --reporter=list"

# Run mobile touch tests
run_test_suite "Mobile Touch Events Tests" \
  "npx playwright test tests/mobile/touch-events.spec.ts --reporter=list"

# Run orientation tests
run_test_suite "Orientation Tests" \
  "npx playwright test tests/mobile/orientation.spec.ts --reporter=list"

# Run visual regression tests (limited to avoid too many screenshots)
run_test_suite "Visual Regression Tests (Sample)" \
  "npx playwright test tests/visual/visual-regression.spec.ts --grep 'Dashboard appearance' --reporter=list"

# Run mobile performance tests (limited)
run_test_suite "Mobile Performance Tests (Sample)" \
  "npx playwright test tests/performance/mobile-performance.spec.ts --grep 'Page load time' --reporter=list"

echo ""
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo "Total test suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

# Generate HTML report
echo "Generating HTML report..."
npx playwright show-report

# Cleanup
if [ -n "$SERVER_PID" ]; then
  echo "Stopping development server..."
  kill $SERVER_PID
fi

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
  exit 1
else
  exit 0
fi
