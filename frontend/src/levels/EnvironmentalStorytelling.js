/**
 * Environmental Storytelling System
 * Creates immersive narrative experiences through environmental design,
 * atmospheric effects, dynamic events, and collectible lore elements
 */

export class EnvironmentalStorytelling {
    constructor(options = {}) {
        this.options = {
            enableNarrative: true,
            enableAtmosphere: true,
            enableEvents: true,
            enableCollectibles: true,
            narrativeIntensity: 0.7,
            atmosphereIntensity: 0.8,
            eventFrequency: 0.5,
            collectibleDensity: 0.3,
            ...options
        };

        // Core systems
        this.narrativeElements = new Map();
        this.atmosphericEffects = new Map();
        this.dynamicEvents = new Map();
        this.collectibles = new Map();
        this.loreDatabase = new Map();
        
        // State tracking
        this.activeNarratives = new Set();
        this.discoveredLore = new Set();
        this.triggeredEvents = new Set();
        this.atmosphereState = {
            tension: 0.5,
            mystery: 0.3,
            horror: 0.4,
            hope: 0.2
        };

        // Performance tracking
        this.performanceMetrics = {
            narrativeElementsActive: 0,
            atmosphericEffectsActive: 0,
            eventsTriggered: 0,
            collectiblesFound: 0,
            averageProcessingTime: 0
        };

        this.initializeStorytellingElements();
    }

    /**
     * Initialize all storytelling elements
     */
    initializeStorytellingElements() {
        this.initializeNarrativeElements();
        this.initializeAtmosphericEffects();
        this.initializeDynamicEvents();
        this.initializeCollectibles();
        this.initializeLoreDatabase();
    }

    /**
     * Initialize narrative elements
     */
    initializeNarrativeElements() {
        const narrativeTypes = {
            // Environmental storytelling through visual elements
            abandoned_vehicles: {
                type: 'visual',
                impact: 0.6,
                themes: ['desperation', 'evacuation', 'chaos'],
                variants: [
                    {
                        id: 'crashed_family_car',
                        description: 'A family sedan crashed into a barrier, doors left open, children\'s toys scattered nearby',
                        emotional_impact: 0.7,
                        lore_connection: 'evacuation_chaos'
                    },
                    {
                        id: 'overturned_bus',
                        description: 'A city bus lies on its side, windows shattered, emergency exit used',
                        emotional_impact: 0.8,
                        lore_connection: 'public_transport_failure'
                    },
                    {
                        id: 'military_convoy_remains',
                        description: 'Burned military vehicles in formation, suggesting organized resistance',
                        emotional_impact: 0.9,
                        lore_connection: 'military_response'
                    }
                ]
            },

            environmental_decay: {
                type: 'atmospheric',
                impact: 0.5,
                themes: ['time_passage', 'abandonment', 'nature_reclaiming'],
                variants: [
                    {
                        id: 'overgrown_buildings',
                        description: 'Vines and vegetation consuming abandoned structures',
                        emotional_impact: 0.4,
                        lore_connection: 'time_passage'
                    },
                    {
                        id: 'rusted_infrastructure',
                        description: 'Corroded bridges and signs showing years of neglect',
                        emotional_impact: 0.5,
                        lore_connection: 'infrastructure_collapse'
                    },
                    {
                        id: 'weather_damage',
                        description: 'Storm damage and flooding marks telling of harsh seasons',
                        emotional_impact: 0.6,
                        lore_connection: 'environmental_changes'
                    }
                ]
            },

            human_traces: {
                type: 'interactive',
                impact: 0.8,
                themes: ['survival', 'hope', 'despair', 'community'],
                variants: [
                    {
                        id: 'survivor_camps',
                        description: 'Makeshift shelters with personal belongings and survival tools',
                        emotional_impact: 0.7,
                        lore_connection: 'survivor_communities',
                        interactive: true
                    },
                    {
                        id: 'memorial_sites',
                        description: 'Improvised memorials with photos and personal items',
                        emotional_impact: 0.9,
                        lore_connection: 'remembrance',
                        interactive: true
                    },
                    {
                        id: 'supply_caches',
                        description: 'Hidden supply stashes left by previous survivors',
                        emotional_impact: 0.6,
                        lore_connection: 'survival_networks',
                        interactive: true,
                        rewards: ['supplies', 'lore_items']
                    }
                ]
            },

            warning_signs: {
                type: 'informational',
                impact: 0.7,
                themes: ['danger', 'guidance', 'desperation'],
                variants: [
                    {
                        id: 'spray_painted_warnings',
                        description: 'Urgent messages spray-painted on walls by survivors',
                        emotional_impact: 0.8,
                        lore_connection: 'survivor_communication',
                        messages: [
                            'STAY AWAY - INFECTED INSIDE',
                            'SAFE HOUSE 2 MILES NORTH',
                            'THEY HUNT AT NIGHT',
                            'RADIO DEAD - NO HELP COMING'
                        ]
                    },
                    {
                        id: 'official_notices',
                        description: 'Weathered government evacuation notices and emergency broadcasts',
                        emotional_impact: 0.6,
                        lore_connection: 'government_response',
                        messages: [
                            'MANDATORY EVACUATION - PROCEED TO DESIGNATED ZONES',
                            'MARTIAL LAW IN EFFECT',
                            'EMERGENCY BROADCAST SYSTEM ACTIVATED'
                        ]
                    }
                ]
            }
        };

        Object.entries(narrativeTypes).forEach(([key, element]) => {
            this.narrativeElements.set(key, element);
        });
    }

