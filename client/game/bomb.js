export default class Bomb {
    constructor(x, y, owner, now = Date.now()) {
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.range = 1;
        this.explodeAt = now + 3000; // 3 seconds
        this.exploded = false;
    }

    shouldExplode(now) {
        return !this.exploded && now >= this.explodeAt;
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }

    pushBomb(newX, newY) {
        this.x = newX;
        this.y = newY;
    }
}
