# Error Handling and Stability System

This comprehensive error handling system provides robust error management, crash recovery, performance monitoring, and stability features for the Zombie Car Game.

## Features

### 🛡️ Comprehensive Error Handling
- **Global Error Capture**: Automatically catches JavaScript errors, unhandled promise rejections, and WebGL context loss
- **Custom Error Types**: Specialized error classes for different types of failures
- **Error Recovery**: Automatic recovery strategies for common error scenarios
- **Error Reporting**: Batched error reporting to backend services with privacy controls

### 🔄 Crash Recovery System
- **Automatic State Saving**: Periodic auto-save of game state
- **Crash Detection**: Monitors for crashes and system instability
- **Recovery UI**: User-friendly recovery options after crashes
- **State Restoration**: Restores game state from saved data

### ⚡ Performance Monitoring
- **Real-time FPS Monitoring**: Tracks frame rate and performance metrics
- **Automatic Quality Adjustment**: Dynamically adjusts graphics quality based on performance
- **Memory Pressure Detection**: Monitors memory usage and triggers cleanup
- **Device Capability Detection**: Automatically detects device capabilities and sets appropriate quality levels

### 🌐 Network Error Handling
- **Retry Logic**: Exponential backoff retry for failed network requests
- **Offline Support**: Queues requests when offline and processes when back online
- **Request Caching**: Caches GET requests to improve performance
- **Connection Monitoring**: Tracks network status and connectivity

### 📦 Robust Asset Loading
- **Fallback Assets**: Provides fallback textures and models when loading fails
- **Multiple Format Support**: Tries different asset formats on failure
- **Asset Caching**: LRU cache for loaded assets
- **Progressive Loading**: Loads assets with retry logic and error recovery

## Quick Start

### 1. Initialize the Error Handling System

```javascript
import { setupErrorHandling } from './error/index.js';

// Initialize with default settings
const errorHandling = setupErrorHandling({
    targetFPS: 30,
    criticalFPS: 15,
    errorEndpoint: '/api/v1/errors',
    privacyMode: false
});
```

### 2. Register Game System Providers

```javascript
import { createGameSystemProvider } from './error/index.js';

// Create a game state provider for crash recovery
const gameStateProvider = createGameSystemProvider(
    'gameState',
    // Basic state (for heartbeat)
    () => ({
        level: getCurrentLevel(),
        score: getCurrentScore(),
        health: getPlayerHealth()
    }),
    // Full state (for crash recovery)
    () => ({
        level: getCurrentLevel(),
        score: getCurrentScore(),
        health: getPlayerHealth(),
        position: getPlayerPosition(),
        inventory: getPlayerInventory()
    }),
    // Restore state
    async (state) => {
        await setCurrentLevel(state.level);
        await setCurrentScore(state.score);
        await setPlayerHealth(state.health);
        if (state.position) await setPlayerPosition(state.position);
        if (state.inventory) await setPlayerInventory(state.inventory);
    }
);

errorHandling.registerGameSystemProvider('gameState', gameStateProvider);
```

### 3. Handle Errors

```javascript
import { handleError, GameError, AssetLoadingError } from './error/index.js';

try {
    // Your game code here
    await loadGameAssets();
} catch (error) {
    // Handle the error through the system
    await handleError(error, {
        source: 'asset_loader',
        context: 'game_initialization'
    });
}
```

### 4. Use Error-Safe Wrappers

```javascript
import { withErrorHandling } from './error/index.js';

// Wrap your game loop with error handling
const safeGameLoop = withErrorHandling(async function gameLoop() {
    updatePhysics();
    updateAI();
    renderFrame();
}, { source: 'game_loop' });

// Use the wrapped function
safeGameLoop();
```

## System Components

### ErrorHandler
The main error handling system that captures, processes, and attempts recovery from errors.

**Key Features:**
- Global error capture
- Recovery strategies
- Error classification
- Critical error handling

### NetworkErrorHandler
Handles network-related errors with retry logic and offline support.

**Key Features:**
- Exponential backoff retry
- Offline request queuing
- Request caching
- Connection monitoring

### PerformanceDegradationHandler
Monitors performance and automatically adjusts quality settings.

**Key Features:**
- Real-time FPS monitoring
- Automatic quality adjustment
- Memory pressure detection
- Device capability detection

### RobustAssetLoader
Enhanced asset loading with comprehensive error handling and fallbacks.

**Key Features:**
- Fallback assets
- Multiple format support
- Asset caching
- Retry logic

### CrashRecoverySystem
Handles game crashes and provides recovery mechanisms.

**Key Features:**
- Automatic state saving
- Crash detection
- Recovery UI
- State restoration

### ErrorReportingSystem
Collects and reports errors to backend services.

**Key Features:**
- Batched error reporting
- Privacy controls
- Error aggregation
- User feedback collection

## Error Types

### GameError
Base error class for game-related errors.

```javascript
throw new GameError('Something went wrong', { context: 'additional info' });
```

### CriticalGameError
For critical errors that may require game restart.

```javascript
throw new CriticalGameError('WebGL context lost', { severity: 'high' });
```

### AssetLoadingError
For asset loading failures.

```javascript
throw new AssetLoadingError('Failed to load texture', {
    assetType: 'texture',
    assetUrl: '/textures/zombie.jpg',
    isCritical: false
});
```

### NetworkError
For network-related errors.

