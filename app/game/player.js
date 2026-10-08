export default class Player {
    constructor(name, x = 1, y = 1) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.health = 3;
        this.score = 0;
        this.powerUps = [];
        this.speedMultiplier = 1;
        this.bombCount = 1; // max bombs on the map at once
        this.canPushBombs = false;
        this.isConnected = false;
    }

    getName() { return this.name; }
    getPosition() { return { x: this.x, y: this.y }; }
    setPosition(x, y) { this.x = x; this.y = y; }
    getHealth() { return this.health; }
    isAlive() { return this.health > 0; }

    takeDamage(amount = 1) {
        this.health = Math.max(0, this.health - amount);
    }

    takePowerUp(powerUp) {
        const e = powerUp.getEffect();
        if (e.speedMultiplier) this.speedMultiplier = e.speedMultiplier;
        if (e.bombCount) this.bombCount += e.bombCount;
        if (e.healthRestore) this.health += e.healthRestore;
        if (e.CanPushBombs) this.canPushBombs = true;
        this.powerUps.push(powerUp.getType());
    }

    playerInfo() {
        return {
            name: this.name,
            position: this.getPosition(),
            health: this.health,
            score: this.score,
            powerUps: this.powerUps,
        };
    }
}