    /**
     * Initialize atmospheric effects
     */
    initializeAtmosphericEffects() {
        const atmosphericTypes = {
            // Audio atmosphere
            ambient_audio: {
                type: 'audio',
                intensity_range: [0.1, 0.8],
                effects: [
                    {
                        id: 'distant_screams',
                        description: 'Faint screams carried by the wind',
                        emotional_impact: 0.8,
                        trigger_conditions: ['night', 'high_tension'],
                        audio_file: 'ambient/distant_screams.ogg',
                        volume_range: [0.1, 0.3]
                    },
                    {
                        id: 'creaking_metal',
                        description: 'Groaning metal structures in the wind',
                        emotional_impact: 0.5,
                        trigger_conditions: ['windy', 'industrial_area'],
                        audio_file: 'ambient/metal_creaking.ogg',
                        volume_range: [0.2, 0.5]
                    },
                    {
                        id: 'radio_static',
                        description: 'Intermittent radio static with garbled voices',
                        emotional_impact: 0.6,
                        trigger_conditions: ['near_radio_tower', 'electrical_storm'],
                        audio_file: 'ambient/radio_static.ogg',
                        volume_range: [0.1, 0.4]
                    },
                    {
                        id: 'wildlife_calls',
                        description: 'Mutated or distressed animal sounds',
                        emotional_impact: 0.4,
                        trigger_conditions: ['forest', 'dawn', 'dusk'],
                        audio_file: 'ambient/wildlife_calls.ogg',
                        volume_range: [0.2, 0.6]
                    }
                ]
            },

            // Visual atmosphere
            visual_effects: {
                type: 'visual',
                intensity_range: [0.2, 1.0],
                effects: [
                    {
                        id: 'fog_banks',
                        description: 'Mysterious fog that obscures vision and creates tension',
                        emotional_impact: 0.7,
                        trigger_conditions: ['dawn', 'near_water', 'low_temperature'],
                        visual_properties: {
                            density: [0.3, 0.8],
                            color: '#e0e0e0',
                            movement_speed: 0.1
                        }
                    },
                    {
                        id: 'flickering_lights',
                        description: 'Failing electrical systems creating eerie lighting',
                        emotional_impact: 0.6,
                        trigger_conditions: ['night', 'urban_area', 'electrical_damage'],
                        visual_properties: {
                            flicker_rate: [0.5, 2.0],
                            intensity_variation: [0.2, 0.8],
                            color_temperature: 3200
                        }
                    },
                    {
                        id: 'dust_storms',
                        description: 'Swirling dust and debris reducing visibility',
                        emotional_impact: 0.5,
                        trigger_conditions: ['desert', 'high_wind', 'dry_weather'],
                        visual_properties: {
                            particle_density: [100, 500],
                            wind_strength: [0.5, 1.5],
                            visibility_reduction: [0.3, 0.7]
                        }
                    },
                    {
                        id: 'aurora_anomaly',
                        description: 'Unnatural aurora-like lights suggesting electromagnetic disturbance',
                        emotional_impact: 0.8,
                        trigger_conditions: ['night', 'clear_sky', 'electromagnetic_anomaly'],
                        visual_properties: {
                            color_palette: ['#00ff88', '#ff0088', '#8800ff'],
                            movement_pattern: 'wave',
                            intensity: [0.4, 0.9]
                        }
                    }
                ]
            },

            // Environmental atmosphere
            environmental_mood: {
                type: 'environmental',
                intensity_range: [0.1, 1.0],
                effects: [
                    {
                        id: 'temperature_drops',
                        description: 'Sudden temperature changes creating unease',
                        emotional_impact: 0.5,
                        trigger_conditions: ['entering_buildings', 'underground'],
                        environmental_properties: {
                            temperature_change: [-10, -25],
                            duration: [30, 120],
                            visual_breath: true
                        }
                    },
                    {
                        id: 'electromagnetic_interference',
                        description: 'Radio static and electronic malfunctions',
                        emotional_impact: 0.6,
                        trigger_conditions: ['near_power_lines', 'storm_approaching'],
                        environmental_properties: {
                            radio_static: true,
                            screen_flicker: true,
                            compass_deviation: [5, 45]
                        }
                    }
                ]
            }
        };

        Object.entries(atmosphericTypes).forEach(([key, effect]) => {
            this.atmosphericEffects.set(key, effect);
        });
    }

