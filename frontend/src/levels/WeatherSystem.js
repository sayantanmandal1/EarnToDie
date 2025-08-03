/**
 * Weather System
 * 
 * Manages dynamic weather conditions and time-of-day cycles for the terrain system.
 * Provides realistic weather transitions and environmental effects.
 */

class WeatherSystem {
    constructor(options = {}) {
        this.options = {
            dayDuration: options.dayDuration || 300000, // 5 minutes per day
            weatherTransitionTime: options.weatherTransitionTime || 30000, // 30 seconds
            enableDynamicWeather: options.enableDynamicWeather !== false,
            enableTimeOfDay: options.enableTimeOfDay !== false,
            ...options
        };
        
        // Time tracking
        this.currentTime = 0; // Time in milliseconds
        this.timeScale = 1.0; // Time multiplier
        
        // Weather states
        this.currentWeather = 'clear';
        this.targetWeather = 'clear';
        this.weatherTransitionProgress = 1.0;
        this.weatherChangeTimer = 0;
        this.weatherChangeCooldown = 60000; // 1 minute between weather changes
        
        // Weather definitions
        this.weatherTypes = new Map();
        this.initializeWeatherTypes();
        
        // Time of day phases
        this.timePhases = {
            dawn: { start: 0.2, end: 0.3 },      // 20-30% of day
            morning: { start: 0.3, end: 0.45 },  // 30-45% of day
            noon: { start: 0.45, end: 0.55 },    // 45-55% of day
            afternoon: { start: 0.55, end: 0.7 }, // 55-70% of day
            dusk: { start: 0.7, end: 0.8 },      // 70-80% of day
            night: { start: 0.8, end: 1.0 },     // 80-100% of day
            midnight: { start: 0.0, end: 0.2 }   // 0-20% of day
        };
        
        // Environmental effects
        this.environmentalEffects = {
            windSpeed: 0,
            windDirection: 0,
            temperature: 20, // Celsius
            humidity: 50,    // Percentage
            visibility: 1.0, // 0-1 scale
            precipitation: 0 // 0-1 scale
        };
        
        console.log('🌤️ Weather System initialized');
    }
    
