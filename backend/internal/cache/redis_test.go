package cache

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

// mockRedisClient creates a mock Redis client for testing
func mockRedisClient() *redis.Client {
	// Use Redis client with fake address for unit tests
	// In real integration tests, you would use a test Redis instance
	return redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   15, // Use a different DB for tests
	})
}

func TestRedisConfig(t *testing.T) {
	t.Run("Load Config with Environment Variables", func(t *testing.T) {
		os.Setenv("REDIS_HOST", "testhost")
		os.Setenv("REDIS_PORT", "6380")
		os.Setenv("REDIS_PASSWORD", "testpass")
		os.Setenv("REDIS_DB", "5")

		config := LoadConfig()
		assert.Equal(t, "testhost", config.Host)
		assert.Equal(t, "6380", config.Port)
		assert.Equal(t, "testpass", config.Password)
		assert.Equal(t, 5, config.DB)

		// Clean up
		os.Unsetenv("REDIS_HOST")
		os.Unsetenv("REDIS_PORT")
		os.Unsetenv("REDIS_PASSWORD")
		os.Unsetenv("REDIS_DB")
	})

	t.Run("Load Config with Defaults", func(t *testing.T) {
		config := LoadConfig()
		assert.Equal(t, "localhost", config.Host)
		assert.Equal(t, "6379", config.Port)
		assert.Equal(t, "", config.Password)
		assert.Equal(t, 0, config.DB)
	})

	t.Run("Load Config with Invalid DB Number", func(t *testing.T) {
		os.Setenv("REDIS_DB", "invalid")
		config := LoadConfig()
		assert.Equal(t, 0, config.DB) // Should default to 0 for invalid input
		os.Unsetenv("REDIS_DB")
	})
}

func TestRedisCacheOperations(t *testing.T) {
	// Skip Redis tests if Redis is not available
	// In a real environment, you would set up a test Redis instance
	if testing.Short() {
		t.Skip("Skipping Redis integration tests in short mode")
	}

	// Set up test Redis client
	originalClient := RedisClient
	RedisClient = mockRedisClient()
	defer func() { RedisClient = originalClient }()

	ctx := context.Background()

	// Test connection first
	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		t.Skip("Redis not available for testing:", err)
	}

	// Clean up any existing test data
	RedisClient.FlushDB(ctx)

	t.Run("Set and Get Operations", func(t *testing.T) {
		key := "test:key1"
		value := "test_value"
		expiration := 1 * time.Hour

		// Set value
		err := Set(ctx, key, value, expiration)
		assert.NoError(t, err)

		// Get value
		retrievedValue, err := Get(ctx, key)
		assert.NoError(t, err)
		assert.Equal(t, value, retrievedValue)
	})

	t.Run("Set with Expiration", func(t *testing.T) {
		key := "test:expiry"
		value := "expires_soon"
		expiration := 100 * time.Millisecond

		// Set value with short expiration
		err := Set(ctx, key, value, expiration)
		assert.NoError(t, err)

		// Value should exist immediately
		retrievedValue, err := Get(ctx, key)
		assert.NoError(t, err)
		assert.Equal(t, value, retrievedValue)

		// Wait for expiration
		time.Sleep(150 * time.Millisecond)

		// Value should be expired
		_, err = Get(ctx, key)
		assert.Error(t, err)
		assert.Equal(t, redis.Nil, err)
	})

	t.Run("Delete Operation", func(t *testing.T) {
		key := "test:delete"
		value := "to_be_deleted"

		// Set value
		err := Set(ctx, key, value, 1*time.Hour)
		assert.NoError(t, err)

		// Verify it exists
		exists, err := Exists(ctx, key)
		assert.NoError(t, err)
		assert.True(t, exists)

		// Delete value
		err = Delete(ctx, key)
		assert.NoError(t, err)

		// Verify it's deleted
		exists, err = Exists(ctx, key)
		assert.NoError(t, err)
		assert.False(t, exists)
	})

	t.Run("Exists Operation", func(t *testing.T) {
		key := "test:exists"
		value := "exists_test"

		// Key should not exist initially
		exists, err := Exists(ctx, key)
		assert.NoError(t, err)
		assert.False(t, exists)

		// Set value
		err = Set(ctx, key, value, 1*time.Hour)
		assert.NoError(t, err)

		// Key should exist now
		exists, err = Exists(ctx, key)
		assert.NoError(t, err)
		assert.True(t, exists)
	})

	t.Run("Operations with Nil Client", func(t *testing.T) {
		// Temporarily set client to nil
		originalClient := RedisClient
		RedisClient = nil

		// All operations should return errors
		err := Set(ctx, "key", "value", time.Hour)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Redis client not initialized")

		_, err = Get(ctx, "key")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Redis client not initialized")

		err = Delete(ctx, "key")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Redis client not initialized")

		_, err = Exists(ctx, "key")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "Redis client not initialized")

		// Restore client
		RedisClient = originalClient
	})

	// Clean up test data
	RedisClient.FlushDB(ctx)
}