    /**
     * Initialize dynamic events
     */
    initializeDynamicEvents() {
        const eventTypes = {
            // Scripted sequences
            scripted_sequences: {
                type: 'scripted',
                trigger_type: 'location_based',
                events: [
                    {
                        id: 'helicopter_flyover',
                        description: 'Military helicopter passes overhead, spotlight searching',
                        emotional_impact: 0.7,
                        duration: 15000,
                        trigger_conditions: ['outdoor', 'daytime'],
                        sequence: [
                            { time: 0, action: 'play_audio', params: { file: 'helicopter_distant.ogg' } },
                            { time: 3000, action: 'spawn_helicopter', params: { path: 'flyover_path_1' } },
                            { time: 5000, action: 'enable_spotlight', params: { intensity: 0.8 } },
                            { time: 12000, action: 'fade_audio', params: { duration: 3000 } },
                            { time: 15000, action: 'cleanup_helicopter' }
                        ]
                    },
                    {
                        id: 'survivor_radio_broadcast',
                        description: 'Intercepted radio transmission from other survivors',
                        emotional_impact: 0.8,
                        duration: 30000,
                        trigger_conditions: ['near_radio', 'night'],
                        sequence: [
                            { time: 0, action: 'play_radio_static', params: { volume: 0.3 } },
                            { time: 2000, action: 'play_voice', params: { file: 'survivor_broadcast_1.ogg' } },
                            { time: 25000, action: 'fade_to_static', params: { duration: 5000 } }
                        ],
                        lore_unlock: 'survivor_network_exists'
                    },
                    {
                        id: 'zombie_horde_migration',
                        description: 'Large group of zombies passes through area',
                        emotional_impact: 0.9,
                        duration: 45000,
                        trigger_conditions: ['specific_location', 'time_based'],
                        sequence: [
                            { time: 0, action: 'play_distant_moans', params: { volume: 0.2 } },
                            { time: 5000, action: 'spawn_horde', params: { size: 50, path: 'migration_path' } },
                            { time: 10000, action: 'increase_audio', params: { target_volume: 0.6 } },
                            { time: 35000, action: 'fade_horde', params: { duration: 10000 } }
                        ]
                    }
                ]
            },

            // Environmental events
            environmental_events: {
                type: 'environmental',
                trigger_type: 'condition_based',
                events: [
                    {
                        id: 'sudden_storm',
                        description: 'Weather rapidly deteriorates, affecting visibility and movement',
                        emotional_impact: 0.6,
                        duration: 120000,
                        trigger_conditions: ['outdoor', 'weather_system_active'],
                        effects: {
                            visibility_reduction: 0.4,
                            movement_speed_modifier: 0.8,
                            audio_masking: 0.3,
                            lightning_frequency: 0.1
                        }
                    },
                    {
                        id: 'power_grid_failure',
                        description: 'Electrical systems fail across the area',
                        emotional_impact: 0.7,
                        duration: 180000,
                        trigger_conditions: ['urban_area', 'electrical_storm'],
                        effects: {
                            lights_disabled: true,
                            electronic_interference: true,
                            emergency_lighting_only: true
                        }
                    },
                    {
                        id: 'toxic_gas_leak',
                        description: 'Chemical leak creates hazardous area',
                        emotional_impact: 0.8,
                        duration: 300000,
                        trigger_conditions: ['industrial_area', 'structural_damage'],
                        effects: {
                            health_drain: 0.1,
                            visibility_tint: '#88ff88',
                            movement_restriction: true,
                            gas_mask_required: true
                        }
                    }
                ]
            },

            // Interactive events
            interactive_events: {
                type: 'interactive',
                trigger_type: 'player_action',
                events: [
                    {
                        id: 'emergency_broadcast_activation',
                        description: 'Player activates emergency broadcast system',
                        emotional_impact: 0.9,
                        duration: 60000,
                        trigger_action: 'interact_with_radio_tower',
                        sequence: [
                            { time: 0, action: 'show_interface', params: { type: 'radio_control' } },
                            { time: 5000, action: 'broadcast_signal', params: { range: 5000 } },
                            { time: 10000, action: 'attract_zombies', params: { intensity: 0.8 } },
                            { time: 30000, action: 'receive_response', params: { type: 'survivor_group' } }
                        ],
                        consequences: {
                            zombie_attraction: 0.8,
                            survivor_contact: true,
                            lore_unlock: 'communication_restored'
                        }
                    }
                ]
            }
        };

        Object.entries(eventTypes).forEach(([key, eventType]) => {
            this.dynamicEvents.set(key, eventType);
        });
    }