```javascript
throw new NetworkError('API request failed', {
    status: 500,
    endpoint: '/api/v1/save-game'
});
```

### PerformanceError
For performance-related issues.

```javascript
throw new PerformanceError('Low FPS detected', {
    currentFPS: 15,
    targetFPS: 30
});
```

## Configuration Options

### Error Handler Options
```javascript
{
    enableReporting: true,
    enableRecovery: true,
    maxErrorHistory: 100,
    reportingEndpoint: '/api/v1/errors'
}
```

### Network Handler Options
```javascript
{
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    timeoutMs: 10000
}
```

### Performance Handler Options
```javascript
{
    targetFPS: 30,
    criticalFPS: 15,
    enableAutoAdjustment: true,
    monitoringInterval: 1000
}
```

### Asset Loader Options
```javascript
{
    maxRetries: 3,
    enableFallbacks: true,
    enableCaching: true,
    cacheSize: 100
}
```

### Crash Recovery Options
```javascript
{
    autoSaveInterval: 30000,
    enableHeartbeat: true,
    maxRecoveryAttempts: 3
}
```

### Error Reporting Options
```javascript
{
    endpoint: '/api/v1/errors',
    batchSize: 10,
    enableLocalStorage: true,
    enableUserFeedback: true,
    privacyMode: false
}
```

## Quality Levels

The performance handler supports multiple quality levels:

- **Ultra**: Maximum quality settings
- **High**: High quality with good performance
- **Medium**: Balanced quality and performance
- **Low**: Lower quality for better performance
- **Potato**: Minimum quality for low-end devices

Quality levels automatically adjust based on:
- Frame rate performance
- Memory usage
- Device capabilities
- User preferences

## API Reference

### Global Functions

#### `setupErrorHandling(options)`
Quick setup function with sensible defaults.

#### `initializeErrorHandling(options)`
Initialize the error handling system with custom options.

#### `getErrorHandling()`
Get the global error handling instance.

#### `handleError(error, context)`
Handle an error through the system.

#### `createGameSystemProvider(name, getBasicState, getFullState, restoreState, validateState)`
Create a game system provider for crash recovery.

### Utility Functions

#### `withErrorHandling(fn, context)`
Wrap an async function with error handling.

#### `withEventErrorHandling(eventHandler, context)`
Wrap an event handler with error handling.

#### `withPerformanceMonitoring(fn, name)`
Wrap a function with performance monitoring.

## Best Practices

### 1. Initialize Early
Initialize the error handling system as early as possible in your application lifecycle.

### 2. Register System Providers
Register all critical game systems with state providers for crash recovery.

### 3. Use Appropriate Error Types
Use specific error types (AssetLoadingError, NetworkError, etc.) instead of generic Error objects.

### 4. Provide Context
Always provide meaningful context when handling errors.

### 5. Monitor Performance
Regularly check performance metrics and adjust quality settings as needed.

### 6. Test Error Scenarios
Test your error handling by simulating various failure conditions.

### 7. Handle Graceful Degradation
Design your systems to degrade gracefully when errors occur.

## Debugging

### Error Statistics
```javascript
const errorHandling = getErrorHandling();
const stats = errorHandling.getErrorStats();
console.log('Error statistics:', stats);
```

### Performance Metrics
```javascript
const metrics = errorHandling.getPerformanceMetrics();
console.log('Performance metrics:', metrics);
```

### Network Status
```javascript
const networkClient = errorHandling.getNetworkClient('/api');
const status = networkClient.getNetworkStatus();
console.log('Network status:', status);
```

### Asset Loading Stats
```javascript
const assetLoader = errorHandling.getAssetLoader();
const stats = assetLoader.getStats();
console.log('Asset loading stats:', stats);
```

## Testing

The error handling system includes comprehensive unit tests covering:

- Error handling and recovery
- Network error scenarios
- Performance monitoring
- Asset loading failures
- Crash recovery mechanisms
- Error reporting functionality

Run tests with:
```bash
npm test -- --testPathPattern="error"
```

## Integration with Game Systems

The error handling system is designed to integrate seamlessly with existing game systems:

- **Asset Loading**: Wrap asset loading calls with error handling
- **Network Requests**: Use the robust network client for API calls
- **Game Loop**: Wrap the main game loop with error handling
- **Event Handlers**: Use error-safe event handlers
- **State Management**: Register state providers for crash recovery

See `ErrorHandlingExample.js` for detailed integration examples.

## Browser Compatibility

The error handling system is compatible with modern browsers that support:
- ES6+ features
- Fetch API
- Web Audio API
- WebGL
- Local Storage
- Performance API

For older browsers, consider using appropriate polyfills.

## Performance Impact

The error handling system is designed to have minimal performance impact:
- Lazy initialization of components
- Efficient error batching
- Optimized monitoring intervals
- Smart caching strategies
- Minimal memory footprint

## Security Considerations

- **Privacy Mode**: Sanitizes sensitive data in error reports
- **Data Validation**: Validates all error data before processing
- **Rate Limiting**: Prevents error report spam
- **Secure Transmission**: Uses HTTPS for error reporting
- **Local Storage**: Encrypts sensitive data in local storage

## Contributing

When contributing to the error handling system:

1. Follow the existing code style and patterns
2. Add comprehensive unit tests for new features
3. Update documentation for API changes
4. Consider performance implications
5. Test with various error scenarios
6. Ensure browser compatibility

## License

This error handling system is part of the Zombie Car Game project and follows the same license terms.