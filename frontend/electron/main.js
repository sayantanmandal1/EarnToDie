const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Import database manager for main process
let DatabaseManager;
try {
    DatabaseManager = require('../src/database/DatabaseManager.js').DatabaseManager;
} catch (error) {
    console.warn('Database manager not available in main process:', error.message);
}

// Keep a global reference of the window object
let mainWindow;

/**
 * Create the main application window
 */
function createMainWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        minWidth: 1280,
        minHeight: 720,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: !isDev
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        show: false, // Don't show until ready
        titleBarStyle: 'default',
        frame: true,
        resizable: true,
        maximizable: true,
        fullscreenable: true
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus on window
        if (isDev) {
            mainWindow.focus();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Prevent navigation to external URLs
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'http://localhost:3000' && !isDev) {
            event.preventDefault();
        }
    });

    return mainWindow;
}

/**
 * Create application menu
 */
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Game',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-game');
                    }
                },
                {
                    label: 'Save Game',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-game');
                    }
                },
                {
                    label: 'Load Game',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {
                        mainWindow.webContents.send('menu-load-game');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Game',
            submenu: [
                {
                    label: 'Pause/Resume',
                    accelerator: 'Space',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-pause');
                    }
                },
                {
                    label: 'Restart Level',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        mainWindow.webContents.send('menu-restart-level');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.webContents.send('menu-settings');
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Fullscreen',
                    accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11',
                    click: () => {
                        mainWindow.setFullScreen(!mainWindow.isFullScreen());
                    }
                },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-in');
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-out');
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.send('menu-reset-zoom');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Controls',
                    click: () => {
                        mainWindow.webContents.send('menu-show-controls');
                    }
                },
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Zombie Car Game',
                            message: 'Zombie Car Game',
                            detail: 'Professional zombie survival racing game\nVersion 1.0.0\n\nBuilt with Electron and Three.js'
                        });
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                {
                    label: 'About ' + app.getName(),
                    role: 'about'
                },
                { type: 'separator' },
                {
                    label: 'Services',
                    role: 'services',
                    submenu: []
                },
                { type: 'separator' },
                {
                    label: 'Hide ' + app.getName(),
                    accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Shift+H',
                    role: 'hideothers'
                },
                {
                    label: 'Show All',
                    role: 'unhide'
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Setup IPC handlers for communication with renderer process
 */
function setupIPC() {
    // Handle save game dialog
    ipcMain.handle('show-save-dialog', async () => {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Game',
            defaultPath: 'zombie-car-save.json',
            filters: [
                { name: 'Save Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        return result;
    });

    // Handle load game dialog
    ipcMain.handle('show-open-dialog', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Load Game',
            filters: [
                { name: 'Save Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });
        return result;
    });

    // Handle error reporting
    ipcMain.handle('report-error', async (event, errorData) => {
        console.error('Game Error:', errorData);
        
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: 'Game Error',
            message: 'An error occurred in the game',
            detail: errorData.message || 'Unknown error',
            buttons: ['OK', 'Restart Game', 'Report Bug']
        });

        return result.response;
    });

    // Handle performance warnings
    ipcMain.handle('performance-warning', async (event, warningData) => {
        const result = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Performance Warning',
            message: 'Game performance is below optimal',
            detail: warningData.message || 'Consider adjusting graphics settings',
            buttons: ['OK', 'Open Settings']
        });

        if (result.response === 1) {
            mainWindow.webContents.send('menu-settings');
        }
    });

    // Handle app info requests
    ipcMain.handle('get-app-info', () => {
        return {
            name: app.getName(),
            version: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            electronVersion: process.versions.electron,
            nodeVersion: process.versions.node,
            chromeVersion: process.versions.chrome
        };
    });

    // Database-related IPC handlers
    ipcMain.handle('database-backup', async () => {
        try {
            if (DatabaseManager) {
                const dbManager = new DatabaseManager();
                await dbManager.initialize();
                const backupPath = dbManager.createBackup();
                dbManager.close();
                return { success: true, backupPath };
            }
            return { success: false, error: 'Database not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-info', async () => {
        try {
            if (DatabaseManager) {
                const dbManager = new DatabaseManager();
                await dbManager.initialize();
                const info = dbManager.getDbInfo();
                dbManager.close();
                return { success: true, info };
            }
            return { success: false, error: 'Database not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-maintenance', async () => {
        try {
            if (DatabaseManager) {
                const dbManager = new DatabaseManager();
                await dbManager.initialize();
                dbManager.vacuum();
                dbManager.analyze();
                dbManager.close();
                return { success: true };
            }
            return { success: false, error: 'Database not available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
}

// App event handlers
app.whenReady().then(() => {
    createMainWindow();
    createMenu();
    setupIPC();

    // Handle app activation (macOS)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDev) {
        // In development, ignore certificate errors
        event.preventDefault();
        callback(true);
    } else {
        // In production, use default behavior
        callback(false);
    }
});

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== 'http://localhost:3000' && isDev) {
            return;
        }
        
        if (!isDev && !navigationUrl.startsWith('file://')) {
            event.preventDefault();
        }
    });
});

// Export for testing
module.exports = { createMainWindow, createMenu, setupIPC };