export class Player  {
    constructor(name) {
        this.name = name
        this.position = { x: 0, y: 0 };
        this.score = 0;
        this.health = 3;
        this.powerUps = {
            speed: 1,
            bombCount: 1,
        };
        this.status = "waiting"; // waiting, playing, dead
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

    setScore(amount) {
        this.score += amount;
    }

    setHealth(amount) {
        this.health = Math.max(0, this.health + amount);
        if (this.health === 0) {
            this.status = "dead";
        }
    }   

    setStatus(status) {
        this.status = status;
    }
    

    addPowerUp(type, amount) {
        if (this.powerUps.hasOwnProperty(type)) {
            this.powerUps[type] += amount;
        }
    }

    removePowerUp(type, amount) {
        if (this.powerUps.hasOwnProperty(type)) {
            this.powerUps[type] = Math.max(0, this.powerUps[type] - amount);
        }
    }
}