    /**
     * Initialize collectibles and lore elements
     */
    initializeCollectibles() {
        const collectibleTypes = {
            // Documents and records
            documents: {
                type: 'readable',
                rarity: 0.3,
                items: [
                    {
                        id: 'personal_diary',
                        name: 'Survivor\'s Diary',
                        description: 'Personal account of the early days of the outbreak',
                        content: 'Day 12: The radio went silent today. No more emergency broadcasts. We\'re truly on our own now...',
                        lore_category: 'personal_accounts',
                        emotional_impact: 0.8,
                        discovery_bonus: 50
                    },
                    {
                        id: 'government_memo',
                        name: 'Classified Memo',
                        description: 'Official government document about containment protocols',
                        content: 'CLASSIFIED: Operation Firewall has failed. Recommend immediate implementation of Protocol Seven...',
                        lore_category: 'government_response',
                        emotional_impact: 0.9,
                        discovery_bonus: 100
                    },
                    {
                        id: 'research_notes',
                        name: 'Research Notes',
                        description: 'Scientific observations about the infected',
                        content: 'Subject exhibits enhanced aggression and reduced pain response. Cellular degradation rate: 15% per week...',
                        lore_category: 'scientific_research',
                        emotional_impact: 0.7,
                        discovery_bonus: 75
                    }
                ]
            },

            // Audio logs
            audio_logs: {
                type: 'audio',
                rarity: 0.2,
                items: [
                    {
                        id: 'final_transmission',
                        name: 'Final Radio Transmission',
                        description: 'Last broadcast from the emergency services',
                        audio_file: 'lore/final_transmission.ogg',
                        transcript: 'This is Emergency Dispatch. All units, all units... we\'re being overrun. If anyone can hear this...',
                        lore_category: 'emergency_services',
                        emotional_impact: 0.9,
                        discovery_bonus: 125
                    },
                    {
                        id: 'family_message',
                        name: 'Family Voice Message',
                        description: 'Voicemail left by a family member',
                        audio_file: 'lore/family_message.ogg',
                        transcript: 'Mom, if you get this, we made it to the shelter. We\'ll wait for you as long as we can...',
                        lore_category: 'personal_accounts',
                        emotional_impact: 0.8,
                        discovery_bonus: 75
                    }
                ]
            },

            // Physical artifacts
            artifacts: {
                type: 'physical',
                rarity: 0.4,
                items: [
                    {
                        id: 'family_photo',
                        name: 'Family Photograph',
                        description: 'Weathered photo of a happy family',
                        visual_asset: 'lore/family_photo.jpg',
                        lore_category: 'personal_accounts',
                        emotional_impact: 0.6,
                        discovery_bonus: 25
                    },
                    {
                        id: 'military_dog_tags',
                        name: 'Military Dog Tags',
                        description: 'Identification tags from a fallen soldier',
                        visual_asset: 'lore/dog_tags.jpg',
                        lore_category: 'military_response',
                        emotional_impact: 0.7,
                        discovery_bonus: 50
                    },
                    {
                        id: 'childrens_toy',
                        name: 'Child\'s Toy',
                        description: 'A small stuffed animal, well-loved',
                        visual_asset: 'lore/stuffed_animal.jpg',
                        lore_category: 'personal_accounts',
                        emotional_impact: 0.8,
                        discovery_bonus: 30
                    }
                ]
            },

            // Interactive objects
            interactive_objects: {
                type: 'interactive',
                rarity: 0.1,
                items: [
                    {
                        id: 'survivor_terminal',
                        name: 'Survivor Terminal',
                        description: 'Computer terminal with survivor network access',
                        interaction_type: 'computer_interface',
                        lore_category: 'survivor_networks',
                        emotional_impact: 0.7,
                        discovery_bonus: 150,
                        unlocks: ['survivor_map', 'safe_house_locations']
                    },
                    {
                        id: 'emergency_cache',
                        name: 'Emergency Supply Cache',
                        description: 'Hidden cache left by previous survivors',
                        interaction_type: 'container',
                        lore_category: 'survival_networks',
                        emotional_impact: 0.5,
                        discovery_bonus: 100,
                        rewards: ['medical_supplies', 'ammunition', 'food']
                    }
                ]
            }
        };

        Object.entries(collectibleTypes).forEach(([key, collectibleType]) => {
            this.collectibles.set(key, collectibleType);
        });
    }

