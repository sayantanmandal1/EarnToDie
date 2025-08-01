# Database Implementation

This directory contains the database implementation for the Zombie Car Game backend.

## Overview

The database layer provides:
- PostgreSQL connection management with GORM
- Database models for all game entities
- Migration system for schema versioning
- Redis caching utilities
- Comprehensive test coverage

## Models

### Player
- Core player information (username, email, password)
- Game progression data (currency, level, total score)
- Relationships to vehicles, sessions, and progress

### OwnedVehicle
- Player-owned vehicles with upgrade information
- JSON storage for upgrade levels
- Vehicle type validation

### GameSession
- Individual game session tracking
- Score, zombies killed, distance traveled
- Session state management (active, completed, failed, abandoned)

### LevelProgress
- Player progress per level
- Best scores, completion status, star ratings
- Unique constraint per player-level combination

## Database Connection

```go
import "zombie-car-game-backend/internal/database"

// Connect to database
err := database.Connect()
if err != nil {
    log.Fatal("Database connection failed:", err)
}

// Run migrations
err = database.AutoMigrate()
if err != nil {
    log.Fatal("Migration failed:", err)
}

// Get database instance
db := database.GetDB()
```

## Redis Cache

```go
import "zombie-car-game-backend/internal/cache"

// Connect to Redis
err := cache.Connect()
if err != nil {
    log.Println("Redis connection failed:", err)
}

// Cache operations
ctx := context.Background()
err = cache.Set(ctx, "key", "value", time.Hour)
value, err := cache.Get(ctx, "key")
err = cache.Delete(ctx, "key")
exists, err := cache.Exists(ctx, "key")
```

## Environment Variables

Required environment variables:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=gameuser
DB_PASSWORD=gamepass
DB_NAME=zombie_game
DB_SSLMODE=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Running Tests

```bash
# Run all tests
go test ./internal/models ./internal/database ./internal/cache

# Run with coverage
go test -cover ./internal/models ./internal/database ./internal/cache

# Run specific test
go test -run TestPlayerModel ./internal/models
```

## Migration System

The migration system supports:
- Automatic schema versioning
- Migration status tracking
- Safe migration execution
- Rollback support (planned)

Migrations are stored in `backend/migrations/` and executed automatically on startup.

## Performance Considerations

- Database connection pooling configured
- Indexes on frequently queried columns
- Soft deletes for data integrity
- Redis caching for frequently accessed data
- Batch operations for bulk inserts

## Security Features

- Password hashing (implementation in auth layer)
- SQL injection prevention via GORM
- Input validation with database constraints
- Soft deletes to prevent data loss
- Connection security with SSL support