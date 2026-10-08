export default class PowerUp {
    constructor(type, x, y) {
        this.type = type; // 'speed' | 'bomb' | 'health' | 'push'
        this.x = x;
        this.y = y;
    }

    getType() {
        return this.type;
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }

    getEffect() {
        switch (this.type) {
            case 'speed': return { speedMultiplier: 1.5 };
            case 'bomb': return { bombCount: 1 };
            case 'health': return { healthRestore: 1 };
            case 'push': return { CanPushBombs: true };
            default: return {};
        }
    }
}
