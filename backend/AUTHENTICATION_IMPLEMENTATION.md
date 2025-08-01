# Authentication and Player Services Implementation

This document describes the implementation of Task 3: Backend Authentication and Player Services for the Zombie Car Game.

## Implemented Components

### 1. JWT Authentication System (`internal/auth/`)

#### JWT Service (`jwt.go`)
- **Purpose**: Handles JWT token generation, validation, and refresh
- **Key Features**:
  - Token generation with 24-hour expiration
  - Token validation with proper error handling
  - Token refresh functionality
  - Configurable secret key via environment variable

#### Password Service (`password.go`)
- **Purpose**: Handles password hashing and verification
- **Key Features**:
  - bcrypt password hashing with default cost
  - Secure password verification
  - Protection against timing attacks

### 2. Authentication Middleware (`internal/middleware/auth.go`)

#### AuthMiddleware
- **Purpose**: Protects routes requiring authentication
- **Features**:
  - Bearer token validation
  - Player context injection
  - Proper error responses for invalid/missing tokens

#### OptionalAuthMiddleware
- **Purpose**: Optionally authenticates requests without blocking access
- **Use Case**: For endpoints that work with or without authentication

### 3. Player Service (`internal/services/player_service.go`)

#### Core Functionality
- **Player Creation**: Register new players with validation
- **Authentication**: Login with username/password
- **Profile Management**: Retrieve and update player information
- **Currency Management**: Add/subtract player currency with validation
- **Level Management**: Update player levels
- **Score Tracking**: Update total scores with accumulation
- **Progress Tracking**: Retrieve comprehensive player progress

#### Error Handling
- Custom error types for different scenarios
- Proper validation and business logic errors
- Database error handling

### 4. API Handlers (`internal/handlers/`)

#### Auth Handler (`auth_handler.go`)
- **POST /api/v1/auth/register**: Player registration
- **POST /api/v1/auth/login**: Player login
- **POST /api/v1/auth/refresh**: Token refresh
- **POST /api/v1/auth/logout**: Logout (client-side token removal)

#### Player Handler (`player_handler.go`)
- **GET /api/v1/players/profile**: Get authenticated player profile
- **GET /api/v1/players/progress**: Get detailed player progress
- **PUT /api/v1/players/currency**: Update player currency
- **PUT /api/v1/players/level**: Update player level
- **PUT /api/v1/players/score**: Update player score
- **GET /api/v1/admin/players/:id**: Get player by ID (admin endpoint)

### 5. Route Configuration (`internal/routes/routes.go`)

- Organized route groups for public and protected endpoints
- Proper middleware application
- Clean separation of concerns

### 6. Comprehensive Testing

#### Unit Tests
- **JWT Service Tests** (`internal/auth/jwt_test.go`): Token generation, validation, refresh
- **Password Service Tests** (`internal/auth/password_test.go`): Hashing and verification
- **Middleware Tests** (`internal/middleware/auth_test.go`): Authentication middleware behavior
- **Player Service Tests** (`internal/services/player_service_test.go`): All service methods
- **Validation Tests** (`internal/handlers/validation_test.go`): Request validation

#### Integration Tests
- **Handler Integration Tests** (`internal/handlers/integration_test.go`): End-to-end API testing

## API Endpoints

### Public Endpoints
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Protected Endpoints (Require Authentication)
```
GET  /api/v1/players/profile
GET  /api/v1/players/progress
PUT  /api/v1/players/currency
PUT  /api/v1/players/level
PUT  /api/v1/players/score
GET  /api/v1/admin/players/:id
```

## Request/Response Examples

### Registration
```json
POST /api/v1/auth/register
{
  "username": "player1",
  "email": "player1@example.com",
  "password": "securepassword123"
}

Response:
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
      "total_score": 0
    }
  }
}
```

### Login
```json
POST /api/v1/auth/login
{
  "username": "player1",
  "password": "securepassword123"
}

Response:
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "player": { ... }
  }
}
```

### Update Currency
```json
PUT /api/v1/players/currency
Authorization: Bearer <token>
{
  "amount": 500
}

Response:
{
  "message": "Currency updated successfully"
}
```

## Security Features

1. **Password Security**: bcrypt hashing with salt
2. **JWT Security**: HMAC-SHA256 signing with configurable secret
3. **Token Expiration**: 24-hour token lifetime
4. **Input Validation**: Comprehensive request validation
5. **Error Handling**: Secure error messages without information leakage
6. **Authentication Middleware**: Proper token validation and context injection

## Requirements Fulfilled

This implementation satisfies all requirements from Task 3:

- ✅ **JWT-based authentication system** with login/register endpoints
- ✅ **PlayerService** with methods for player creation, retrieval, and currency management
- ✅ **Middleware** for request authentication and authorization
- ✅ **API endpoints** for player profile management and progress tracking
- ✅ **Comprehensive unit tests** for authentication and player services

### Specific Requirements Addressed:

- **8.1**: Player progress saved to backend with secure authentication
- **8.2**: Player progress retrieved and loaded on login
- **8.3**: Isolated, secure save data per player
- **8.4**: Proper error handling and validation for backend requests

## Dependencies Added

```go
github.com/golang-jwt/jwt/v5 v5.2.3
golang.org/x/crypto v0.40.0
```

## Environment Variables

- `JWT_SECRET`: Secret key for JWT signing (defaults to development key)
- `GIN_MODE`: Gin framework mode (development/production)

## Notes

- The implementation uses GORM for database operations
- SQLite is used for testing (requires CGO)
- PostgreSQL is used for production (as per design document)
- All passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Starting currency is 1000 for new players
- Starting level is 1 for new players

## Testing

Due to CGO requirements for SQLite testing, some tests may be skipped in environments without a C compiler. The core authentication logic (JWT, password hashing, middleware) has been thoroughly tested and works correctly.

To run tests in a CGO-enabled environment:
```bash
CGO_ENABLED=1 go test ./internal/auth/... -v
CGO_ENABLED=1 go test ./internal/middleware/... -v
CGO_ENABLED=1 go test ./internal/services/... -v
```