func TestRedisConnectionHandling(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping Redis connection tests in short mode")
	}

	t.Run("Connect with Valid Configuration", func(t *testing.T) {
		// Set test environment
		os.Setenv("REDIS_HOST", "localhost")
		os.Setenv("REDIS_PORT", "6379")
		os.Setenv("REDIS_DB", "15")

		// This would normally test actual connection
		// In a real test environment, you'd have a test Redis instance
		config := LoadConfig()
		assert.Equal(t, "localhost", config.Host)
		assert.Equal(t, "6379", config.Port)
		assert.Equal(t, 15, config.DB)

		// Clean up
		os.Unsetenv("REDIS_HOST")
		os.Unsetenv("REDIS_PORT")
		os.Unsetenv("REDIS_DB")
	})

	t.Run("GetClient Returns Client", func(t *testing.T) {
		originalClient := RedisClient
		testClient := mockRedisClient()
		RedisClient = testClient

		client := GetClient()
		assert.Equal(t, testClient, client)

		RedisClient = originalClient
	})
}

func TestRedisCachePatterns(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping Redis pattern tests in short mode")
	}

	// Set up test Redis client
	originalClient := RedisClient
	RedisClient = mockRedisClient()
	defer func() { RedisClient = originalClient }()

	ctx := context.Background()

	// Test connection first
	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		t.Skip("Redis not available for testing:", err)
	}

	// Clean up any existing test data
	RedisClient.FlushDB(ctx)

	t.Run("Session Caching Pattern", func(t *testing.T) {
		sessionID := "session:12345"
		sessionData := `{"player_id": 1, "level": "level_001", "score": 1500}`
		expiration := 30 * time.Minute

		// Cache session data
		err := Set(ctx, sessionID, sessionData, expiration)
		assert.NoError(t, err)

		// Retrieve session data
		retrievedData, err := Get(ctx, sessionID)
		assert.NoError(t, err)
		assert.Equal(t, sessionData, retrievedData)

		// Check TTL
		ttl := RedisClient.TTL(ctx, sessionID).Val()
		assert.True(t, ttl > 25*time.Minute && ttl <= 30*time.Minute)
	})

	t.Run("Player Data Caching Pattern", func(t *testing.T) {
		playerKey := "player:123"
		playerData := `{"id": 123, "username": "testplayer", "currency": 5000}`
		expiration := 1 * time.Hour

		// Cache player data
		err := Set(ctx, playerKey, playerData, expiration)
		assert.NoError(t, err)

		// Retrieve player data
		retrievedData, err := Get(ctx, playerKey)
		assert.NoError(t, err)
		assert.Equal(t, playerData, retrievedData)

		// Update cache
		updatedData := `{"id": 123, "username": "testplayer", "currency": 6000}`
		err = Set(ctx, playerKey, updatedData, expiration)
		assert.NoError(t, err)

		// Verify update
		retrievedData, err = Get(ctx, playerKey)
		assert.NoError(t, err)
		assert.Equal(t, updatedData, retrievedData)
	})

	t.Run("Leaderboard Caching Pattern", func(t *testing.T) {
		leaderboardKey := "leaderboard:level_001"
		leaderboardData := `[{"player": "player1", "score": 5000}, {"player": "player2", "score": 4500}]`
		expiration := 5 * time.Minute

		// Cache leaderboard
		err := Set(ctx, leaderboardKey, leaderboardData, expiration)
		assert.NoError(t, err)

		// Retrieve leaderboard
		retrievedData, err := Get(ctx, leaderboardKey)
		assert.NoError(t, err)
		assert.Equal(t, leaderboardData, retrievedData)

		// Verify short expiration for frequently updated data
		ttl := RedisClient.TTL(ctx, leaderboardKey).Val()
		assert.True(t, ttl <= 5*time.Minute)
	})

	// Clean up test data
	RedisClient.FlushDB(ctx)
}