    initializeWeatherTypes() {
        // Clear Weather
        this.weatherTypes.set('clear', {
            name: 'Clear',
            duration: { min: 120000, max: 300000 }, // 2-5 minutes
            transitionWeight: 0.4,
            effects: {
                windSpeed: { min: 0, max: 5 },
                temperature: { min: 15, max: 25 },
                humidity: { min: 30, max: 60 },
                visibility: { min: 0.9, max: 1.0 },
                precipitation: { min: 0, max: 0 }
            },
            visualEffects: {
                skyColor: '#87CEEB',
                cloudCover: 0.1,
                sunIntensity: 1.0,
                fogDensity: 0.0
            },
            audioEffects: ['wind_light', 'birds'],
            biomeModifiers: {
                city: { pollution: 0.2 },
                desert: { heatHaze: 0.3 },
                forest: { ambientLight: 0.8 },
                industrial: { smog: 0.1 }
            }
        });
        
        // Cloudy Weather
        this.weatherTypes.set('cloudy', {
            name: 'Cloudy',
            duration: { min: 180000, max: 360000 }, // 3-6 minutes
            transitionWeight: 0.3,
            effects: {
                windSpeed: { min: 3, max: 8 },
                temperature: { min: 12, max: 20 },
                humidity: { min: 50, max: 80 },
                visibility: { min: 0.7, max: 0.9 },
                precipitation: { min: 0, max: 0.1 }
            },
            visualEffects: {
                skyColor: '#708090',
                cloudCover: 0.7,
                sunIntensity: 0.6,
                fogDensity: 0.1
            },
            audioEffects: ['wind_medium', 'distant_thunder'],
            biomeModifiers: {
                city: { pollution: 0.4 },
                desert: { sandstorm: 0.1 },
                forest: { ambientLight: 0.6 },
                industrial: { smog: 0.3 }
            }
        });
        
        // Rainy Weather
        this.weatherTypes.set('rain', {
            name: 'Rain',
            duration: { min: 90000, max: 240000 }, // 1.5-4 minutes
            transitionWeight: 0.2,
            effects: {
                windSpeed: { min: 5, max: 15 },
                temperature: { min: 8, max: 15 },
                humidity: { min: 80, max: 95 },
                visibility: { min: 0.4, max: 0.7 },
                precipitation: { min: 0.3, max: 0.8 }
            },
            visualEffects: {
                skyColor: '#2F4F4F',
                cloudCover: 0.9,
                sunIntensity: 0.3,
                fogDensity: 0.3,
                rainIntensity: 0.6
            },
            audioEffects: ['rain_medium', 'thunder', 'wind_strong'],
            biomeModifiers: {
                city: { flooding: 0.2, pollution: 0.1 },
                desert: { mudSlide: 0.1 },
                forest: { ambientLight: 0.4, growth: 1.2 },
                industrial: { acidRain: 0.3 }
            }
        });
        
        // Storm Weather
        this.weatherTypes.set('storm', {
            name: 'Storm',
            duration: { min: 60000, max: 180000 }, // 1-3 minutes
            transitionWeight: 0.05,
            effects: {
                windSpeed: { min: 15, max: 30 },
                temperature: { min: 5, max: 12 },
                humidity: { min: 85, max: 100 },
                visibility: { min: 0.2, max: 0.5 },
                precipitation: { min: 0.7, max: 1.0 }
            },
            visualEffects: {
                skyColor: '#191970',
                cloudCover: 1.0,
                sunIntensity: 0.1,
                fogDensity: 0.5,
                rainIntensity: 1.0,
                lightning: true
            },
            audioEffects: ['rain_heavy', 'thunder_loud', 'wind_howling'],
            biomeModifiers: {
                city: { flooding: 0.6, powerOutage: 0.3 },
                desert: { flashFlood: 0.4 },
                forest: { ambientLight: 0.2, treeFall: 0.1 },
                industrial: { acidRain: 0.8, structuralDamage: 0.2 }
            }
        });
        
        // Fog Weather
        this.weatherTypes.set('fog', {
            name: 'Fog',
            duration: { min: 120000, max: 300000 }, // 2-5 minutes
            transitionWeight: 0.15,
            effects: {
                windSpeed: { min: 0, max: 3 },
                temperature: { min: 10, max: 18 },
                humidity: { min: 90, max: 100 },
                visibility: { min: 0.1, max: 0.4 },
                precipitation: { min: 0, max: 0.2 }
            },
            visualEffects: {
                skyColor: '#D3D3D3',
                cloudCover: 0.8,
                sunIntensity: 0.4,
                fogDensity: 0.8
            },
            audioEffects: ['fog_ambient', 'muffled_sounds'],
            biomeModifiers: {
                city: { pollution: 0.6, visibility: 0.2 },
                desert: { rare: true },
                forest: { ambientLight: 0.3, mystery: 1.5 },
                industrial: { toxicFog: 0.5 }
            }
        });
        
        // Sandstorm (Desert specific)
        this.weatherTypes.set('sandstorm', {
            name: 'Sandstorm',
            duration: { min: 90000, max: 240000 }, // 1.5-4 minutes
            transitionWeight: 0.1,
            biomeRestriction: ['desert'],
            effects: {
                windSpeed: { min: 20, max: 40 },
                temperature: { min: 25, max: 40 },
                humidity: { min: 5, max: 20 },
                visibility: { min: 0.05, max: 0.3 },
                precipitation: { min: 0, max: 0 }
            },
            visualEffects: {
                skyColor: '#DEB887',
                cloudCover: 0.9,
                sunIntensity: 0.2,
                sandParticles: 1.0,
                dustDensity: 0.9
            },
            audioEffects: ['sandstorm_howl', 'sand_particles'],
            biomeModifiers: {
                desert: { erosion: 0.8, heatDamage: 0.4 }
            }
        });
    }
    
    update(deltaTime) {
        if (!this.options.enableDynamicWeather && !this.options.enableTimeOfDay) {
            return;
        }
        
        // Update time
        if (this.options.enableTimeOfDay) {
            this.currentTime += deltaTime * this.timeScale;
            if (this.currentTime >= this.options.dayDuration) {
                this.currentTime -= this.options.dayDuration;
            }
        }
        
        // Update weather
        if (this.options.enableDynamicWeather) {
            this.updateWeather(deltaTime);
        }
        
        // Update environmental effects
        this.updateEnvironmentalEffects(deltaTime);
    }
    
    updateWeather(deltaTime) {
        // Update weather change timer
        this.weatherChangeTimer += deltaTime;
        
        // Check for weather transition
        if (this.weatherTransitionProgress < 1.0) {
            this.weatherTransitionProgress += deltaTime / this.options.weatherTransitionTime;
            this.weatherTransitionProgress = Math.min(1.0, this.weatherTransitionProgress);
            
            // Interpolate weather effects during transition
            this.interpolateWeatherEffects();
        }
        
        // Check if it's time to change weather
        if (this.weatherTransitionProgress >= 1.0 && 
            this.weatherChangeTimer >= this.weatherChangeCooldown) {
            
            const currentWeatherData = this.weatherTypes.get(this.currentWeather);
            const weatherDuration = this.getRandomInRange(
                currentWeatherData.duration.min,
                currentWeatherData.duration.max
            );
            
            if (this.weatherChangeTimer >= weatherDuration) {
                this.initiateWeatherChange();
            }
        }
    }
    
