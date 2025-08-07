/**
 * Engine Audio System
 */
export class EngineAudio {
    constructor() {
        this.audioContext = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.source = null;
        this.gainNode = null;
        this.vehicle = null;
        this.rpm = 0;
    }

    initialize() {
        this.isInitialized = true;
        return Promise.resolve();
    }

    dispose() {
        this.isInitialized = false;
    }
}

export default EngineAudio;