    /**
     * Initialize lore database
     */
    initializeLoreDatabase() {
        const loreCategories = {
            outbreak_origins: {
                title: 'The Outbreak',
                description: 'Information about how the zombie outbreak began',
                entries: new Map([
                    ['patient_zero', {
                        title: 'Patient Zero',
                        content: 'The first confirmed case appeared in a research facility...',
                        unlock_condition: 'find_research_notes',
                        emotional_weight: 0.9
                    }],
                    ['initial_spread', {
                        title: 'Initial Spread',
                        content: 'Within 72 hours, the infection had spread to three major cities...',
                        unlock_condition: 'find_government_memo',
                        emotional_weight: 0.8
                    }]
                ])
            },

            government_response: {
                title: 'Government Response',
                description: 'Official actions taken during the crisis',
                entries: new Map([
                    ['martial_law', {
                        title: 'Martial Law Declaration',
                        content: 'Emergency powers were enacted, but it was already too late...',
                        unlock_condition: 'find_official_notice',
                        emotional_weight: 0.7
                    }],
                    ['evacuation_failure', {
                        title: 'Failed Evacuations',
                        content: 'Evacuation centers became death traps as they were overrun...',
                        unlock_condition: 'visit_evacuation_center',
                        emotional_weight: 0.9
                    }]
                ])
            },

            survivor_stories: {
                title: 'Survivor Stories',
                description: 'Personal accounts from those who lived through the outbreak',
                entries: new Map([
                    ['the_last_broadcast', {
                        title: 'The Last Broadcast',
                        content: 'A radio DJ continued broadcasting until the very end...',
                        unlock_condition: 'find_radio_station',
                        emotional_weight: 0.8
                    }],
                    ['family_separation', {
                        title: 'Separated Families',
                        content: 'Countless families were torn apart in the chaos...',
                        unlock_condition: 'find_family_photo',
                        emotional_weight: 0.9
                    }]
                ])
            }
        };

        Object.entries(loreCategories).forEach(([key, category]) => {
            this.loreDatabase.set(key, category);
        });
    }

