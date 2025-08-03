/**
 * Dynamic Events System
 * Manages scripted sequences, environmental events, and interactive story moments
 */

export class DynamicEventsSystem {
    constructor(gameEngine, audioManager, options = {}) {
        this.gameEngine = gameEngine;
        this.audioManager = audioManager;
        
        this.options = {
            maxConcurrentEvents: 5,
            eventCheckInterval: 1000,
            enableScriptedSequences: true,
            enableEnvironmentalEvents: true,
            enableInteractiveEvents: true,
            eventIntensityMultiplier: 1.0,
            ...options
        };

        // Event tracking
        this.activeEvents = new Map();
        this.scheduledEvents = [];
        this.triggeredEvents = new Set();
        this.eventHistory = [];
        
        // Event conditions
        this.conditionEvaluators = new Map();
        this.globalConditions = new Map();
        
        // Performance tracking
        this.performanceMetrics = {
            eventsTriggered: 0,
            eventsCompleted: 0,
            averageEventDuration: 0,
            totalProcessingTime: 0
        };

        this.updateTimer = null;
        this.isInitialized = false;

        this.initializeConditionEvaluators();
    }

    /**
     * Initialize condition evaluators
     */
    initializeConditionEvaluators() {
        // Time-based conditions
        this.conditionEvaluators.set('time_of_day', (condition, gameState) => {
            const currentTime = gameState.timeOfDay || 'day';
            return condition.value === currentTime;
        });

        this.conditionEvaluators.set('elapsed_time', (condition, gameState) => {
            const elapsed = gameState.elapsedTime || 0;
            return elapsed >= condition.value;
        });

        // Location-based conditions
        this.conditionEvaluators.set('player_position', (condition, gameState) => {
            const playerPos = gameState.playerPosition || { x: 0, y: 0, z: 0 };
            const targetPos = condition.position;
            const distance = Math.sqrt(
                Math.pow(playerPos.x - targetPos.x, 2) +
                Math.pow(playerPos.y - targetPos.y, 2) +
                Math.pow(playerPos.z - targetPos.z, 2)
            );
            return distance <= (condition.radius || 50);
        });

        this.conditionEvaluators.set('area_type', (condition, gameState) => {
            return gameState.currentArea === condition.value;
        });

        // Game state conditions
        this.conditionEvaluators.set('zombie_count', (condition, gameState) => {
            const count = gameState.zombieCount || 0;
            return this.evaluateNumericCondition(count, condition);
        });

        this.conditionEvaluators.set('player_health', (condition, gameState) => {
            const health = gameState.playerHealth || 100;
            return this.evaluateNumericCondition(health, condition);
        });

        this.conditionEvaluators.set('vehicle_condition', (condition, gameState) => {
            const vehicleHealth = gameState.vehicleHealth || 100;
            return this.evaluateNumericCondition(vehicleHealth, condition);
        });

        // Progress conditions
        this.conditionEvaluators.set('objectives_completed', (condition, gameState) => {
            const completed = gameState.objectivesCompleted || 0;
            return this.evaluateNumericCondition(completed, condition);
        });

        this.conditionEvaluators.set('collectibles_found', (condition, gameState) => {
            const found = gameState.collectiblesFound || 0;
            return this.evaluateNumericCondition(found, condition);
        });

        // Environmental conditions
        this.conditionEvaluators.set('weather', (condition, gameState) => {
            return gameState.weather === condition.value;
        });

        this.conditionEvaluators.set('temperature', (condition, gameState) => {
            const temp = gameState.temperature || 20;
            return this.evaluateNumericCondition(temp, condition);
        });

        // Random conditions
        this.conditionEvaluators.set('random_chance', (condition, gameState) => {
            return Math.random() < (condition.probability || 0.5);
        });

        // Custom conditions
        this.conditionEvaluators.set('custom', (condition, gameState) => {
            if (typeof condition.evaluator === 'function') {
                return condition.evaluator(gameState);
            }
            return false;
        });
    }

