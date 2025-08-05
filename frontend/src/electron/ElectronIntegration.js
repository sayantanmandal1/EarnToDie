/**
 * Real Electron Integration - NO MOCKS
 * Professional desktop application integration
 */

class ElectronIntegration {
    constructor() {
        this.isElectron = typeof window !== 'undefined' && window.process && window.process.type;
        this.logger = this.createLogger();
    }

    createLogger() {
        return {
            info: (message, ...args) => console.info('[Electron]', message, ...args),
            warn: (message, ...args) => console.warn('[Electron]', message, ...args),
            error: (message, ...args) => console.error('[Electron]', message, ...args),
            debug: (message, ...args) => console.debug('[Electron]', message, ...args)
        };
    }

    getLogger() {
        return this.logger;
    }

    isElectronEnvironment() {
        return this.isElectron;
    }

    getAppVersion() {
        if (this.isElectron && window.electronAPI) {
            return window.electronAPI.getVersion();
        }
        return '1.0.0';
    }

    saveFile(data, filename) {
        if (this.isElectron && window.electronAPI) {
            return window.electronAPI.saveFile(data, filename);
        }
        // Fallback for web environment
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return Promise.resolve(true);
    }

    loadFile() {
        if (this.isElectron && window.electronAPI) {
            return window.electronAPI.loadFile();
        }
        // Fallback for web environment
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsText(file);
                } else {
                    resolve(null);
                }
            };
            input.click();
        });
    }
}

// Create singleton instance
export const electronIntegration = new ElectronIntegration();
export default ElectronIntegration;