    /**
     * Generate environmental storytelling for a level
     */
    generateEnvironmentalStory(levelData, playerProgress) {
        const startTime = performance.now();
        
        const story = {
            narrativeElements: this.generateNarrativeElements(levelData, playerProgress),
            atmosphericEffects: this.generateAtmosphericEffects(levelData),
            dynamicEvents: this.generateDynamicEvents(levelData, playerProgress),
            collectibles: this.generateCollectibles(levelData, playerProgress),
            loreConnections: this.generateLoreConnections(levelData, playerProgress)
        };

        // Update performance metrics
        const processingTime = performance.now() - startTime;
        this.updatePerformanceMetrics(story, processingTime);

        return story;
    }

    /**
     * Generate narrative elements for the level
     */
    generateNarrativeElements(levelData, playerProgress) {
        const elements = [];
        const biome = levelData.biome || 'urban';
        const difficulty = levelData.difficulty || 0.5;
        
        // Select appropriate narrative elements based on biome and progress
        this.narrativeElements.forEach((element, key) => {
            if (this.shouldIncludeNarrativeElement(element, biome, difficulty, playerProgress)) {
                const instances = this.generateNarrativeInstances(element, levelData);
                elements.push(...instances);
            }
        });

        return elements.sort((a, b) => b.emotional_impact - a.emotional_impact);
    }

    /**
     * Generate atmospheric effects for the level
     */
    generateAtmosphericEffects(levelData) {
        const effects = [];
        const timeOfDay = levelData.timeOfDay || 'day';
        const weather = levelData.weather || 'clear';
        const biome = levelData.biome || 'urban';

        this.atmosphericEffects.forEach((effectType, key) => {
            effectType.effects.forEach(effect => {
                if (this.shouldIncludeAtmosphericEffect(effect, timeOfDay, weather, biome)) {
                    const instance = this.createAtmosphericInstance(effect, levelData);
                    effects.push(instance);
                }
            });
        });

        return effects;
    }

    /**
     * Generate dynamic events for the level
     */
    generateDynamicEvents(levelData, playerProgress) {
        const events = [];
        const eventProbability = this.options.eventFrequency * (1 + playerProgress.skill_rating);

        this.dynamicEvents.forEach((eventType, key) => {
            eventType.events.forEach(event => {
                if (Math.random() < eventProbability && 
                    this.shouldIncludeEvent(event, levelData, playerProgress)) {
                    const instance = this.createEventInstance(event, levelData);
                    events.push(instance);
                }
            });
        });

        return events.sort((a, b) => b.emotional_impact - a.emotional_impact);
    }