    initiateWeatherChange() {
        const newWeather = this.selectNextWeather();
        
        if (newWeather !== this.currentWeather) {
            console.log(`🌤️ Weather changing from ${this.currentWeather} to ${newWeather}`);
            
            this.targetWeather = newWeather;
            this.weatherTransitionProgress = 0.0;
            this.weatherChangeTimer = 0;
        }
    }
    
    selectNextWeather() {
        const availableWeathers = [];
        const weights = [];
        
        // Get time of day influence
        const timeOfDay = this.getTimeOfDay();
        const timeInfluence = this.getTimeWeatherInfluence(timeOfDay);
        
        for (const [weatherType, weatherData] of this.weatherTypes) {
            // Skip current weather to ensure change
            if (weatherType === this.currentWeather) continue;
            
            // Check biome restrictions (would need biome context)
            if (weatherData.biomeRestriction) {
                // For now, skip biome-restricted weather
                continue;
            }
            
            let weight = weatherData.transitionWeight;
            
            // Apply time of day influence
            if (timeInfluence[weatherType]) {
                weight *= timeInfluence[weatherType];
            }
            
            // Apply seasonal influence (simplified)
            weight *= this.getSeasonalInfluence(weatherType);
            
            availableWeathers.push(weatherType);
            weights.push(weight);
        }
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return availableWeathers[i];
            }
        }
        
        return availableWeathers[0] || 'clear';
    }
    
    getTimeWeatherInfluence(timeOfDay) {
        const influences = {
            clear: 1.0,
            cloudy: 1.0,
            rain: 1.0,
            storm: 1.0,
            fog: 1.0,
            sandstorm: 1.0
        };
        
        switch (timeOfDay.phase) {
            case 'dawn':
                influences.fog *= 2.0;
                influences.clear *= 1.5;
                break;
            case 'morning':
                influences.clear *= 1.3;
                influences.fog *= 0.7;
                break;
            case 'noon':
                influences.clear *= 1.2;
                influences.storm *= 0.8;
                break;
            case 'afternoon':
                influences.storm *= 1.3;
                influences.rain *= 1.2;
                break;
            case 'dusk':
                influences.fog *= 1.5;
                influences.cloudy *= 1.2;
                break;
            case 'night':
                influences.fog *= 1.8;
                influences.storm *= 1.1;
                break;
            case 'midnight':
                influences.fog *= 1.5;
                influences.clear *= 0.8;
                break;
        }
        
        return influences;
    }
    
    getSeasonalInfluence(weatherType) {
        // Simplified seasonal system - could be expanded
        const dayOfYear = Math.floor((this.currentTime / this.options.dayDuration) % 365);
        const season = Math.floor(dayOfYear / 91.25); // 0=spring, 1=summer, 2=fall, 3=winter
        
        const seasonalModifiers = {
            0: { // Spring
                rain: 1.3,
                storm: 1.1,
                clear: 1.0,
                cloudy: 1.1,
                fog: 1.2
            },
            1: { // Summer
                clear: 1.4,
                storm: 1.2,
                rain: 0.8,
                fog: 0.7,
                sandstorm: 1.5
            },
            2: { // Fall
                cloudy: 1.3,
                rain: 1.2,
                fog: 1.4,
                storm: 1.0,
                clear: 0.9
            },
            3: { // Winter
                storm: 1.3,
                fog: 1.5,
                cloudy: 1.2,
                clear: 0.7,
                rain: 1.1
            }
        };
        
        return seasonalModifiers[season][weatherType] || 1.0;
    }
    
    interpolateWeatherEffects() {
        const currentData = this.weatherTypes.get(this.currentWeather);
        const targetData = this.weatherTypes.get(this.targetWeather);
        const progress = this.weatherTransitionProgress;
        
        // Interpolate environmental effects
        Object.keys(this.environmentalEffects).forEach(effect => {
            if (currentData.effects[effect] && targetData.effects[effect]) {
                const currentValue = this.getRandomInRange(
                    currentData.effects[effect].min,
                    currentData.effects[effect].max
                );
                const targetValue = this.getRandomInRange(
                    targetData.effects[effect].min,
                    targetData.effects[effect].max
                );
                
                this.environmentalEffects[effect] = this.lerp(
                    currentValue,
                    targetValue,
                    progress
                );
            }
        });
        
        // Complete transition when progress reaches 1.0
        if (progress >= 1.0) {
            this.currentWeather = this.targetWeather;
        }
    }
    
    updateEnvironmentalEffects(deltaTime) {
        const weatherData = this.weatherTypes.get(this.currentWeather);
        
        // Add some variation to environmental effects
        const variation = Math.sin(this.currentTime * 0.001) * 0.1;
        
        // Update wind direction (slowly rotating)
        this.environmentalEffects.windDirection += deltaTime * 0.0001;
        this.environmentalEffects.windDirection %= Math.PI * 2;
        
        // Add small random variations
        if (Math.random() < 0.01) { // 1% chance per frame
            this.environmentalEffects.windSpeed += (Math.random() - 0.5) * 2;
            this.environmentalEffects.windSpeed = Math.max(0, this.environmentalEffects.windSpeed);
            
            this.environmentalEffects.temperature += (Math.random() - 0.5) * 1;
            this.environmentalEffects.humidity += (Math.random() - 0.5) * 5;
            this.environmentalEffects.humidity = Math.max(0, Math.min(100, this.environmentalEffects.humidity));
        }
    }
    
    // Public API methods
    getCurrentWeather() {
        const weatherData = this.weatherTypes.get(this.currentWeather);
        
        return {
            type: this.currentWeather,
            name: weatherData.name,
            effects: { ...this.environmentalEffects },
            visualEffects: { ...weatherData.visualEffects },
            audioEffects: [...weatherData.audioEffects],
            transitionProgress: this.weatherTransitionProgress,
            isTransitioning: this.weatherTransitionProgress < 1.0,
            targetWeather: this.targetWeather
        };
    }
    
    getTimeOfDay() {
        const dayProgress = this.currentTime / this.options.dayDuration;
        const normalizedTime = dayProgress % 1.0;
        
        // Determine current phase
        let currentPhase = 'night';
        for (const [phase, range] of Object.entries(this.timePhases)) {
            if (normalizedTime >= range.start && normalizedTime < range.end) {
                currentPhase = phase;
                break;
            }
        }
        
        // Calculate sun position (0 = midnight, 0.5 = noon)
        const sunPosition = (normalizedTime + 0.5) % 1.0;
        const sunAngle = sunPosition * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        
        return {
            phase: currentPhase,
            dayProgress: normalizedTime,
            sunPosition: sunPosition,
            sunAngle: sunAngle,
            sunHeight: sunHeight,
            isDaytime: sunHeight > 0,
            lightIntensity: Math.max(0, sunHeight),
            ambientLight: Math.max(0.1, sunHeight * 0.8 + 0.2)
        };
    }
    
    setWeather(weatherType, immediate = false) {
        if (!this.weatherTypes.has(weatherType)) {
            console.warn(`Unknown weather type: ${weatherType}`);
            return false;
        }
        
        if (immediate) {
            this.currentWeather = weatherType;
            this.targetWeather = weatherType;
            this.weatherTransitionProgress = 1.0;
            this.weatherChangeTimer = 0;
        } else {
            this.targetWeather = weatherType;
            this.weatherTransitionProgress = 0.0;
        }
        
        console.log(`🌤️ Weather set to ${weatherType} (immediate: ${immediate})`);
        return true;
    }
    
    setTimeOfDay(timeProgress) {
        this.currentTime = timeProgress * this.options.dayDuration;
        console.log(`🕐 Time set to ${(timeProgress * 100).toFixed(1)}% of day`);
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0, scale);
        console.log(`🕐 Time scale set to ${scale}x`);
    }
    
    // Weather influence on gameplay
    getVisibilityModifier() {
        return this.environmentalEffects.visibility;
    }
    
    getMovementModifier() {
        // Wind and precipitation affect movement
        const windEffect = Math.min(1.0, this.environmentalEffects.windSpeed / 20);
        const precipitationEffect = this.environmentalEffects.precipitation;
        
        return 1.0 - (windEffect * 0.2 + precipitationEffect * 0.3);
    }
    
    getAudioModifier() {
        // Weather affects audio propagation
        const fogEffect = this.getCurrentWeather().visualEffects.fogDensity || 0;
        const precipitationEffect = this.environmentalEffects.precipitation;
        
        return {
            attenuation: 1.0 + fogEffect * 0.5 + precipitationEffect * 0.3,
            muffling: fogEffect * 0.4 + precipitationEffect * 0.2
        };
    }
    
    // Utility methods
    getRandomInRange(min, max) {
        return min + Math.random() * (max - min);
    }
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    // Statistics and debugging
    getStatistics() {
        return {
            currentWeather: this.currentWeather,
            targetWeather: this.targetWeather,
            transitionProgress: this.weatherTransitionProgress,
            weatherChangeTimer: this.weatherChangeTimer,
            currentTime: this.currentTime,
            dayProgress: (this.currentTime / this.options.dayDuration) % 1.0,
            timeScale: this.timeScale,
            environmentalEffects: { ...this.environmentalEffects }
        };
    }
    
    getAvailableWeatherTypes() {
        return Array.from(this.weatherTypes.keys());
    }
    
    getWeatherData(weatherType) {
        return this.weatherTypes.get(weatherType);
    }
}

export default WeatherSystem;