export default class Wall {
    constructor(x, y, destructible = false) {
        this.x = x;
        this.y = y;
        this.isDestructible = destructible;
        this.powerUp = null; // PowerUp dropped when destroyed
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }

    setPowerUp(powerUp) {
        this.powerUp = powerUp;
    }

    // returns the dropped power-up (or null)
    destroy() {
        return this.powerUp;
    }
}
