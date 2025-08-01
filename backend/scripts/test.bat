@echo off
REM Test script for Zombie Car Game Backend (Windows)
REM This script runs all tests for the database and cache implementations

echo Running Zombie Car Game Backend Tests...
echo ========================================

REM Check if Go is installed
go version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Go is not installed or not in PATH
    exit /b 1
)

REM Set test environment variables
set GIN_MODE=test
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=testuser
set DB_PASSWORD=testpass
set DB_NAME=testdb
set DB_SSLMODE=disable
set REDIS_HOST=localhost
set REDIS_PORT=6379

echo Environment configured for testing
echo.

REM Run tests with coverage
echo Running model tests...
go test -v -cover ./internal/models

echo.
echo Running database tests...
go test -v -cover ./internal/database

echo.
echo Running cache tests...
go test -v -cover ./internal/cache

echo.
echo Running all tests with race detection...
go test -race ./internal/models ./internal/database ./internal/cache

echo.
echo Test execution completed!