// Simple test to verify the main error fixes
const { SaveManager } = require('./src/save/SaveManager');
const { UpgradeManager } = require('./src/upgrades/UpgradeManager');
const { ErrorHandler } = require('./src/error/ErrorHandler');

console.log('Testing fixes...');

// Test ErrorHandler
try {
    const errorHandler = new ErrorHandler({ enableReporting: false });
    console.log('✅ ErrorHandler instantiated successfully');
} catch (error) {
    console.log('❌ ErrorHandler failed:', error.message);
}

// Test SaveManager with mock API client
try {
    const mockApiClient = {
        request: async () => { throw new Error('Mock error'); },
        get: async () => { throw new Error('Mock error'); },
        post: async () => { throw new Error('Mock error'); }
    };
    
    const saveManager = new SaveManager(mockApiClient);
    console.log('✅ SaveManager instantiated successfully');
} catch (error) {
    console.log('❌ SaveManager failed:', error.message);
}

// Test UpgradeManager with mock dependencies
try {
    const mockGameEngine = {};
    const mockApiClient = {
        get: async () => { throw new Error('Mock error'); }
    };
    
    const upgradeManager = new UpgradeManager(mockGameEngine, mockApiClient);
    console.log('✅ UpgradeManager instantiated successfully');
} catch (error) {
    console.log('❌ UpgradeManager failed:', error.message);
}

console.log('Fix verification complete!');