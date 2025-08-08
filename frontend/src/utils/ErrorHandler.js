/**
 * Error Handling System for Desert Survival Game
 * Provides graceful error handling and recovery mechanisms
 */

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.initialized = false;
  }
  
  /**
   * Initialize error handling system
   */
  initialize() {
    if (this.initialized) return;
    
    // Set up global error handlers
    this.setupGlobalHandlers();
    
    this.initialized = true;
    console.log('Error handling system initialized');
  }
  
  /**
   * Set up global error event handlers
   */
  setupGlobalHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error ? event.error.stack : null
      });
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason ? event.reason.message : 'Unhandled promise rejection',
        error: event.reason,
        stack: event.reason ? event.reason.stack : null
      });
    });
  }
  
  /**
   * Handle asset loading errors
   */
  static handleAssetLoadError(assetPath, error) {
    console.warn(`Failed to load asset: ${assetPath}`, error);
    
    // Return placeholder asset based on type
    return this.getPlaceholderAsset(assetPath);
  }
  
  /**
   * Get placeholder asset for failed loads
   */
  static getPlaceholderAsset(assetPath) {
    const extension = assetPath.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        // Return a simple colored rectangle as placeholder
        return this.createPlaceholderImage();
      
      case 'mp3':
      case 'wav':
      case 'ogg':
        // Return silent audio buffer
        return this.createSilentAudio();
      
      default:
        console.warn(`No placeholder available for asset type: ${extension}`);
        return null;
    }
  }
  
  /**
   * Create placeholder image
   */
  static createPlaceholderImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, 100, 100);
    
    ctx.fillStyle = '#d4a574';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MISSING', 50, 45);
    ctx.fillText('ASSET', 50, 60);
    
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }
  
  /**
   * Create silent audio buffer
   */
  static createSilentAudio() {
    // Return a promise that resolves to a silent audio buffer
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      resolve(buffer);
    });
  }
  
  /**
   * Handle physics simulation errors
   */
  static handlePhysicsError(error) {
    console.error('Physics simulation error:', error);
    
    // Check if error is critical
    if (error.critical || error.message.includes('world') || error.message.includes('engine')) {
      console.warn('Critical physics error detected, attempting reset...');
      return { shouldReset: true, error };
    }
    
    return { shouldReset: false, error };
  }
  
  /**
   * Handle save system errors
   */
  static handleSaveError(error) {
    console.error('Save system error:', error);
    
    // Try backup save location
    try {
      const backupKey = 'zombieCarGameSave_backup';
      const data = localStorage.getItem(backupKey);
      
      if (data) {
        console.log('Attempting to restore from backup save...');
        localStorage.setItem('zombieCarGameSave', data);
        return { recovered: true, source: 'backup' };
      }
    } catch (backupError) {
      console.error('Backup save also failed:', backupError);
    }
    
    // Show save error dialog
    this.showSaveErrorDialog();
    return { recovered: false };
  }
  
  /**
   * Handle performance issues
   */
  static handlePerformanceIssue(fps) {
    if (fps < 30) {
      console.warn(`Low FPS detected: ${fps}. Reducing quality...`);
      
      return {
        reduceParticles: true,
        lowerQuality: true,
        disableEffects: fps < 20,
        suggestions: [
          'Reduce particle count',
          'Lower rendering quality',
          'Disable visual effects',
          'Reduce zombie count'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Handle general errors
   */
  handleError(errorInfo) {
    // Add to error log
    this.addToLog(errorInfo);
    
    // Log to console
    console.error('Game Error:', errorInfo);
    
    // Determine error severity
    const severity = this.determineSeverity(errorInfo);
    
    // Handle based on severity
    switch (severity) {
      case 'critical':
        this.handleCriticalError(errorInfo);
        break;
      case 'warning':
        this.handleWarning(errorInfo);
        break;
      case 'info':
        this.handleInfo(errorInfo);
        break;
    }
  }
  
  /**
   * Add error to log
   */
  addToLog(errorInfo) {
    const logEntry = {
      timestamp: Date.now(),
      ...errorInfo
    };
    
    this.errorLog.push(logEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }
  
  /**
   * Determine error severity
   */
  determineSeverity(errorInfo) {
    const message = errorInfo.message ? errorInfo.message.toLowerCase() : '';
    
    // Critical errors that might crash the game
    if (message.includes('cannot read property') ||
        message.includes('is not a function') ||
        message.includes('physics') ||
        message.includes('engine') ||
        errorInfo.type === 'promise') {
      return 'critical';
    }
    
    // Warnings for recoverable issues
    if (message.includes('asset') ||
        message.includes('load') ||
        message.includes('network')) {
      return 'warning';
    }
    
    return 'info';
  }
  
  /**
   * Handle critical errors
   */
  handleCriticalError(errorInfo) {
    console.error('Critical error detected:', errorInfo);
    
    // Show error dialog to user
    this.showErrorDialog(
      'Critical Error',
      'A critical error occurred that may affect game stability.',
      'The game will attempt to recover automatically.'
    );
    
    // Attempt recovery after a short delay
    setTimeout(() => {
      this.attemptRecovery(errorInfo);
    }, 2000);
  }
  
  /**
   * Handle warning-level errors
   */
  handleWarning(errorInfo) {
    console.warn('Warning:', errorInfo);
    
    // For now, just log warnings
    // In the future, could show non-intrusive notifications
  }
  
  /**
   * Handle info-level errors
   */
  handleInfo(errorInfo) {
    console.info('Info:', errorInfo);
    // Just log for debugging purposes
  }
  
  /**
   * Attempt to recover from critical errors
   */
  attemptRecovery(errorInfo) {
    console.log('Attempting error recovery...');
    
    try {
      // Get the game instance
      const game = window.desertSurvivalGame;
      
      if (game && game.getEngine()) {
        const engine = game.getEngine();
        
        // Try to restart the game
        console.log('Restarting game engine...');
        engine.restart();
        
        this.showSuccessDialog(
          'Recovery Successful',
          'The game has been successfully restarted.'
        );
      } else {
        // If we can't restart, suggest page reload
        this.showErrorDialog(
          'Recovery Failed',
          'Unable to automatically recover from the error.',
          'Please refresh the page to continue playing.'
        );
      }
    } catch (recoveryError) {
      console.error('Recovery attempt failed:', recoveryError);
      
      this.showErrorDialog(
        'Recovery Failed',
        'Unable to automatically recover from the error.',
        'Please refresh the page to continue playing.'
      );
    }
  }
  
  /**
   * Show error dialog to user
   */
  showErrorDialog(title, message, suggestion) {
    this.showDialog(title, message, suggestion, '#8b4513');
  }
  
  /**
   * Show success dialog to user
   */
  showSuccessDialog(title, message) {
    this.showDialog(title, message, '', '#4a5d23');
  }
  
  /**
   * Show save error dialog
   */
  static showSaveErrorDialog() {
    const dialog = this.showDialog(
      'Save Error',
      'Unable to save your progress.',
      'Your progress may be lost when you close the game.',
      '#8b4513'
    );
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (dialog && dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 5000);
  }
  
  /**
   * Show generic dialog
   */
  static showDialog(title, message, suggestion, color = '#8b4513') {
    // Remove any existing dialogs
    const existingDialogs = document.querySelectorAll('.error-dialog');
    existingDialogs.forEach(dialog => dialog.remove());
    
    const dialog = document.createElement('div');
    dialog.className = 'error-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(45deg, #3a3a3a, #2a2a2a);
      color: #d4a574;
      padding: 30px;
      border: 3px solid ${color};
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 0 20px rgba(139, 69, 19, 0.5);
      max-width: 400px;
      min-width: 300px;
    `;
    
    dialog.innerHTML = `
      <h3 style="color: #ff8c42; margin-top: 0; margin-bottom: 20px;">${title}</h3>
      <p style="margin: 15px 0; line-height: 1.4;">${message}</p>
      ${suggestion ? `<p style="font-style: italic; color: #c49464; margin: 15px 0;">${suggestion}</p>` : ''}
      <button onclick="this.parentNode.remove()" style="
        background: linear-gradient(45deg, ${color}, #d4a574);
        color: white;
        border: none;
        padding: 10px 20px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        cursor: pointer;
        border-radius: 5px;
        margin-top: 20px;
      ">OK</button>
    `;
    
    document.body.appendChild(dialog);
    return dialog;
  }
  
  /**
   * Get error log
   */
  getErrorLog() {
    return [...this.errorLog];
  }
  
  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }
  
  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byType: {},
      bySeverity: {},
      recent: this.errorLog.slice(-10)
    };
    
    this.errorLog.forEach(error => {
      // Count by type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Count by severity
      const severity = this.determineSeverity(error);
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    });
    
    return stats;
  }
}

// Create global error handler instance
const errorHandler = new ErrorHandler();

export default ErrorHandler;
export { errorHandler };