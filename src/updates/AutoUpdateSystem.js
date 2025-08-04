/**
 * Auto-Update System
 * Handles automatic game updates and patch distribution
 */

class AutoUpdateSystem {
    constructor() {
        this.updateServerUrl = 'https://updates.zombiecargame.com';
        this.currentVersion = this.getCurrentVersion();
        this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.isElectron = this.isElectronApp();
        this.updateInProgress = false;
        this.lastUpdateCheck = null;
        
        this.initializeSystem();
    }

    async initializeSystem() {
        try {
            console.log('Initializing auto-update system...');
            
            // Load update preferences
            this.loadUpdatePreferences();
            
            // Set up periodic update checks
            this.setupPeriodicChecks();
            
            // Check for updates on startup (if enabled)
            if (this.shouldCheckOnStartup()) {
                setTimeout(() => this.checkForUpdates(), 5000); // Delay 5 seconds after startup
            }
            
            console.log('Auto-update system initialized');
        } catch (error) {
            console.error('Failed to initialize auto-update system:', error);
        }
    }

    loadUpdatePreferences() {
        const preferences = localStorage.getItem('update_preferences');
        if (preferences) {
            this.preferences = JSON.parse(preferences);
        } else {
            // Default preferences
            this.preferences = {
                autoCheck: true,
                autoDownload: true,
                autoInstall: false, // Require user confirmation
                checkOnStartup: true,
                includePrerelease: false,
                notifyAvailable: true
            };
            this.saveUpdatePreferences();
        }
    }

    saveUpdatePreferences() {
        localStorage.setItem('update_preferences', JSON.stringify(this.preferences));
    }

    setupPeriodicChecks() {
        if (this.preferences.autoCheck) {
            setInterval(() => {
                this.checkForUpdates(false); // Silent check
            }, this.updateCheckInterval);
        }
    }

    shouldCheckOnStartup() {
        if (!this.preferences.checkOnStartup) return false;
        
        const lastCheck = localStorage.getItem('last_update_check');
        if (!lastCheck) return true;
        
        const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
        return timeSinceLastCheck > this.updateCheckInterval;
    }

    async checkForUpdates(showUI = true) {
        if (this.updateInProgress) {
            console.log('Update check already in progress');
            return null;
        }

        try {
            console.log('Checking for updates...');
            this.lastUpdateCheck = Date.now();
            localStorage.setItem('last_update_check', this.lastUpdateCheck.toString());

            const updateInfo = await this.fetchUpdateInfo();
            
            if (updateInfo && this.isNewerVersion(updateInfo.version)) {
                console.log(`Update available: ${updateInfo.version}`);
                
                if (showUI && this.preferences.notifyAvailable) {
                    this.showUpdateNotification(updateInfo);
                }
                
                if (this.preferences.autoDownload) {
                    await this.downloadUpdate(updateInfo);
                }
                
                return updateInfo;
            } else {
                console.log('No updates available');
                if (showUI) {
                    this.showNoUpdatesMessage();
                }
                return null;
            }
        } catch (error) {
            console.error('Failed to check for updates:', error);
            if (showUI) {
                this.showUpdateError('Failed to check for updates');
            }
            return null;
        }
    }

    async fetchUpdateInfo() {
        const response = await fetch(`${this.updateServerUrl}/api/updates/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_version: this.currentVersion,
                platform: this.getPlatform(),
                arch: this.getArchitecture(),
                include_prerelease: this.preferences.includePrerelease,
                client_id: this.getClientId()
            })
        });

        if (!response.ok) {
            throw new Error(`Update check failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.update_available ? data.update_info : null;
    }

    isNewerVersion(remoteVersion) {
        return this.compareVersions(remoteVersion, this.currentVersion) > 0;
    }

    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }

