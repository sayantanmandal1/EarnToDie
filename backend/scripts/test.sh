#!/bin/bash

# Test script for Zombie Car Game Backend
# This script runs all tests for the database and cache implementations

echo "Running Zombie Car Game Backend Tests..."
echo "========================================"

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    exit 1
fi

# Set test environment variables
export GIN_MODE=test
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=testuser
export DB_PASSWORD=testpass
export DB_NAME=testdb
export DB_SSLMODE=disable
export REDIS_HOST=localhost
export REDIS_PORT=6379

echo "Environment configured for testing"
echo ""

# Run tests with coverage
echo "Running model tests..."
go test -v -cover ./internal/models

echo ""
echo "Running database tests..."
go test -v -cover ./internal/database

echo ""
echo "Running cache tests..."
go test -v -cover ./internal/cache

echo ""
echo "Running all tests with race detection..."
go test -race ./internal/models ./internal/database ./internal/cache

echo ""
echo "Test execution completed!"