    /**
     * Generate collectibles for the level
     */
    generateCollectibles(levelData, playerProgress) {
        const collectibles = [];
        const collectibleDensity = this.options.collectibleDensity;
        const levelSize = levelData.size || { width: 1000, height: 1000 };
        const targetCount = Math.floor((levelSize.width * levelSize.height) / 100000 * collectibleDensity);

        this.collectibles.forEach((collectibleType, key) => {
            const typeCount = Math.floor(targetCount * collectibleType.rarity);
            
            for (let i = 0; i < typeCount; i++) {
                const item = this.selectRandomItem(collectibleType.items);
                const instance = this.createCollectibleInstance(item, levelData);
                collectibles.push(instance);
            }
        });

        return collectibles;
    }

    /**
     * Generate lore connections
     */
    generateLoreConnections(levelData, playerProgress) {
        const connections = [];
        
        // Connect narrative elements to lore
        this.loreDatabase.forEach((category, categoryKey) => {
            category.entries.forEach((entry, entryKey) => {
                if (this.shouldIncludeLoreConnection(entry, levelData, playerProgress)) {
                    connections.push({
                        category: categoryKey,
                        entry: entryKey,
                        unlock_method: entry.unlock_condition,
                        emotional_weight: entry.emotional_weight
                    });
                }
            });
        });

        return connections;
    }

    /**
     * Generate narrative instances from element template
     */
    generateNarrativeInstances(element, levelData) {
        const instances = [];
        const instanceCount = Math.floor(Math.random() * 3) + 1; // 1-3 instances
        
        for (let i = 0; i < instanceCount; i++) {
            const variant = this.selectRandomItem(element.variants);
            const instance = this.createNarrativeInstance(variant, levelData);
            instances.push(instance);
        }
        
        return instances;
    }

    /**
     * Helper methods for generation logic
     */
    shouldIncludeNarrativeElement(element, biome, difficulty, playerProgress) {
        // Logic to determine if narrative element fits the level context
        const biomeMatch = this.checkBiomeCompatibility(element, biome);
        const difficultyMatch = difficulty >= (element.min_difficulty || 0);
        const progressMatch = playerProgress.level >= (element.min_level || 1);
        
        return biomeMatch && difficultyMatch && progressMatch;
    }

    shouldIncludeAtmosphericEffect(effect, timeOfDay, weather, biome) {
        return effect.trigger_conditions.some(condition => {
            return condition === timeOfDay || condition === weather || condition === biome;
        });
    }

    shouldIncludeEvent(event, levelData, playerProgress) {
        // Check if event conditions are met
        if (!event.trigger_conditions || event.trigger_conditions.length === 0) {
            return true;
        }
        
        return event.trigger_conditions.every(condition => {
            return this.evaluateCondition(condition, levelData, playerProgress);
        });
    }

    shouldIncludeLoreConnection(entry, levelData, playerProgress) {
        // Determine if lore should be available based on player progress
        return playerProgress.discoveries_made >= (entry.min_discoveries || 0);
    }

    checkBiomeCompatibility(element, biome) {
        if (!element.biome_restrictions) return true;
        return element.biome_restrictions.includes(biome);
    }

    evaluateCondition(condition, levelData, playerProgress) {
        // Evaluate various trigger conditions
        switch (condition) {
            case 'outdoor':
                return levelData.environment_type === 'outdoor';
            case 'indoor':
                return levelData.environment_type === 'indoor';
            case 'night':
                return levelData.timeOfDay === 'night';
            case 'day':
                return levelData.timeOfDay === 'day';
            case 'urban_area':
                return levelData.biome === 'urban';
            case 'forest':
                return levelData.biome === 'forest';
            case 'desert':
                return levelData.biome === 'desert';
            case 'industrial':
                return levelData.biome === 'industrial';
            default:
                return true;
        }
    }

