# API Endpoints Testing Guide

This guide shows how to test the authentication and player management endpoints.

## Prerequisites

1. Start the server (requires PostgreSQL or SQLite with CGO):
```bash
go run main.go
```

2. The server will run on `http://localhost:8080`

## Testing Authentication Endpoints

### 1. Health Check
```bash
curl -X GET http://localhost:8080/health
```

Expected Response:
```json
{
  "status": "ok",
  "message": "Zombie Car Game Backend is running",
  "database": "ok",
  "redis": "not_connected"
}
```

### 2. Player Registration
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "player1@example.com",
    "password": "securepassword123"
  }'
```

Expected Response:
```json
{
  "message": "Player created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "player": {
      "id": 1,
      "username": "player1",
      "email": "player1@example.com",
      "currency": 1000,
      "level": 1,
      "total_score": 0,
      "created_at": "2024-01-01T12:00:00Z",
      "updated_at": "2024-01-01T12:00:00Z"
    }
  }
}
```

### 3. Player Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "securepassword123"
  }'
```

Expected Response:
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "player": {
      "id": 1,
      "username": "player1",
      "email": "player1@example.com",
      "currency": 1000,
      "level": 1,
      "total_score": 0
    }
  }
}
```

### 4. Token Refresh
```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_EXISTING_TOKEN_HERE"
  }'
```

## Testing Protected Endpoints

**Note:** Replace `YOUR_TOKEN_HERE` with the actual token received from login/registration.

### 5. Get Player Profile
```bash
curl -X GET http://localhost:8080/api/v1/players/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected Response:
```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "currency": 1000,
    "level": 1,
    "total_score": 0,
    "owned_vehicles": [],
    "level_progress": []
  }
}
```

### 6. Get Player Progress
```bash
curl -X GET http://localhost:8080/api/v1/players/progress \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. Update Player Currency
```bash
curl -X PUT http://localhost:8080/api/v1/players/currency \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500
  }'
```

Expected Response:
```json
{
  "message": "Currency updated successfully"
}
```

### 8. Update Player Level
```bash
curl -X PUT http://localhost:8080/api/v1/players/level \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "level": 5
  }'
```

### 9. Update Player Score
```bash
curl -X PUT http://localhost:8080/api/v1/players/score \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 1500
  }'
```

## Testing Error Cases

### 10. Access Protected Endpoint Without Token
```bash
curl -X GET http://localhost:8080/api/v1/players/profile
```

Expected Response:
```json
{
  "error": "Authorization header is required"
}
```

### 11. Invalid Login Credentials
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "wrongpassword"
  }'
```

Expected Response:
```json
{
  "error": "Invalid username or password"
}
```

### 12. Duplicate Registration
```bash
# Try to register the same username again
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "email": "different@example.com",
    "password": "password123"
  }'
```

Expected Response:
```json
{
  "error": "Username already exists"
}
```

### 13. Invalid Token
```bash
curl -X GET http://localhost:8080/api/v1/players/profile \
  -H "Authorization: Bearer invalid.token.here"
```

Expected Response:
```json
{
  "error": "Invalid token"
}
```

## Validation Testing

### 14. Invalid Registration Data
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",
    "email": "invalid-email",
    "password": "123"
  }'
```

Expected Response:
```json
{
  "error": "Invalid request data",
  "details": "validation errors..."
}
```

## Admin Endpoints

### 15. Get Player by ID (Admin)
```bash
curl -X GET http://localhost:8080/api/v1/admin/players/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Status Endpoints

### 16. Database Status
```bash
curl -X GET http://localhost:8080/api/v1/status/db
```

### 17. Redis Status
```bash
curl -X GET http://localhost:8080/api/v1/status/redis
```

## Notes

- All endpoints return JSON responses
- Protected endpoints require a valid JWT token in the Authorization header
- Tokens expire after 24 hours
- New players start with 1000 currency and level 1
- Currency can be negative (debt system)
- Levels must be positive integers
- Scores are cumulative (always added to existing score)

## Environment Variables

Set these environment variables for production:

```bash
export JWT_SECRET="your-super-secret-jwt-key"
export GIN_MODE="release"
export DATABASE_URL="postgres://user:password@localhost/zombiecar"
export REDIS_URL="redis://localhost:6379"
```