    showUpdateNotification(updateInfo) {
        const notification = document.createElement('div');
        notification.className = 'update-notification';
        notification.innerHTML = `
            <div class="update-notification-content">
                <div class="update-icon">🔄</div>
                <div class="update-text">
                    <h3>Update Available</h3>
                    <p>Version ${updateInfo.version} is now available</p>
                    <div class="update-details">
                        <p><strong>Release Date:</strong> ${new Date(updateInfo.release_date).toLocaleDateString()}</p>
                        <p><strong>Size:</strong> ${this.formatFileSize(updateInfo.download_size)}</p>
                        ${updateInfo.critical ? '<p class="critical-update">⚠️ Critical Security Update</p>' : ''}
                    </div>
                </div>
                <div class="update-actions">
                    <button id="update-download" class="update-btn primary">Download</button>
                    <button id="update-later" class="update-btn secondary">Later</button>
                    <button id="update-details" class="update-btn tertiary">Details</button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Set up event listeners
        document.getElementById('update-download').onclick = () => {
            this.downloadUpdate(updateInfo);
            document.body.removeChild(notification);
        };

        document.getElementById('update-later').onclick = () => {
            document.body.removeChild(notification);
        };

        document.getElementById('update-details').onclick = () => {
            this.showUpdateDetails(updateInfo);
        };

        // Auto-hide after 30 seconds unless it's critical
        if (!updateInfo.critical) {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 30000);
        }
    }

    showUpdateDetails(updateInfo) {
        const modal = document.createElement('div');
        modal.className = 'update-details-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Update Details - Version ${updateInfo.version}</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="update-info">
                            <p><strong>Release Date:</strong> ${new Date(updateInfo.release_date).toLocaleDateString()}</p>
                            <p><strong>Download Size:</strong> ${this.formatFileSize(updateInfo.download_size)}</p>
                            <p><strong>Type:</strong> ${updateInfo.update_type || 'Regular Update'}</p>
                            ${updateInfo.critical ? '<p class="critical-update">⚠️ Critical Security Update - Recommended to install immediately</p>' : ''}
                        </div>
                        
                        <div class="changelog">
                            <h3>What's New</h3>
                            <div class="changelog-content">
                                ${this.formatChangelog(updateInfo.changelog)}
                            </div>
                        </div>
                        
                        ${updateInfo.known_issues ? `
                            <div class="known-issues">
                                <h3>Known Issues</h3>
                                <ul>
                                    ${updateInfo.known_issues.map(issue => `<li>${issue}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button id="modal-download" class="update-btn primary">Download Update</button>
                        <button id="modal-cancel" class="update-btn secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').onclick = () => document.body.removeChild(modal);
        modal.querySelector('.modal-overlay').onclick = (e) => {
            if (e.target === modal.querySelector('.modal-overlay')) {
                document.body.removeChild(modal);
            }
        };
        
        document.getElementById('modal-download').onclick = () => {
            this.downloadUpdate(updateInfo);
            document.body.removeChild(modal);
        };
        
        document.getElementById('modal-cancel').onclick = () => {
            document.body.removeChild(modal);
        };
    }

    formatChangelog(changelog) {
        if (typeof changelog === 'string') {
            return `<p>${changelog}</p>`;
        }
        
        if (Array.isArray(changelog)) {
            return `<ul>${changelog.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
        
        if (typeof changelog === 'object') {
            let html = '';
            for (const [category, items] of Object.entries(changelog)) {
                html += `<h4>${category}</h4><ul>`;
                if (Array.isArray(items)) {
                    html += items.map(item => `<li>${item}</li>`).join('');
                } else {
                    html += `<li>${items}</li>`;
                }
                html += '</ul>';
            }
            return html;
        }
        
        return '<p>No changelog available</p>';
    }

    async downloadUpdate(updateInfo) {
        if (this.updateInProgress) {
            console.log('Update already in progress');
            return;
        }

        this.updateInProgress = true;
        
        try {
            console.log(`Downloading update ${updateInfo.version}...`);
            
            // Show download progress
            const progressModal = this.showDownloadProgress(updateInfo);
            
            if (this.isElectron) {
                // Use Electron's auto-updater
                await this.downloadUpdateElectron(updateInfo, progressModal);
            } else {
                // Web-based update (service worker cache update)
                await this.downloadUpdateWeb(updateInfo, progressModal);
            }
            
        } catch (error) {
            console.error('Failed to download update:', error);
            this.showUpdateError('Failed to download update');
        } finally {
            this.updateInProgress = false;
        }
    }

    showDownloadProgress(updateInfo) {
        const modal = document.createElement('div');
        modal.className = 'download-progress-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Downloading Update ${updateInfo.version}</h2>
                    </div>
                    <div class="modal-body">
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill"></div>
                            </div>
                            <div class="progress-text">
                                <span id="progress-percent">0%</span>
                                <span id="progress-speed"></span>
                            </div>
                        </div>
                        <div class="download-info">
                            <p>Size: ${this.formatFileSize(updateInfo.download_size)}</p>
                            <p id="download-status">Preparing download...</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="download-cancel" class="update-btn secondary">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('download-cancel').onclick = () => {
            this.cancelUpdate();
            document.body.removeChild(modal);
        };

        return {
            updateProgress: (percent, speed = null) => {
                const fill = document.getElementById('progress-fill');
                const percentText = document.getElementById('progress-percent');
                const speedText = document.getElementById('progress-speed');
                
                if (fill) fill.style.width = `${percent}%`;
                if (percentText) percentText.textContent = `${Math.round(percent)}%`;
                if (speedText && speed) speedText.textContent = speed;
            },
            updateStatus: (status) => {
                const statusElement = document.getElementById('download-status');
                if (statusElement) statusElement.textContent = status;
            },
            close: () => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }
        };
    }

    async downloadUpdateElectron(updateInfo, progressModal) {
        // This would integrate with Electron's autoUpdater
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            const result = await window.electronAPI.downloadUpdate(updateInfo.download_url, {
                onProgress: (progress) => {
                    progressModal.updateProgress(progress.percent, this.formatSpeed(progress.bytesPerSecond));
                    progressModal.updateStatus(`Downloaded ${this.formatFileSize(progress.transferred)} of ${this.formatFileSize(progress.total)}`);
                }
            });

            progressModal.close();

            if (result.success) {
                this.showInstallPrompt(updateInfo);
            } else {
                throw new Error(result.error);
            }
        } else {
            throw new Error('Electron auto-updater not available');
        }
    }

    async downloadUpdateWeb(updateInfo, progressModal) {
        // For web version, update service worker cache
        if ('serviceWorker' in navigator) {
            progressModal.updateStatus('Updating application cache...');
            
            const registration = await navigator.serviceWorker.ready;
            
            // Send message to service worker to update cache
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                const { type, data } = event.data;
                
                if (type === 'UPDATE_PROGRESS') {
                    progressModal.updateProgress(data.percent);
                    progressModal.updateStatus(data.status);
                } else if (type === 'UPDATE_COMPLETE') {
                    progressModal.close();
                    this.showRestartPrompt(updateInfo);
                } else if (type === 'UPDATE_ERROR') {
                    progressModal.close();
                    throw new Error(data.error);
                }
            };
            
            registration.active.postMessage({
                type: 'UPDATE_CACHE',
                updateInfo: updateInfo
            }, [messageChannel.port2]);
        } else {
            throw new Error('Service Worker not supported');
        }
    }

