/**
 * Scoring system exports
 */

export { ScoringSystem } from './ScoringSystem';
export { ScoringAPI, RobustScoringAPI, APIError } from './ScoringAPI';
export { ScoringHUD } from '../components/ScoringHUD';
export { 
    SCORING_CONFIG,
    getZombiePoints,
    getKillMethodMultiplier,
    getComboTier,
    calculateCurrency,
    validateScore
} from './ScoringConfig';

// Re-export for convenience
export default {
    ScoringSystem,
    ScoringAPI,
    RobustScoringAPI,
    ScoringHUD,
    SCORING_CONFIG
};