    selectRandomItem(items) {
        return items[Math.floor(Math.random() * items.length)];
    }

    createNarrativeInstance(element, levelData) {
        return {
            id: `narrative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: element.type,
            position: this.generateRandomPosition(levelData),
            ...element
        };
    }

    createAtmosphericInstance(effect, levelData) {
        return {
            id: `atmosphere_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: effect.type || 'ambient',
            intensity: this.calculateIntensity(effect, levelData),
            position: effect.global ? null : this.generateRandomPosition(levelData),
            ...effect
        };
    }

    createEventInstance(event, levelData) {
        return {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            trigger_position: this.generateTriggerPosition(event, levelData),
            scheduled_time: this.calculateEventTiming(event, levelData),
            ...event
        };
    }

    createCollectibleInstance(item, levelData) {
        return {
            id: `collectible_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            position: this.generateCollectiblePosition(item, levelData),
            discovered: false,
            ...item
        };
    }

    generateRandomPosition(levelData) {
        const size = levelData.size || { width: 1000, height: 1000 };
        return {
            x: Math.random() * size.width,
            y: Math.random() * size.height,
            z: 0
        };
    }

    generateTriggerPosition(event, levelData) {
        // Generate strategic positions for event triggers
        return this.generateRandomPosition(levelData);
    }

    generateCollectiblePosition(item, levelData) {
        // Generate positions that make sense for collectibles
        return this.generateRandomPosition(levelData);
    }

    calculateIntensity(effect, levelData) {
        const baseIntensity = this.options.atmosphereIntensity;
        const range = effect.intensity_range || [0.1, 1.0];
        return Math.max(range[0], Math.min(range[1], baseIntensity));
    }

    calculateEventTiming(event, levelData) {
        // Calculate when events should trigger during gameplay
        const levelDuration = levelData.estimated_duration || 300000; // 5 minutes default
        return Math.random() * levelDuration;
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(story, processingTime) {
        this.performanceMetrics.narrativeElementsActive = story.narrativeElements.length;
        this.performanceMetrics.atmosphericEffectsActive = story.atmosphericEffects.length;
        this.performanceMetrics.eventsTriggered = story.dynamicEvents.length;
        this.performanceMetrics.collectiblesFound = story.collectibles.length;
        
        // Update average processing time
        const currentAvg = this.performanceMetrics.averageProcessingTime;
        this.performanceMetrics.averageProcessingTime = (currentAvg + processingTime) / 2;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Get discovered lore
     */
    getDiscoveredLore() {
        const discovered = [];
        
        this.loreDatabase.forEach((category, categoryKey) => {
            const categoryData = {
                key: categoryKey,
                title: category.title,
                description: category.description,
                entries: []
            };
            
            category.entries.forEach((entry, entryKey) => {
                if (this.discoveredLore.has(`${categoryKey}_${entryKey}`)) {
                    categoryData.entries.push({
                        key: entryKey,
                        title: entry.title,
                        content: entry.content,
                        emotional_weight: entry.emotional_weight
                    });
                }
            });
            
            if (categoryData.entries.length > 0) {
                discovered.push(categoryData);
            }
        });
        
        return discovered;
    }

    /**
     * Unlock lore entry
     */
    unlockLore(categoryKey, entryKey) {
        const loreId = `${categoryKey}_${entryKey}`;
        if (!this.discoveredLore.has(loreId)) {
            this.discoveredLore.add(loreId);
            return true;
        }
        return false;
    }

    /**
     * Get current atmosphere state
     */
    getAtmosphereState() {
        return { ...this.atmosphereState };
    }

    /**
     * Update atmosphere state
     */
    updateAtmosphereState(changes) {
        Object.keys(changes).forEach(key => {
            if (key in this.atmosphereState) {
                this.atmosphereState[key] = Math.max(0, Math.min(1, 
                    this.atmosphereState[key] + changes[key]));
            }
        });
    }
}

export default EnvironmentalStorytelling;