    showInstallPrompt(updateInfo) {
        const modal = document.createElement('div');
        modal.className = 'install-prompt-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Update Ready to Install</h2>
                    </div>
                    <div class="modal-body">
                        <p>Version ${updateInfo.version} has been downloaded and is ready to install.</p>
                        <p>The application will restart to complete the installation.</p>
                        ${updateInfo.critical ? '<p class="critical-update">⚠️ This is a critical security update</p>' : ''}
                    </div>
                    <div class="modal-footer">
                        <button id="install-now" class="update-btn primary">Install Now</button>
                        <button id="install-later" class="update-btn secondary">Install Later</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('install-now').onclick = () => {
            this.installUpdate(updateInfo);
        };

        document.getElementById('install-later').onclick = () => {
            document.body.removeChild(modal);
            // Schedule reminder
            this.scheduleInstallReminder(updateInfo);
        };
    }

    showRestartPrompt(updateInfo) {
        const modal = document.createElement('div');
        modal.className = 'restart-prompt-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Update Complete</h2>
                    </div>
                    <div class="modal-body">
                        <p>Version ${updateInfo.version} has been installed successfully.</p>
                        <p>Please restart the application to use the new version.</p>
                    </div>
                    <div class="modal-footer">
                        <button id="restart-now" class="update-btn primary">Restart Now</button>
                        <button id="restart-later" class="update-btn secondary">Restart Later</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('restart-now').onclick = () => {
            this.restartApplication();
        };

        document.getElementById('restart-later').onclick = () => {
            document.body.removeChild(modal);
        };
    }

    async installUpdate(updateInfo) {
        if (this.isElectron && window.electronAPI && window.electronAPI.installUpdate) {
            await window.electronAPI.installUpdate();
        } else {
            // For web version, just reload
            window.location.reload();
        }
    }

