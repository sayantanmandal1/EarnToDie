package cache

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// Config holds Redis configuration
type Config struct {
	Host     string
	Port     string
	Password string
	DB       int
}

// LoadConfig loads Redis configuration from environment variables
func LoadConfig() *Config {
	dbNum := 0
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if num, err := strconv.Atoi(dbStr); err == nil {
			dbNum = num
		}
	}

	return &Config{
		Host:     getEnv("REDIS_HOST", "localhost"),
		Port:     getEnv("REDIS_PORT", "6379"),
		Password: getEnv("REDIS_PASSWORD", ""),
		DB:       dbNum,
	}
}

// Connect establishes a connection to Redis
func Connect() error {
	config := LoadConfig()
	
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", config.Host, config.Port),
		Password: config.Password,
		DB:       config.DB,
	})

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Redis connection established successfully")
	return nil
}

// Close closes the Redis connection
func Close() error {
	if RedisClient == nil {
		return nil
	}
	return RedisClient.Close()
}

// GetClient returns the Redis client instance
func GetClient() *redis.Client {
	return RedisClient
}

// Set stores a key-value pair with expiration
func Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	if RedisClient == nil {
		return fmt.Errorf("Redis client not initialized")
	}
	return RedisClient.Set(ctx, key, value, expiration).Err()
}

// Get retrieves a value by key
func Get(ctx context.Context, key string) (string, error) {
	if RedisClient == nil {
		return "", fmt.Errorf("Redis client not initialized")
	}
	return RedisClient.Get(ctx, key).Result()
}

// Delete removes a key
func Delete(ctx context.Context, key string) error {
	if RedisClient == nil {
		return fmt.Errorf("Redis client not initialized")
	}
	return RedisClient.Del(ctx, key).Err()
}

// Exists checks if a key exists
func Exists(ctx context.Context, key string) (bool, error) {
	if RedisClient == nil {
		return false, fmt.Errorf("Redis client not initialized")
	}
	result, err := RedisClient.Exists(ctx, key).Result()
	return result > 0, err
}

// getEnv gets environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}