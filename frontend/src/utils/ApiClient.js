/**
 * Simple API Client with fallback data
 */

class ApiClient {
    constructor(baseURL = 'http://localhost:8080') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.warn(`API request failed for ${endpoint}:`, error.message);
            // Return fallback data for development
            return this.getFallbackData(endpoint);
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    getFallbackData(endpoint) {
        // Provide comprehensive fallback data when backend is not available
        console.log(`Using fallback data for: ${endpoint}`);
        
        if (endpoint.includes('/vehicles/available')) {
            return {
                data: {
                    vehicles: [
                        { 
                            id: 1, 
                            type: 'sedan', 
                            name: 'Sedan', 
                            price: 0, 
                            owned: true,
                            stats: { speed: 80, armor: 60, handling: 70 }
                        },
                        { 
                            id: 2, 
                            type: 'suv', 
                            name: 'SUV', 
                            price: 5000, 
                            owned: false,
                            stats: { speed: 70, armor: 80, handling: 60 }
                        },
                        { 
                            id: 3, 
                            type: 'truck', 
                            name: 'Truck', 
                            price: 10000, 
                            owned: false,
                            stats: { speed: 60, armor: 100, handling: 50 }
                        }
                    ]
                }
            };
        } else if (endpoint.includes('/vehicles') && !endpoint.includes('available')) {
            return { 
                data: { 
                    vehicles: [
                        { 
                            id: 1, 
                            type: 'sedan', 
                            name: 'Sedan', 
                            owned: true,
                            upgrades: { engine: 1, armor: 1, tires: 1 }
                        }
                    ] 
                } 
            };
        } else if (endpoint.includes('/player/profile')) {
            return {
                data: {
                    player: {
                        id: 1,
                        name: 'Player',
                        currency: 1000,
                        level: 1,
                        experience: 0,
                        stats: {
                            zombiesKilled: 0,
                            distanceTraveled: 0,
                            gamesPlayed: 0
                        }
                    }
                }
            };
        } else if (endpoint.includes('/player/save')) {
            return { 
                data: { 
                    save_data: {
                        player: {
                            currency: 1000,
                            level: 1,
                            experience: 0
                        },
                        vehicles: [],
                        levelProgress: {},
                        settings: {
                            graphics: 'medium',
                            audio: { master: 0.8, effects: 0.7, music: 0.6 }
                        }
                    }
                } 
            };
        } else if (endpoint.includes('/game/sessions')) {
            return { data: { session_id: 'offline-session-' + Date.now() } };
        }
        return { data: {} };
    }
}

export default ApiClient;