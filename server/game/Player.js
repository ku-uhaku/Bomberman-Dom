import { lives, iFrames } from "../../shared/global.js";

export class Player {
    constructor(name, id = null) {
        this.id = id;
        this.name = name;
        this.position = { x: 0, y: 0 };
        this.score = 0;
        this.health = lives;
        this.invulnerableUntil = 0;
        this.activeBombs = 0;
        this.powerUps = {
            speed: 1,
            bombCount: 1,
            flames: 1,
        };
        this.status = "waiting"; // waiting, playing, dead
    }

    getId() {
        return this.id;
    }

    getName() {
        return this.name;
    }

    getPosition() {
        return this.position;
    }

    getScore() {
        return this.score;
    }

    getHealth() {
        return this.health;
    }

    getPowerUps() {
        return this.powerUps;
    }

    getStatus() {
        return this.status;
    }

    setPosition(x, y) {
        this.position = { x, y };
    }

    addScore(amount) {
        this.score += amount;
    }

    // negative amount = damage, ignored while invulnerable
    setHealth(amount, now = Date.now()) {
        if (amount < 0) {
            if (now < this.invulnerableUntil || this.status === "dead") return false;
            this.invulnerableUntil = now + iFrames;
        }
        this.health = Math.max(0, this.health + amount);
        if (this.health === 0) {
            this.status = "dead";
        }
        return true;
    }

    setStatus(status) {
        this.status = status;
    }

    isAlive() {
        return this.status !== "dead";
    }

    canPlaceBomb() {
        return this.isAlive() && this.activeBombs < this.powerUps.bombCount;
    }

    addPowerUp(type, amount = 1) {
        if (Object.hasOwn(this.powerUps, type)) {
            this.powerUps[type] += amount;
        }
    }

    removePowerUp(type, amount = 1) {
        if (Object.hasOwn(this.powerUps, type)) {
            this.powerUps[type] = Math.max(0, this.powerUps[type] - amount);
        }
    }
}