    restartApplication() {
        if (this.isElectron && window.electronAPI && window.electronAPI.restartApp) {
            window.electronAPI.restartApp();
        } else {
            window.location.reload();
        }
    }

    scheduleInstallReminder(updateInfo) {
        // Remind user after 4 hours
        setTimeout(() => {
            if (this.isNewerVersion(updateInfo.version)) {
                this.showInstallPrompt(updateInfo);
            }
        }, 4 * 60 * 60 * 1000);
    }

    cancelUpdate() {
        this.updateInProgress = false;
        console.log('Update cancelled by user');
    }

    showNoUpdatesMessage() {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.className = 'update-toast';
        toast.textContent = 'You have the latest version';
        document.body.appendChild(toast);

        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }

    showUpdateError(message) {
        const toast = document.createElement('div');
        toast.className = 'update-toast error';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 5000);
    }

    // Utility methods
    getCurrentVersion() {
        return window.GAME_VERSION || '1.0.0';
    }

    isElectronApp() {
        return window.electronAPI !== undefined;
    }

    getPlatform() {
        if (this.isElectron) {
            return window.electronAPI.platform || process.platform;
        }
        return 'web';
    }

    getArchitecture() {
        if (this.isElectron) {
            return window.electronAPI.arch || process.arch;
        }
        return 'web';
    }

    getClientId() {
        let clientId = localStorage.getItem('client_id');
        if (!clientId) {
            clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('client_id', clientId);
        }
        return clientId;
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatSpeed(bytesPerSecond) {
        return this.formatFileSize(bytesPerSecond) + '/s';
    }

    // Public API
    async manualUpdateCheck() {
        return await this.checkForUpdates(true);
    }

    setUpdatePreferences(preferences) {
        this.preferences = { ...this.preferences, ...preferences };
        this.saveUpdatePreferences();
    }

    getUpdatePreferences() {
        return { ...this.preferences };
    }
}

// CSS for update UI
const updateCSS = `
.update-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #2a2a2a;
    color: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
}

.update-notification-content {
    display: flex;
    align-items: flex-start;
    gap: 15px;
}

.update-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.update-text h3 {
    margin: 0 0 5px 0;
    color: #ff6b35;
}

.update-text p {
    margin: 5px 0;
}

.update-details {
    font-size: 14px;
    color: #ccc;
    margin-top: 10px;
}

.critical-update {
    color: #ff4444 !important;
    font-weight: bold;
}

.update-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
}

.update-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

.update-btn.primary {
    background: #ff6b35;
    color: white;
}

.update-btn.primary:hover {
    background: #e55a2b;
}

.update-btn.secondary {
    background: #666;
    color: white;
}

.update-btn.secondary:hover {
    background: #555;
}

.update-btn.tertiary {
    background: transparent;
    color: #ccc;
    border: 1px solid #666;
}

.update-btn.tertiary:hover {
    background: #333;
}

.update-details-modal,
.download-progress-modal,
.install-prompt-modal,
.restart-prompt-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10001;
}

.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: #2a2a2a;
    color: white;
    border-radius: 10px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    margin: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
    padding: 20px 20px 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h2 {
    margin: 0;
    color: #ff6b35;
}

.modal-close {
    background: none;
    border: none;
    color: #ccc;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    color: white;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    padding: 0 20px 20px 20px;
    display: flex;
    gap: 15px;
    justify-content: center;
}

.progress-container {
    margin: 20px 0;
}

.progress-bar {
    width: 100%;
    height: 20px;
    background: #444;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b35, #ff8c5a);
    width: 0%;
    transition: width 0.3s ease;
}

.progress-text {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #ccc;
}

.download-info {
    margin-top: 20px;
    font-size: 14px;
    color: #ccc;
}

.changelog-content {
    max-height: 200px;
    overflow-y: auto;
    background: #333;
    padding: 15px;
    border-radius: 5px;
    margin-top: 10px;
}

.known-issues {
    margin-top: 20px;
}

.known-issues ul {
    background: #333;
    padding: 15px;
    border-radius: 5px;
    margin-top: 10px;
}

.update-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2a2a2a;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideUp 0.3s ease-out;
}

.update-toast.error {
    background: #ff4444;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = updateCSS;
document.head.appendChild(style);

export default AutoUpdateSystem;