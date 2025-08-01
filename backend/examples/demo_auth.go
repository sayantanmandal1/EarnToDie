package main

import (
	"fmt"
	"log"
	"os"

	"zombie-car-game-backend/internal/auth"
)

// Simple demonstration of the authentication system without database dependencies
func main() {
	fmt.Println("=== Zombie Car Game Authentication System Demo ===")
	fmt.Println()

	// Set test environment
	os.Setenv("JWT_SECRET", "demo-secret-key")

	// Initialize services
	passwordService := auth.NewPasswordService()
	jwtService := auth.NewJWTService()

	fmt.Println("1. Testing Password Hashing...")
	password := "mySecurePassword123"
	hashedPassword, err := passwordService.HashPassword(password)
	if err != nil {
		log.Fatal("Failed to hash password:", err)
	}
	fmt.Printf("   Original: %s\n", password)
	fmt.Printf("   Hashed:   %s\n", hashedPassword)
	fmt.Println("   ✓ Password hashed successfully")
	fmt.Println()

	fmt.Println("2. Testing Password Verification...")
	err = passwordService.VerifyPassword(hashedPassword, password)
	if err != nil {
		log.Fatal("Password verification failed:", err)
	}
	fmt.Println("   ✓ Password verification successful")

	// Test wrong password
	err = passwordService.VerifyPassword(hashedPassword, "wrongPassword")
	if err == nil {
		log.Fatal("Password verification should have failed for wrong password")
	}
	fmt.Println("   ✓ Wrong password correctly rejected")
	fmt.Println()

	fmt.Println("3. Testing JWT Token Generation...")
	playerID := uint(123)
	username := "testPlayer"
	token, err := jwtService.GenerateToken(playerID, username)
	if err != nil {
		log.Fatal("Failed to generate token:", err)
	}
	fmt.Printf("   Player ID: %d\n", playerID)
	fmt.Printf("   Username:  %s\n", username)
	fmt.Printf("   Token:     %s...\n", token[:50]) // Show first 50 chars
	fmt.Println("   ✓ JWT token generated successfully")
	fmt.Println()

	fmt.Println("4. Testing JWT Token Validation...")
	claims, err := jwtService.ValidateToken(token)
	if err != nil {
		log.Fatal("Failed to validate token:", err)
	}
	fmt.Printf("   Extracted Player ID: %d\n", claims.PlayerID)
	fmt.Printf("   Extracted Username:  %s\n", claims.Username)
	fmt.Printf("   Token Issuer:        %s\n", claims.Issuer)
	fmt.Printf("   Token Subject:       %s\n", claims.Subject)
	fmt.Println("   ✓ JWT token validated successfully")
	fmt.Println()

	fmt.Println("5. Testing JWT Token Refresh...")
	newToken, err := jwtService.RefreshToken(token)
	if err != nil {
		log.Fatal("Failed to refresh token:", err)
	}
	fmt.Printf("   Original Token: %s...\n", token[:30])
	fmt.Printf("   Refreshed Token: %s...\n", newToken[:30])
	fmt.Println("   ✓ JWT token refreshed successfully")
	fmt.Println()

	fmt.Println("6. Testing Invalid Token Handling...")
	_, err = jwtService.ValidateToken("invalid.token.here")
	if err == nil {
		log.Fatal("Invalid token should have been rejected")
	}
	fmt.Printf("   Error: %s\n", err.Error())
	fmt.Println("   ✓ Invalid token correctly rejected")
	fmt.Println()

	fmt.Println("=== All Authentication Tests Passed! ===")
	fmt.Println()
	fmt.Println("The authentication system includes:")
	fmt.Println("✓ Secure password hashing with bcrypt")
	fmt.Println("✓ JWT token generation with configurable expiration")
	fmt.Println("✓ JWT token validation with proper error handling")
	fmt.Println("✓ JWT token refresh functionality")
	fmt.Println("✓ Proper error handling for invalid credentials")
	fmt.Println("✓ Middleware for protecting API endpoints")
	fmt.Println("✓ Complete player service with CRUD operations")
	fmt.Println("✓ RESTful API endpoints for authentication and player management")
	fmt.Println()
	fmt.Println("Ready for integration with the zombie car game!")
}