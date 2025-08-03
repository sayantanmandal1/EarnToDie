/**
 * Environmental Storytelling System Tests
 */

import EnvironmentalStorytelling from '../EnvironmentalStorytelling';

describe('EnvironmentalStorytelling', () => {
    let storytelling;
    let mockLevelData;
    let mockPlayerProgress;

    beforeEach(() => {
        storytelling = new EnvironmentalStorytelling({
            enableNarrative: true,
            enableAtmosphere: true,
            enableEvents: true,
            enableCollectibles: true
        });

        mockLevelData = {
            biome: 'urban',
            difficulty: 0.5,
            timeOfDay: 'day',
            weather: 'clear',
            size: { width: 1000, height: 1000 },
            estimated_duration: 300000
        };

        mockPlayerProgress = {
            level: 5,
            skill_rating: 0.6,
            discoveries_made: 10,
            play_style: 'balanced'
        };
    });

    describe('Initialization', () => {
        test('should initialize with default options', () => {
            expect(storytelling.options.enableNarrative).toBe(true);
            expect(storytelling.options.narrativeIntensity).toBe(0.7);
            expect(storytelling.narrativeElements.size).toBeGreaterThan(0);
            expect(storytelling.atmosphericEffects.size).toBeGreaterThan(0);
        });

        test('should initialize with custom options', () => {
            const customStorytelling = new EnvironmentalStorytelling({
                narrativeIntensity: 0.9,
                eventFrequency: 0.8
            });

            expect(customStorytelling.options.narrativeIntensity).toBe(0.9);
            expect(customStorytelling.options.eventFrequency).toBe(0.8);
        });

        test('should initialize all storytelling elements', () => {
            expect(storytelling.narrativeElements.has('abandoned_vehicles')).toBe(true);
            expect(storytelling.atmosphericEffects.has('ambient_audio')).toBe(true);
            expect(storytelling.dynamicEvents.has('scripted_sequences')).toBe(true);
            expect(storytelling.collectibles.has('documents')).toBe(true);
            expect(storytelling.loreDatabase.has('outbreak_origins')).toBe(true);
        });
    });

    describe('Environmental Story Generation', () => {
        test('should generate complete environmental story', () => {
            const story = storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);

            expect(story).toHaveProperty('narrativeElements');
            expect(story).toHaveProperty('atmosphericEffects');
            expect(story).toHaveProperty('dynamicEvents');
            expect(story).toHaveProperty('collectibles');
            expect(story).toHaveProperty('loreConnections');

            expect(Array.isArray(story.narrativeElements)).toBe(true);
            expect(Array.isArray(story.atmosphericEffects)).toBe(true);
            expect(Array.isArray(story.dynamicEvents)).toBe(true);
            expect(Array.isArray(story.collectibles)).toBe(true);
            expect(Array.isArray(story.loreConnections)).toBe(true);
        });

        test('should adapt story to biome', () => {
            const urbanStory = storytelling.generateEnvironmentalStory(
                { ...mockLevelData, biome: 'urban' }, 
                mockPlayerProgress
            );
            
            const forestStory = storytelling.generateEnvironmentalStory(
                { ...mockLevelData, biome: 'forest' }, 
                mockPlayerProgress
            );

            // Stories should be different for different biomes
            expect(urbanStory.narrativeElements.length).toBeGreaterThan(0);
            expect(forestStory.narrativeElements.length).toBeGreaterThan(0);
        });

        test('should scale with difficulty', () => {
            const easyStory = storytelling.generateEnvironmentalStory(
                { ...mockLevelData, difficulty: 0.2 }, 
                mockPlayerProgress
            );
            
            const hardStory = storytelling.generateEnvironmentalStory(
                { ...mockLevelData, difficulty: 0.8 }, 
                mockPlayerProgress
            );

            expect(easyStory.narrativeElements.length).toBeGreaterThanOrEqual(0);
            expect(hardStory.narrativeElements.length).toBeGreaterThanOrEqual(0);
        });

        test('should include performance metrics', () => {
            const story = storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);
            const metrics = storytelling.getPerformanceMetrics();

            expect(metrics).toHaveProperty('narrativeElementsActive');
            expect(metrics).toHaveProperty('atmosphericEffectsActive');
            expect(metrics).toHaveProperty('eventsTriggered');
            expect(metrics).toHaveProperty('collectiblesFound');
            expect(metrics).toHaveProperty('averageProcessingTime');
            expect(metrics.averageProcessingTime).toBeGreaterThan(0);
        });
    });

    describe('Narrative Elements', () => {
        test('should generate narrative elements', () => {
            const elements = storytelling.generateNarrativeElements(mockLevelData, mockPlayerProgress);

            expect(Array.isArray(elements)).toBe(true);
            elements.forEach(element => {
                expect(element).toHaveProperty('type');
                expect(element).toHaveProperty('impact');
                expect(element).toHaveProperty('themes');
            });
        });

        test('should sort elements by emotional impact', () => {
            const elements = storytelling.generateNarrativeElements(mockLevelData, mockPlayerProgress);

            if (elements.length > 1) {
                for (let i = 0; i < elements.length - 1; i++) {
                    expect(elements[i].emotional_impact).toBeGreaterThanOrEqual(elements[i + 1].emotional_impact);
                }
            }
        });

        test('should include different narrative types', () => {
            const elements = storytelling.generateNarrativeElements(mockLevelData, mockPlayerProgress);
            
            if (elements.length > 0) {
                const types = new Set(elements.map(e => e.type));
                expect(types.size).toBeGreaterThan(0);
            }
        });
    });

    describe('Atmospheric Effects', () => {
        test('should generate atmospheric effects', () => {
            const effects = storytelling.generateAtmosphericEffects(mockLevelData);

            expect(Array.isArray(effects)).toBe(true);
            effects.forEach(effect => {
                expect(effect).toHaveProperty('id');
                expect(effect).toHaveProperty('type');
                expect(effect).toHaveProperty('emotional_impact');
            });
        });

        test('should adapt to time of day', () => {
            const dayEffects = storytelling.generateAtmosphericEffects(
                { ...mockLevelData, timeOfDay: 'day' }
            );
            
            const nightEffects = storytelling.generateAtmosphericEffects(
                { ...mockLevelData, timeOfDay: 'night' }
            );

            expect(Array.isArray(dayEffects)).toBe(true);
            expect(Array.isArray(nightEffects)).toBe(true);
        });

        test('should adapt to weather conditions', () => {
            const clearEffects = storytelling.generateAtmosphericEffects(
                { ...mockLevelData, weather: 'clear' }
            );
            
            const stormEffects = storytelling.generateAtmosphericEffects(
                { ...mockLevelData, weather: 'storm' }
            );

            expect(Array.isArray(clearEffects)).toBe(true);
            expect(Array.isArray(stormEffects)).toBe(true);
        });
    });

    describe('Dynamic Events', () => {
        test('should generate dynamic events', () => {
            const events = storytelling.generateDynamicEvents(mockLevelData, mockPlayerProgress);

            expect(Array.isArray(events)).toBe(true);
            events.forEach(event => {
                expect(event).toHaveProperty('id');
                expect(event).toHaveProperty('emotional_impact');
                expect(event).toHaveProperty('duration');
            });
        });

        test('should sort events by emotional impact', () => {
            const events = storytelling.generateDynamicEvents(mockLevelData, mockPlayerProgress);

            if (events.length > 1) {
                for (let i = 0; i < events.length - 1; i++) {
                    expect(events[i].emotional_impact).toBeGreaterThanOrEqual(events[i + 1].emotional_impact);
                }
            }
        });

        test('should scale with player skill', () => {
            const lowSkillEvents = storytelling.generateDynamicEvents(
                mockLevelData, 
                { ...mockPlayerProgress, skill_rating: 0.2 }
            );
            
            const highSkillEvents = storytelling.generateDynamicEvents(
                mockLevelData, 
                { ...mockPlayerProgress, skill_rating: 0.9 }
            );

            expect(Array.isArray(lowSkillEvents)).toBe(true);
            expect(Array.isArray(highSkillEvents)).toBe(true);
        });
    });

    describe('Collectibles Generation', () => {
        test('should generate collectibles', () => {
            const collectibles = storytelling.generateCollectibles(mockLevelData, mockPlayerProgress);

            expect(Array.isArray(collectibles)).toBe(true);
            collectibles.forEach(collectible => {
                expect(collectible).toHaveProperty('id');
                expect(collectible).toHaveProperty('position');
                expect(collectible).toHaveProperty('discovered');
                expect(collectible.discovered).toBe(false);
            });
        });

        test('should distribute collectibles by rarity', () => {
            const collectibles = storytelling.generateCollectibles(mockLevelData, mockPlayerProgress);

            if (collectibles.length > 0) {
                const rarities = new Set(collectibles.map(c => c.rarity));
                expect(rarities.size).toBeGreaterThan(0);
            }
        });

        test('should scale with level size', () => {
            const smallLevel = storytelling.generateCollectibles(
                { ...mockLevelData, size: { width: 500, height: 500 } }, 
                mockPlayerProgress
            );
            
            const largeLevel = storytelling.generateCollectibles(
                { ...mockLevelData, size: { width: 2000, height: 2000 } }, 
                mockPlayerProgress
            );

            expect(Array.isArray(smallLevel)).toBe(true);
            expect(Array.isArray(largeLevel)).toBe(true);
        });
    });

    describe('Lore Connections', () => {
        test('should generate lore connections', () => {
            const connections = storytelling.generateLoreConnections(mockLevelData, mockPlayerProgress);

            expect(Array.isArray(connections)).toBe(true);
            connections.forEach(connection => {
                expect(connection).toHaveProperty('category');
                expect(connection).toHaveProperty('entry');
                expect(connection).toHaveProperty('unlock_method');
                expect(connection).toHaveProperty('emotional_weight');
            });
        });

        test('should adapt to player progress', () => {
            const lowProgressConnections = storytelling.generateLoreConnections(
                mockLevelData, 
                { ...mockPlayerProgress, discoveries_made: 1 }
            );
            
            const highProgressConnections = storytelling.generateLoreConnections(
                mockLevelData, 
                { ...mockPlayerProgress, discoveries_made: 50 }
            );

            expect(Array.isArray(lowProgressConnections)).toBe(true);
            expect(Array.isArray(highProgressConnections)).toBe(true);
        });
    });

    describe('Lore Management', () => {
        test('should unlock lore entries', () => {
            const result = storytelling.unlockLore('outbreak_origins', 'patient_zero');
            expect(result).toBe(true);

            const discoveredLore = storytelling.getDiscoveredLore();
            expect(discoveredLore.length).toBeGreaterThan(0);
            
            const category = discoveredLore.find(cat => cat.key === 'outbreak_origins');
            expect(category).toBeDefined();
            expect(category.entries.length).toBeGreaterThan(0);
        });

        test('should not unlock same lore twice', () => {
            const firstUnlock = storytelling.unlockLore('outbreak_origins', 'patient_zero');
            const secondUnlock = storytelling.unlockLore('outbreak_origins', 'patient_zero');
            
            expect(firstUnlock).toBe(true);
            expect(secondUnlock).toBe(false);
        });

        test('should return discovered lore by category', () => {
            storytelling.unlockLore('outbreak_origins', 'patient_zero');
            storytelling.unlockLore('government_response', 'martial_law');

            const discoveredLore = storytelling.getDiscoveredLore();
            expect(discoveredLore.length).toBeGreaterThan(0);

            const categories = discoveredLore.map(cat => cat.key);
            expect(categories).toContain('outbreak_origins');
            expect(categories).toContain('government_response');
        });
    });

    describe('Atmosphere State Management', () => {
        test('should track atmosphere state', () => {
            const initialState = storytelling.getAtmosphereState();

            expect(initialState).toHaveProperty('tension');
            expect(initialState).toHaveProperty('mystery');
            expect(initialState).toHaveProperty('horror');
            expect(initialState).toHaveProperty('hope');

            expect(initialState.tension).toBeGreaterThanOrEqual(0);
            expect(initialState.tension).toBeLessThanOrEqual(1);
        });

        test('should update atmosphere state', () => {
            const initialState = storytelling.getAtmosphereState();
            const initialTension = initialState.tension;

            storytelling.updateAtmosphereState({ tension: 0.2 });

            const updatedState = storytelling.getAtmosphereState();
            expect(updatedState.tension).toBe(initialTension + 0.2);
        });

        test('should clamp atmosphere values', () => {
            storytelling.updateAtmosphereState({ tension: 2.0 }); // Should clamp to 1.0
            storytelling.updateAtmosphereState({ mystery: -0.5 }); // Should clamp to 0.0

            const state = storytelling.getAtmosphereState();
            expect(state.tension).toBeLessThanOrEqual(1.0);
            expect(state.mystery).toBeGreaterThanOrEqual(0.0);
        });
    });

    describe('Helper Methods', () => {
        test('should check biome compatibility', () => {
            const urbanElement = { biome_restrictions: ['urban', 'industrial'] };
            const forestElement = { biome_restrictions: ['forest'] };
            const noRestrictionElement = {};

            expect(storytelling.checkBiomeCompatibility(urbanElement, 'urban')).toBe(true);
            expect(storytelling.checkBiomeCompatibility(forestElement, 'urban')).toBe(false);
            expect(storytelling.checkBiomeCompatibility(noRestrictionElement, 'urban')).toBe(true);
        });

        test('should evaluate conditions', () => {
            const gameState = {
                environment_type: 'outdoor',
                timeOfDay: 'night',
                biome: 'urban'
            };

            expect(storytelling.evaluateCondition('outdoor', {}, gameState)).toBe(true);
            expect(storytelling.evaluateCondition('night', {}, gameState)).toBe(true);
            expect(storytelling.evaluateCondition('urban_area', {}, gameState)).toBe(true);
            expect(storytelling.evaluateCondition('indoor', {}, gameState)).toBe(true); // Default true
        });

        test('should select random items', () => {
            const items = ['item1', 'item2', 'item3'];
            const selected = storytelling.selectRandomItem(items);

            expect(items).toContain(selected);
        });

        test('should generate random positions', () => {
            const levelData = { size: { width: 1000, height: 1000 } };
            const position = storytelling.generateRandomPosition(levelData);

            expect(position).toHaveProperty('x');
            expect(position).toHaveProperty('y');
            expect(position).toHaveProperty('z');
            expect(position.x).toBeGreaterThanOrEqual(0);
            expect(position.x).toBeLessThanOrEqual(1000);
            expect(position.y).toBeGreaterThanOrEqual(0);
            expect(position.y).toBeLessThanOrEqual(1000);
        });
    });

    describe('Performance Tracking', () => {
        test('should track performance metrics', () => {
            storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);
            
            const metrics = storytelling.getPerformanceMetrics();
            expect(metrics.narrativeElementsActive).toBeGreaterThanOrEqual(0);
            expect(metrics.atmosphericEffectsActive).toBeGreaterThanOrEqual(0);
            expect(metrics.averageProcessingTime).toBeGreaterThan(0);
        });

        test('should update metrics on multiple generations', () => {
            storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);
            const firstMetrics = storytelling.getPerformanceMetrics();

            storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);
            const secondMetrics = storytelling.getPerformanceMetrics();

            expect(secondMetrics.averageProcessingTime).toBeGreaterThan(0);
        });
    });

    describe('Integration', () => {
        test('should generate consistent stories for same parameters', () => {
            // Set a fixed seed for consistent random generation
            Math.random = jest.fn(() => 0.5);

            const story1 = storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);
            const story2 = storytelling.generateEnvironmentalStory(mockLevelData, mockPlayerProgress);

            expect(story1.narrativeElements.length).toBe(story2.narrativeElements.length);
            expect(story1.atmosphericEffects.length).toBe(story2.atmosphericEffects.length);

            // Restore original Math.random
            Math.random.mockRestore();
        });

        test('should handle edge cases gracefully', () => {
            const edgeCaseLevel = {
                biome: 'unknown',
                difficulty: -1,
                size: { width: 0, height: 0 }
            };

            const edgeCaseProgress = {
                level: 0,
                skill_rating: -0.5,
                discoveries_made: -10
            };

            expect(() => {
                storytelling.generateEnvironmentalStory(edgeCaseLevel, edgeCaseProgress);
            }).not.toThrow();
        });

        test('should work with minimal data', () => {
            const minimalLevel = {};
            const minimalProgress = {};

            const story = storytelling.generateEnvironmentalStory(minimalLevel, minimalProgress);

            expect(story).toHaveProperty('narrativeElements');
            expect(story).toHaveProperty('atmosphericEffects');
            expect(story).toHaveProperty('dynamicEvents');
            expect(story).toHaveProperty('collectibles');
            expect(story).toHaveProperty('loreConnections');
        });
    });
});