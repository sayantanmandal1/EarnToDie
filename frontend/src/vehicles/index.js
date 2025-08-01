// Vehicle System Exports
export { Vehicle } from './Vehicle';
export { VehicleManager } from './VehicleManager';
export { 
    VEHICLE_TYPES, 
    VEHICLE_CONFIGS, 
    VEHICLE_CATEGORIES,
    getVehicleConfig,
    getAllVehicleTypes,
    getVehiclesByCategory,
    getAvailableVehicles,
    calculateUpgradedStats
} from './VehicleConfig';

// Component Exports
export { VehicleSelection } from '../components/VehicleSelection';
export { VehicleUpgrade } from '../components/VehicleUpgrade';