    /**
     * Initialize the dynamic events system
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            this.startUpdateLoop();
            this.isInitialized = true;
            
            console.log('Dynamic Events System initialized');
        } catch (error) {
            console.error('Failed to initialize Dynamic Events System:', error);
            throw error;
        }
    }

    /**
     * Start the update loop
     */
    startUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.updateEvents();
        }, this.options.eventCheckInterval);
    }

    /**
     * Stop the update loop
     */
    stopUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Schedule an event
     */
    scheduleEvent(eventData) {
        const event = this.createEventInstance(eventData);
        
        if (event.trigger_type === 'immediate') {
            this.triggerEvent(event);
        } else {
            this.scheduledEvents.push(event);
            this.scheduledEvents.sort((a, b) => a.scheduled_time - b.scheduled_time);
        }

        return event.id;
    }

    /**
     * Create event instance
     */
    createEventInstance(eventData) {
        const event = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: eventData.type || 'scripted',
            trigger_type: eventData.trigger_type || 'condition_based',
            
            // Timing
            scheduled_time: eventData.scheduled_time || 0,
            duration: eventData.duration || 30000,
            start_time: null,
            
            // Conditions
            trigger_conditions: eventData.trigger_conditions || [],
            end_conditions: eventData.end_conditions || [],
            
            // Content
            sequence: eventData.sequence || [],
            effects: eventData.effects || {},
            
            // State
            isActive: false,
            currentStep: 0,
            stepStartTime: null,
            
            // Metadata
            emotional_impact: eventData.emotional_impact || 0.5,
            lore_unlock: eventData.lore_unlock || null,
            consequences: eventData.consequences || {},
            
            // Callbacks
            onStart: eventData.onStart || null,
            onStep: eventData.onStep || null,
            onComplete: eventData.onComplete || null,
            onCancel: eventData.onCancel || null
        };

        return event;
    }

    /**
     * Update events
     */
    updateEvents() {
        const currentTime = Date.now();
        const gameState = this.getGameState();

        // Check scheduled events
        this.checkScheduledEvents(currentTime, gameState);

        // Update active events
        this.updateActiveEvents(currentTime, gameState);

        // Clean up completed events
        this.cleanupCompletedEvents();
    }

    /**
     * Check scheduled events for triggering
     */
    checkScheduledEvents(currentTime, gameState) {
        const eventsToTrigger = [];

        this.scheduledEvents.forEach((event, index) => {
            if (this.shouldTriggerEvent(event, currentTime, gameState)) {
                eventsToTrigger.push({ event, index });
            }
        });

        // Trigger events and remove from scheduled list
        eventsToTrigger.reverse().forEach(({ event, index }) => {
            this.triggerEvent(event);
            this.scheduledEvents.splice(index, 1);
        });
    }

    /**
     * Check if event should be triggered
     */
    shouldTriggerEvent(event, currentTime, gameState) {
        // Check if already triggered
        if (this.triggeredEvents.has(event.id)) {
            return false;
        }

        // Check time-based trigger
        if (event.trigger_type === 'time_based' && currentTime < event.scheduled_time) {
            return false;
        }

        // Check condition-based trigger
        if (event.trigger_type === 'condition_based') {
            return this.evaluateConditions(event.trigger_conditions, gameState);
        }

        // Check location-based trigger
        if (event.trigger_type === 'location_based') {
            return this.evaluateLocationTrigger(event, gameState);
        }

        return true;
    }

    /**
     * Evaluate conditions
     */
    evaluateConditions(conditions, gameState) {
        if (!conditions || conditions.length === 0) return true;

        return conditions.every(condition => {
            const evaluator = this.conditionEvaluators.get(condition.type);
            if (!evaluator) {
                console.warn(`Unknown condition type: ${condition.type}`);
                return false;
            }
            return evaluator(condition, gameState);
        });
    }

    /**
     * Evaluate numeric condition
     */
    evaluateNumericCondition(value, condition) {
        switch (condition.operator || 'equals') {
            case 'equals':
                return value === condition.value;
            case 'greater_than':
                return value > condition.value;
            case 'less_than':
                return value < condition.value;
            case 'greater_equal':
                return value >= condition.value;
            case 'less_equal':
                return value <= condition.value;
            case 'between':
                return value >= condition.min && value <= condition.max;
            default:
                return false;
        }
    }

    /**
     * Evaluate location trigger
     */
    evaluateLocationTrigger(event, gameState) {
        if (!event.trigger_position || !gameState.playerPosition) return false;

        const distance = this.calculateDistance(
            gameState.playerPosition,
            event.trigger_position
        );

        return distance <= (event.trigger_radius || 50);
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
    }

    /**
     * Trigger an event
     */
    triggerEvent(event) {
        if (this.activeEvents.size >= this.options.maxConcurrentEvents) {
            console.warn(`Cannot trigger event ${event.id}: max concurrent events reached`);
            return false;
        }

        try {
            event.isActive = true;
            event.start_time = Date.now();
            event.currentStep = 0;
            event.stepStartTime = Date.now();

            this.activeEvents.set(event.id, event);
            this.triggeredEvents.add(event.id);

            // Execute start callback
            if (event.onStart) {
                event.onStart(event);
            }

            // Start first step
            this.executeEventStep(event);

            // Update metrics
            this.performanceMetrics.eventsTriggered++;

            console.log(`Triggered event: ${event.id} (${event.type})`);
            return true;

        } catch (error) {
            console.error(`Failed to trigger event ${event.id}:`, error);
            return false;
        }
    }

    /**
     * Update active events
     */
    updateActiveEvents(currentTime, gameState) {
        this.activeEvents.forEach((event, eventId) => {
            try {
                // Check for event completion
                if (this.shouldCompleteEvent(event, currentTime, gameState)) {
                    this.completeEvent(event);
                    return;
                }

                // Update current step
                this.updateEventStep(event, currentTime, gameState);

            } catch (error) {
                console.error(`Error updating event ${eventId}:`, error);
                this.cancelEvent(event);
            }
        });
    }

    /**
     * Check if event should complete
     */
    shouldCompleteEvent(event, currentTime, gameState) {
        // Check duration
        if (event.duration > 0 && currentTime - event.start_time >= event.duration) {
            return true;
        }

        // Check end conditions
        if (event.end_conditions.length > 0) {
            return this.evaluateConditions(event.end_conditions, gameState);
        }

        // Check if all steps completed
        return event.currentStep >= event.sequence.length;
    }

    /**
     * Update event step
     */
    updateEventStep(event, currentTime, gameState) {
        if (event.currentStep >= event.sequence.length) return;

        const currentStepData = event.sequence[event.currentStep];
        const stepElapsed = currentTime - event.stepStartTime;

        // Check if it's time to execute this step
        if (stepElapsed >= (currentStepData.time || 0)) {
            this.executeEventStep(event);
        }
    }

    /**
     * Execute event step
     */
    executeEventStep(event) {
        if (event.currentStep >= event.sequence.length) return;

        const step = event.sequence[event.currentStep];
        
        try {
            this.executeStepAction(step, event);

            // Execute step callback
            if (event.onStep) {
                event.onStep(event, step, event.currentStep);
            }

            // Move to next step
            event.currentStep++;
            event.stepStartTime = Date.now();

        } catch (error) {
            console.error(`Failed to execute step ${event.currentStep} of event ${event.id}:`, error);
        }
    }

    /**
     * Execute step action
     */
    executeStepAction(step, event) {
        const action = step.action;
        const params = step.params || {};

        switch (action) {
            case 'play_audio':
                this.executeAudioAction(params, event);
                break;
            case 'spawn_object':
                this.executeSpawnAction(params, event);
                break;
            case 'modify_environment':
                this.executeEnvironmentAction(params, event);
                break;
            case 'show_message':
                this.executeMessageAction(params, event);
                break;
            case 'trigger_effect':
                this.executeEffectAction(params, event);
                break;
            case 'modify_game_state':
                this.executeGameStateAction(params, event);
                break;
            case 'wait':
                // Wait actions are handled by timing
                break;
            default:
                console.warn(`Unknown step action: ${action}`);
        }
    }

    /**
     * Execute audio action
     */
    executeAudioAction(params, event) {
        if (!this.audioManager) return;

        const audioConfig = {
            volume: params.volume || 0.5,
            loop: params.loop || false,
            fadeIn: params.fadeIn || 0,
            spatial: params.spatial || false,
            position: params.position || event.position
        };

        if (params.file) {
            this.audioManager.playSound(params.file, audioConfig);
        } else if (params.files && params.files.length > 0) {
            const randomFile = params.files[Math.floor(Math.random() * params.files.length)];
            this.audioManager.playSound(randomFile, audioConfig);
        }
    }

    /**
     * Execute spawn action
     */
    executeSpawnAction(params, event) {
        if (!this.gameEngine || !this.gameEngine.spawnObject) return;

        const spawnConfig = {
            type: params.type,
            position: params.position || event.position,
            properties: params.properties || {},
            temporary: params.temporary || false,
            duration: params.duration || 0
        };

        this.gameEngine.spawnObject(spawnConfig);
    }

    /**
     * Execute environment action
     */
    executeEnvironmentAction(params, event) {
        if (!this.gameEngine || !this.gameEngine.modifyEnvironment) return;

        this.gameEngine.modifyEnvironment(params);
    }

    /**
     * Execute message action
     */
    executeMessageAction(params, event) {
        if (!this.gameEngine || !this.gameEngine.showMessage) return;

        const messageConfig = {
            text: params.text,
            duration: params.duration || 5000,
            type: params.type || 'info',
            position: params.position || 'center'
        };

        this.gameEngine.showMessage(messageConfig);
    }

    /**
     * Execute effect action
     */
    executeEffectAction(params, event) {
        if (!this.gameEngine || !this.gameEngine.triggerEffect) return;

        this.gameEngine.triggerEffect(params);
    }

    /**
     * Execute game state action
     */
    executeGameStateAction(params, event) {
        if (!this.gameEngine || !this.gameEngine.modifyGameState) return;

        this.gameEngine.modifyGameState(params);
    }

    /**
     * Complete an event
     */
    completeEvent(event) {
        try {
            // Execute completion callback
            if (event.onComplete) {
                event.onComplete(event);
            }

            // Apply consequences
            this.applyEventConsequences(event);

            // Unlock lore if specified
            if (event.lore_unlock) {
                this.unlockLore(event.lore_unlock);
            }

            // Add to history
            this.eventHistory.push({
                id: event.id,
                type: event.type,
                completed_at: Date.now(),
                duration: Date.now() - event.start_time,
                emotional_impact: event.emotional_impact
            });

            // Update metrics
            this.performanceMetrics.eventsCompleted++;
            const duration = Date.now() - event.start_time;
            this.performanceMetrics.averageEventDuration = 
                (this.performanceMetrics.averageEventDuration + duration) / 2;

            this.activeEvents.delete(event.id);
            console.log(`Completed event: ${event.id}`);

        } catch (error) {
            console.error(`Error completing event ${event.id}:`, error);
        }
    }

    /**
     * Cancel an event
     */
    cancelEvent(event) {
        try {
            // Execute cancellation callback
            if (event.onCancel) {
                event.onCancel(event);
            }

            this.activeEvents.delete(event.id);
            console.log(`Cancelled event: ${event.id}`);

        } catch (error) {
            console.error(`Error cancelling event ${event.id}:`, error);
        }
    }

    /**
     * Apply event consequences
     */
    applyEventConsequences(event) {
        if (!event.consequences || Object.keys(event.consequences).length === 0) return;

        Object.keys(event.consequences).forEach(consequenceType => {
            const value = event.consequences[consequenceType];
            
            switch (consequenceType) {
                case 'zombie_attraction':
                    this.attractZombies(value);
                    break;
                case 'resource_gain':
                    this.grantResources(value);
                    break;
                case 'environment_change':
                    this.changeEnvironment(value);
                    break;
                case 'unlock_area':
                    this.unlockArea(value);
                    break;
                default:
                    console.warn(`Unknown consequence type: ${consequenceType}`);
            }
        });
    }

    /**
     * Attract zombies (consequence)
     */
    attractZombies(intensity) {
        if (this.gameEngine && this.gameEngine.attractZombies) {
            this.gameEngine.attractZombies(intensity);
        }
    }

    /**
     * Grant resources (consequence)
     */
    grantResources(resources) {
        if (this.gameEngine && this.gameEngine.grantResources) {
            this.gameEngine.grantResources(resources);
        }
    }

    /**
     * Change environment (consequence)
     */
    changeEnvironment(changes) {
        if (this.gameEngine && this.gameEngine.changeEnvironment) {
            this.gameEngine.changeEnvironment(changes);
        }
    }

    /**
     * Unlock area (consequence)
     */
    unlockArea(areaId) {
        if (this.gameEngine && this.gameEngine.unlockArea) {
            this.gameEngine.unlockArea(areaId);
        }
    }

    /**
     * Unlock lore
     */
    unlockLore(loreId) {
        if (this.gameEngine && this.gameEngine.unlockLore) {
            this.gameEngine.unlockLore(loreId);
        }
    }

    /**
     * Clean up completed events
     */
    cleanupCompletedEvents() {
        // Remove old events from history to prevent memory leaks
        const maxHistorySize = 100;
        if (this.eventHistory.length > maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-maxHistorySize);
        }
    }

    /**
     * Get game state
     */
    getGameState() {
        if (this.gameEngine && this.gameEngine.getGameState) {
            return this.gameEngine.getGameState();
        }
        
        // Return default state if no game engine
        return {
            playerPosition: { x: 0, y: 0, z: 0 },
            playerHealth: 100,
            vehicleHealth: 100,
            zombieCount: 0,
            timeOfDay: 'day',
            weather: 'clear',
            elapsedTime: 0,
            objectivesCompleted: 0,
            collectiblesFound: 0,
            currentArea: 'unknown'
        };
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Get event history
     */
    getEventHistory() {
        return [...this.eventHistory];
    }

    /**
     * Get active events
     */
    getActiveEvents() {
        return Array.from(this.activeEvents.values());
    }

    /**
     * Cancel all events
     */
    cancelAllEvents() {
        const activeEventIds = Array.from(this.activeEvents.keys());
        activeEventIds.forEach(id => {
            const event = this.activeEvents.get(id);
            this.cancelEvent(event);
        });
        
        this.scheduledEvents.length = 0;
    }

    /**
     * Dispose of the system
     */
    dispose() {
        this.stopUpdateLoop();
        this.cancelAllEvents();
        this.isInitialized = false;
        
        console.log('Dynamic Events System disposed');
    }
}

export default DynamicEventsSystem;