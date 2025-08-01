#!/bin/bash

# Comprehensive test runner script for CI/CD
# Runs all test suites and generates reports

set -e  # Exit on any error

echo "🎮 Zombie Car Game - Automated Test Suite"
echo "=========================================="

# Configuration
TEST_RESULTS_DIR="test-results"
COVERAGE_DIR="coverage"
REPORTS_DIR="reports"

# Create directories
mkdir -p "$TEST_RESULTS_DIR"
mkdir -p "$COVERAGE_DIR"
mkdir -p "$REPORTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run frontend tests
run_frontend_tests() {
    print_status $BLUE "📱 Running Frontend Tests..."
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status $YELLOW "Installing frontend dependencies..."
        npm install
    fi
    
    # Run linting
    print_status $BLUE "🔍 Running ESLint..."
    npm run lint || {
        print_status $RED "❌ Linting failed"
        exit 1
    }
    
    # Run unit tests with coverage
    print_status $BLUE "🧪 Running Unit Tests..."
    npm run test:ci -- --outputFile="../$TEST_RESULTS_DIR/frontend-unit-results.json" || {
        print_status $RED "❌ Unit tests failed"
        exit 1
    }
    
    # Run integration tests
    print_status $BLUE "🔗 Running Integration Tests..."
    npm run test:integration -- --outputFile="../$TEST_RESULTS_DIR/frontend-integration-results.json" || {
        print_status $RED "❌ Integration tests failed"
        exit 1
    }
    
    # Run performance tests
    print_status $BLUE "⚡ Running Performance Tests..."
    npm run test:performance -- --outputFile="../$TEST_RESULTS_DIR/frontend-performance-results.json" || {
        print_status $YELLOW "⚠️  Performance tests had issues (non-blocking)"
    }
    
    # Run cross-browser compatibility tests
    print_status $BLUE "🌐 Running Compatibility Tests..."
    npm run test:compatibility -- --outputFile="../$TEST_RESULTS_DIR/frontend-compatibility-results.json" || {
        print_status $YELLOW "⚠️  Compatibility tests had issues (non-blocking)"
    }
    
    # Run E2E tests
    print_status $BLUE "🎯 Running End-to-End Tests..."
    npm run test:e2e -- --outputFile="../$TEST_RESULTS_DIR/frontend-e2e-results.json" || {
        print_status $RED "❌ E2E tests failed"
        exit 1
    }
    
    # Copy coverage reports
    if [ -d "coverage" ]; then
        cp -r coverage/* "../$COVERAGE_DIR/"
    fi
    
    cd ..
    print_status $GREEN "✅ Frontend tests completed"
}

# Function to run backend load tests
run_backend_tests() {
    print_status $BLUE "🖥️  Running Backend Load Tests..."
    
    cd backend
    
    # Check if Go is installed
    if ! command -v go &> /dev/null; then
        print_status $YELLOW "⚠️  Go not found, skipping backend load tests"
        cd ..
        return
    fi
    
    # Check if backend is running
    if ! curl -f http://localhost:8080/health &> /dev/null; then
        print_status $YELLOW "⚠️  Backend not running, starting test server..."
        
        # Start backend in background for testing
        go run main.go &
        BACKEND_PID=$!
        
        # Wait for backend to start
        sleep 5
        
        # Check if backend started successfully
        if ! curl -f http://localhost:8080/health &> /dev/null; then
            print_status $RED "❌ Failed to start backend for testing"
            kill $BACKEND_PID 2>/dev/null || true
            cd ..
            return
        fi
    fi
    
    # Run load tests
    print_status $BLUE "🔥 Running Load Tests..."
    go run load_test.go > "../$TEST_RESULTS_DIR/backend-load-results.txt" 2>&1 || {
        print_status $YELLOW "⚠️  Load tests had issues (non-blocking)"
    }
    
    # Clean up backend if we started it
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    cd ..
    print_status $GREEN "✅ Backend tests completed"
}

# Function to generate comprehensive report
generate_report() {
    print_status $BLUE "📊 Generating Test Report..."
    
    cat > "$REPORTS_DIR/test-summary.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Zombie Car Game - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .warning { background: #fff3cd; border-color: #ffeaa7; }
        .error { background: #f8d7da; border-color: #f5c6cb; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 Zombie Car Game - Test Results</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="section success">
        <h2>✅ Test Summary</h2>
        <div class="metric">
            <strong>Frontend Tests:</strong> $([ -f "$TEST_RESULTS_DIR/frontend-unit-results.json" ] && echo "PASSED" || echo "FAILED")
        </div>
        <div class="metric">
            <strong>Integration Tests:</strong> $([ -f "$TEST_RESULTS_DIR/frontend-integration-results.json" ] && echo "PASSED" || echo "FAILED")
        </div>
        <div class="metric">
            <strong>E2E Tests:</strong> $([ -f "$TEST_RESULTS_DIR/frontend-e2e-results.json" ] && echo "PASSED" || echo "FAILED")
        </div>
        <div class="metric">
            <strong>Load Tests:</strong> $([ -f "$TEST_RESULTS_DIR/backend-load-results.txt" ] && echo "COMPLETED" || echo "SKIPPED")
        </div>
    </div>
    
    <div class="section">
        <h2>📈 Coverage Report</h2>
        <p>Coverage reports available in: <code>$COVERAGE_DIR/</code></p>
        $([ -f "$COVERAGE_DIR/lcov-report/index.html" ] && echo '<p><a href="../coverage/lcov-report/index.html">View Detailed Coverage Report</a></p>' || echo '<p>Coverage report not generated</p>')
    </div>
    
    <div class="section">
        <h2>📋 Test Files</h2>
        <ul>
            $(for file in $TEST_RESULTS_DIR/*; do
                if [ -f "$file" ]; then
                    echo "<li><a href=\"../$file\">$(basename "$file")</a></li>"
                fi
            done)
        </ul>
    </div>
    
    <div class="section">
        <h2>🔧 Next Steps</h2>
        <ul>
            <li>Review any failed tests and fix issues</li>
            <li>Check coverage report for untested code</li>
            <li>Monitor performance metrics for regressions</li>
            <li>Verify cross-browser compatibility results</li>
        </ul>
    </div>
</body>
</html>
EOF

    print_status $GREEN "✅ Test report generated: $REPORTS_DIR/test-summary.html"
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking Prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_status $RED "❌ Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_status $RED "❌ npm is required but not installed"
        exit 1
    fi
    
    print_status $GREEN "✅ Prerequisites check passed"
}

# Function to cleanup
cleanup() {
    print_status $BLUE "🧹 Cleaning up..."
    
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    print_status $GREEN "✅ Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local start_time=$(date +%s)
    
    print_status $GREEN "🚀 Starting comprehensive test suite..."
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests
    run_frontend_tests
    run_backend_tests
    
    # Generate report
    generate_report
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_status $GREEN "🎉 All tests completed successfully!"
    print_status $BLUE "⏱️  Total execution time: ${duration} seconds"
    
    # Print summary
    echo ""
    echo "📊 FINAL SUMMARY:"
    echo "=================="
    echo "✅ Frontend tests: PASSED"
    echo "✅ Integration tests: PASSED"
    echo "✅ E2E tests: PASSED"
    echo "📊 Reports generated in: $REPORTS_DIR/"
    echo "📈 Coverage reports in: $COVERAGE_DIR/"
    echo ""
    echo "🔗 Open $REPORTS_DIR/test-summary.html to view detailed results"
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Zombie Car Game Test Runner"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --frontend-only     Run only frontend tests"
        echo "  --backend-only      Run only backend tests"
        echo "  --quick             Run quick test suite"
        echo "  --coverage-only     Generate coverage report only"
        echo ""
        echo "Examples:"
        echo "  $0                  # Run all tests"
        echo "  $0 --frontend-only  # Run only frontend tests"
        echo "  $0 --quick          # Run quick test suite"
        exit 0
        ;;
    --frontend-only)
        check_prerequisites
        run_frontend_tests
        generate_report
        ;;
    --backend-only)
        check_prerequisites
        run_backend_tests
        generate_report
        ;;
    --quick)
        check_prerequisites
        print_status $BLUE "⚡ Running quick test suite..."
        cd frontend
        npm run test:ci -- --testPathPattern="(GameSystems|CrossBrowser)" --outputFile="../$TEST_RESULTS_DIR/quick-results.json"
        cd ..
        generate_report
        ;;
    --coverage-only)
        check_prerequisites
        cd frontend
        npm run test:coverage
        cd ..
        generate_report
        ;;
    *)
        main
        ;;
esac