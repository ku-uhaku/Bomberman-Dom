import { fuse, blastRange } from "../shared/global.js";

let nextId = 1;

export class Bomb {
    // position is a tile: { x, y }. timer is in ms.
    constructor(position, owner, explosionRadius = blastRange, status = "active", timer = fuse) {
        this.id = nextId++;
        this.position = position;
        this.timer = timer;
        this.explosionRadius = explosionRadius;
        this.owner = owner;
        this.status = status; // active, exploded
    }

    // returns true when the bomb should explode
    update(dt) {
        if (this.status !== "active") return false;
        this.timer -= dt;
        return this.timer <= 0;
    }

    explode() {
        this.status = "exploded";
        this.timer = 0;
    }

    getId() {
        return this.id;
    }

    getPosition() {
        return this.position;
    }

    getTimer() {
        return this.timer;
    }

    getExplosionRadius() {
        return this.explosionRadius;
    }

    getOwner() {
        return this.owner;
    }

    getStatus() {
        return this.status;
    }

    setPosition(x, y) {
        this.position = { x, y };
    }

    setTimer(ms) {
        this.timer = ms;
    }

    setExplosionRadius(radius) {
        this.explosionRadius = radius;
    }

    setOwner(player) {
        this.owner = player;
    }

    setStatus(status) {
        this.status = status;
    }
}
