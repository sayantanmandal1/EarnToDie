package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// LoadTestConfig defines the configuration for load testing
type LoadTestConfig struct {
	BaseURL         string
	ConcurrentUsers int
	TestDuration    time.Duration
	RequestsPerUser int
}

// TestResult stores the results of a load test
type TestResult struct {
	TotalRequests    int
	SuccessfulReqs   int
	FailedReqs       int
	AverageResponse  time.Duration
	MaxResponse      time.Duration
	MinResponse      time.Duration
	RequestsPerSec   float64
}

// LoadTester manages load testing scenarios
type LoadTester struct {
	config LoadTestConfig
	client *http.Client
}

// NewLoadTester creates a new load tester instance
func NewLoadTester(config LoadTestConfig) *LoadTester {
	return &LoadTester{
		config: config,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// TestPlayerRegistration tests user registration under load
func (lt *LoadTester) TestPlayerRegistration() TestResult {
	fmt.Println("Testing player registration under load...")
	
	var wg sync.WaitGroup
	results := make(chan time.Duration, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	errors := make(chan error, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	
	startTime := time.Now()
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()
			
			for j := 0; j < lt.config.RequestsPerUser; j++ {
				reqStart := time.Now()
				
				// Create registration payload
				payload := map[string]interface{}{
					"username": fmt.Sprintf("testuser_%d_%d", userID, j),
					"email":    fmt.Sprintf("test_%d_%d@example.com", userID, j),
					"password": "testpassword123",
				}
				
				jsonData, _ := json.Marshal(payload)
				
				resp, err := lt.client.Post(
					lt.config.BaseURL+"/api/auth/register",
					"application/json",
					bytes.NewBuffer(jsonData),
				)
				
				duration := time.Since(reqStart)
				
				if err != nil {
					errors <- err
				} else {
					resp.Body.Close()
					if resp.StatusCode == 201 {
						results <- duration
					} else {
						errors <- fmt.Errorf("HTTP %d", resp.StatusCode)
					}
				}
			}
		}(i)
	}
	
	wg.Wait()
	close(results)
	close(errors)
	
	return lt.calculateResults(results, errors, startTime)
}

// TestPlayerLogin tests user login under load
func (lt *LoadTester) TestPlayerLogin() TestResult {
	fmt.Println("Testing player login under load...")
	
	// First, create test users
	lt.createTestUsers()
	
	var wg sync.WaitGroup
	results := make(chan time.Duration, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	errors := make(chan error, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	
	startTime := time.Now()
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()
			
			for j := 0; j < lt.config.RequestsPerUser; j++ {
				reqStart := time.Now()
				
				payload := map[string]interface{}{
					"username": fmt.Sprintf("loadtest_user_%d", userID),
					"password": "testpassword123",
				}
				
				jsonData, _ := json.Marshal(payload)
				
				resp, err := lt.client.Post(
					lt.config.BaseURL+"/api/auth/login",
					"application/json",
					bytes.NewBuffer(jsonData),
				)
				
				duration := time.Since(reqStart)
				
				if err != nil {
					errors <- err
				} else {
					resp.Body.Close()
					if resp.StatusCode == 200 {
						results <- duration
					} else {
						errors <- fmt.Errorf("HTTP %d", resp.StatusCode)
					}
				}
			}
		}(i)
	}
	
	wg.Wait()
	close(results)
	close(errors)
	
	return lt.calculateResults(results, errors, startTime)
}

// TestGameSessionCreation tests game session creation under load
func (lt *LoadTester) TestGameSessionCreation() TestResult {
	fmt.Println("Testing game session creation under load...")
	
	// Get auth tokens for test users
	tokens := lt.getAuthTokens()
	
	var wg sync.WaitGroup
	results := make(chan time.Duration, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	errors := make(chan error, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	
	startTime := time.Now()
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()
			
			token := tokens[userID%len(tokens)]
			
			for j := 0; j < lt.config.RequestsPerUser; j++ {
				reqStart := time.Now()
				
				payload := map[string]interface{}{
					"level_id": "level_1",
					"vehicle_type": "sedan",
				}
				
				jsonData, _ := json.Marshal(payload)
				
				req, _ := http.NewRequest("POST", lt.config.BaseURL+"/api/game/session", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Authorization", "Bearer "+token)
				
				resp, err := lt.client.Do(req)
				
				duration := time.Since(reqStart)
				
				if err != nil {
					errors <- err
				} else {
					resp.Body.Close()
					if resp.StatusCode == 201 {
						results <- duration
					} else {
						errors <- fmt.Errorf("HTTP %d", resp.StatusCode)
					}
				}
			}
		}(i)
	}
	
	wg.Wait()
	close(results)
	close(errors)
	
	return lt.calculateResults(results, errors, startTime)
}

// TestScoreSubmission tests score submission under load
func (lt *LoadTester) TestScoreSubmission() TestResult {
	fmt.Println("Testing score submission under load...")
	
	tokens := lt.getAuthTokens()
	sessionIDs := lt.createGameSessions(tokens)
	
	var wg sync.WaitGroup
	results := make(chan time.Duration, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	errors := make(chan error, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	
	startTime := time.Now()
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()
			
			token := tokens[userID%len(tokens)]
			sessionID := sessionIDs[userID%len(sessionIDs)]
			
			for j := 0; j < lt.config.RequestsPerUser; j++ {
				reqStart := time.Now()
				
				payload := map[string]interface{}{
					"session_id": sessionID,
					"score": 1000 + j*100,
					"zombies_killed": 10 + j,
					"distance_traveled": 500.5 + float64(j)*10.5,
				}
				
				jsonData, _ := json.Marshal(payload)
				
				req, _ := http.NewRequest("PUT", lt.config.BaseURL+"/api/game/score", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Authorization", "Bearer "+token)
				
				resp, err := lt.client.Do(req)
				
				duration := time.Since(reqStart)
				
				if err != nil {
					errors <- err
				} else {
					resp.Body.Close()
					if resp.StatusCode == 200 {
						results <- duration
					} else {
						errors <- fmt.Errorf("HTTP %d", resp.StatusCode)
					}
				}
			}
		}(i)
	}
	
	wg.Wait()
	close(results)
	close(errors)
	
	return lt.calculateResults(results, errors, startTime)
}

// TestVehiclePurchase tests vehicle purchase under load
func (lt *LoadTester) TestVehiclePurchase() TestResult {
	fmt.Println("Testing vehicle purchase under load...")
	
	tokens := lt.getAuthTokens()
	
	var wg sync.WaitGroup
	results := make(chan time.Duration, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	errors := make(chan error, lt.config.ConcurrentUsers*lt.config.RequestsPerUser)
	
	startTime := time.Now()
	
	vehicleTypes := []string{"suv", "truck", "sports_car", "monster_truck"}
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		wg.Add(1)
		go func(userID int) {
			defer wg.Done()
			
			token := tokens[userID%len(tokens)]
			
			for j := 0; j < lt.config.RequestsPerUser; j++ {
				reqStart := time.Now()
				
				vehicleType := vehicleTypes[j%len(vehicleTypes)]
				
				payload := map[string]interface{}{
					"vehicle_type": vehicleType,
				}
				
				jsonData, _ := json.Marshal(payload)
				
				req, _ := http.NewRequest("POST", lt.config.BaseURL+"/api/vehicles/purchase", bytes.NewBuffer(jsonData))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Authorization", "Bearer "+token)
				
				resp, err := lt.client.Do(req)
				
				duration := time.Since(reqStart)
				
				if err != nil {
					errors <- err
				} else {
					resp.Body.Close()
					if resp.StatusCode == 201 || resp.StatusCode == 409 { // 409 = already owned
						results <- duration
					} else {
						errors <- fmt.Errorf("HTTP %d", resp.StatusCode)
					}
				}
			}
		}(i)
	}
	
	wg.Wait()
	close(results)
	close(errors)
	
	return lt.calculateResults(results, errors, startTime)
}

// Helper methods

func (lt *LoadTester) createTestUsers() {
	fmt.Println("Creating test users...")
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		payload := map[string]interface{}{
			"username": fmt.Sprintf("loadtest_user_%d", i),
			"email":    fmt.Sprintf("loadtest_%d@example.com", i),
			"password": "testpassword123",
		}
		
		jsonData, _ := json.Marshal(payload)
		
		resp, err := lt.client.Post(
			lt.config.BaseURL+"/api/auth/register",
			"application/json",
			bytes.NewBuffer(jsonData),
		)
		
		if err == nil {
			resp.Body.Close()
		}
	}
}

func (lt *LoadTester) getAuthTokens() []string {
	fmt.Println("Getting auth tokens...")
	
	tokens := make([]string, 0, lt.config.ConcurrentUsers)
	
	for i := 0; i < lt.config.ConcurrentUsers; i++ {
		payload := map[string]interface{}{
			"username": fmt.Sprintf("loadtest_user_%d", i),
			"password": "testpassword123",
		}
		
		jsonData, _ := json.Marshal(payload)
		
		resp, err := lt.client.Post(
			lt.config.BaseURL+"/api/auth/login",
			"application/json",
			bytes.NewBuffer(jsonData),
		)
		
		if err == nil && resp.StatusCode == 200 {
			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)
			
			if token, ok := result["token"].(string); ok {
				tokens = append(tokens, token)
			}
			
			resp.Body.Close()
		}
	}
	
	return tokens
}

func (lt *LoadTester) createGameSessions(tokens []string) []string {
	fmt.Println("Creating game sessions...")
	
	sessionIDs := make([]string, 0, len(tokens))
	
	for _, token := range tokens {
		payload := map[string]interface{}{
			"level_id": "level_1",
			"vehicle_type": "sedan",
		}
		
		jsonData, _ := json.Marshal(payload)
		
		req, _ := http.NewRequest("POST", lt.config.BaseURL+"/api/game/session", bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		
		resp, err := lt.client.Do(req)
		
		if err == nil && resp.StatusCode == 201 {
			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)
			
			if sessionID, ok := result["session_id"].(string); ok {
				sessionIDs = append(sessionIDs, sessionID)
			}
			
			resp.Body.Close()
		}
	}
	
	return sessionIDs
}

func (lt *LoadTester) calculateResults(results chan time.Duration, errors chan error, startTime time.Time) TestResult {
	var responseTimes []time.Duration
	var errorCount int
	
	// Collect results
	for duration := range results {
		responseTimes = append(responseTimes, duration)
	}
	
	// Count errors
	for range errors {
		errorCount++
	}
	
	if len(responseTimes) == 0 {
		return TestResult{
			TotalRequests:  errorCount,
			FailedReqs:     errorCount,
			RequestsPerSec: 0,
		}
	}
	
	// Calculate statistics
	var total time.Duration
	min := responseTimes[0]
	max := responseTimes[0]
	
	for _, duration := range responseTimes {
		total += duration
		if duration < min {
			min = duration
		}
		if duration > max {
			max = duration
		}
	}
	
	average := total / time.Duration(len(responseTimes))
	totalTime := time.Since(startTime)
	requestsPerSec := float64(len(responseTimes)) / totalTime.Seconds()
	
	return TestResult{
		TotalRequests:   len(responseTimes) + errorCount,
		SuccessfulReqs:  len(responseTimes),
		FailedReqs:      errorCount,
		AverageResponse: average,
		MaxResponse:     max,
		MinResponse:     min,
		RequestsPerSec:  requestsPerSec,
	}
}

// RunAllTests runs all load test scenarios
func (lt *LoadTester) RunAllTests() {
	fmt.Printf("Starting load tests with %d concurrent users, %d requests per user\n", 
		lt.config.ConcurrentUsers, lt.config.RequestsPerUser)
	fmt.Printf("Target URL: %s\n\n", lt.config.BaseURL)
	
	tests := []struct {
		name string
		test func() TestResult
	}{
		{"Player Registration", lt.TestPlayerRegistration},
		{"Player Login", lt.TestPlayerLogin},
		{"Game Session Creation", lt.TestGameSessionCreation},
		{"Score Submission", lt.TestScoreSubmission},
		{"Vehicle Purchase", lt.TestVehiclePurchase},
	}
	
	for _, test := range tests {
		fmt.Printf("=== %s ===\n", test.name)
		result := test.test()
		lt.printResults(result)
		fmt.Println()
		
		// Wait between tests
		time.Sleep(2 * time.Second)
	}
}

func (lt *LoadTester) printResults(result TestResult) {
	fmt.Printf("Total Requests: %d\n", result.TotalRequests)
	fmt.Printf("Successful: %d\n", result.SuccessfulReqs)
	fmt.Printf("Failed: %d\n", result.FailedReqs)
	fmt.Printf("Success Rate: %.2f%%\n", float64(result.SuccessfulReqs)/float64(result.TotalRequests)*100)
	fmt.Printf("Average Response Time: %v\n", result.AverageResponse)
	fmt.Printf("Min Response Time: %v\n", result.MinResponse)
	fmt.Printf("Max Response Time: %v\n", result.MaxResponse)
	fmt.Printf("Requests/Second: %.2f\n", result.RequestsPerSec)
}

func main() {
	config := LoadTestConfig{
		BaseURL:         "http://localhost:8080",
		ConcurrentUsers: 50,
		TestDuration:    5 * time.Minute,
		RequestsPerUser: 10,
	}
	
	loadTester := NewLoadTester(config)
	loadTester.RunAllTests()
}