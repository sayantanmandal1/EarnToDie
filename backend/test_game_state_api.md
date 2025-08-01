# Game State API Testing

This document provides examples of how to test the new Game State Management API endpoints.

## Prerequisites

1. Start the server: `./zombie-car-game-backend.exe`
2. Create a player account and get an authentication token

## Authentication

First, register a new player:

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testplayer",
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the token from the response for use in subsequent requests.

## Game Session Management

### 1. Start a Game Session

```bash
curl -X POST http://localhost:8080/api/v1/game/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "level_id": "level_1"
  }'
```

### 2. Get Active Session

```bash
curl -X GET http://localhost:8080/api/v1/game/sessions/active \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Update Session Score

```bash
curl -X PUT http://localhost:8080/api/v1/game/sessions/SESSION_ID/score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "score": 150,
    "zombies_killed": 15,
    "distance_traveled": 75.5
  }'
```

### 4. End Session

```bash
curl -X POST http://localhost:8080/api/v1/game/sessions/SESSION_ID/end \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "final_score": 500,
    "zombies_killed": 50,
    "distance_traveled": 200.0,
    "session_state": "completed"
  }'
```

### 5. Get Player Sessions

```bash
curl -X GET http://localhost:8080/api/v1/game/sessions?limit=5 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Vehicle Management

### 1. Get Available Vehicles

```bash
curl -X GET http://localhost:8080/api/v1/vehicles/available \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Purchase a Vehicle

```bash
curl -X POST http://localhost:8080/api/v1/vehicles/purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "vehicle_type": "sedan"
  }'
```

### 3. Get Player Vehicles

```bash
curl -X GET http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Upgrade a Vehicle

```bash
curl -X POST http://localhost:8080/api/v1/vehicles/upgrade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "vehicle_id": 1,
    "upgrade_type": "engine"
  }'
```

### 5. Get Specific Vehicle

```bash
curl -X GET http://localhost:8080/api/v1/vehicles/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Expected Responses

### Successful Session Start
```json
{
  "message": "Session started successfully",
  "session": {
    "id": "uuid-here",
    "player_id": 1,
    "level_id": "level_1",
    "score": 0,
    "zombies_killed": 0,
    "distance_traveled": 0,
    "session_state": "active",
    "started_at": "2025-07-29T15:00:00Z"
  }
}
```

### Successful Session End
```json
{
  "message": "Session ended successfully",
  "result": {
    "session_id": "uuid-here",
    "final_score": 500,
    "zombies_killed": 50,
    "distance_traveled": 200.0,
    "duration": "5m30s",
    "currency_earned": 50,
    "level_completed": true
  }
}
```

### Available Vehicles
```json
{
  "vehicles": {
    "sedan": {
      "name": "Family Sedan",
      "base_stats": {
        "speed": 60,
        "acceleration": 40,
        "armor": 30,
        "fuel_capacity": 100,
        "damage": 25,
        "handling": 70
      },
      "cost": 0,
      "unlock_level": 1,
      "description": "A reliable family car, perfect for beginners."
    }
  }
}
```

## Error Responses

### Insufficient Funds
```json
{
  "error": "Insufficient funds"
}
```

### Session Not Found
```json
{
  "error": "Session not found"
}
```

### Score Validation Failed
```json
{
  "error": "Score validation failed"
}
```