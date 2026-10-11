import { explosionTtl } from "../shared/global.js";

export class Explosion {
    // tiles: every { x, y } tile the flames cover (centre included)
    constructor(position, radius, tiles = [], owner = null, duration = explosionTtl) {
        this.position = position;
        this.radius = radius;
        this.tiles = tiles;
        this.owner = owner;
        this.duration = duration; // ms left
    }

    // returns true when the flames are gone
    update(dt) {
        this.duration -= dt;
        return this.duration <= 0;
    }

    covers(x, y) {
        return this.tiles.some((t) => t.x === x && t.y === y);
    }

    getPosition() {
        return this.position;
    }

    getRadius() {
        return this.radius;
    }

    getTiles() {
        return this.tiles;
    }

    getOwner() {
        return this.owner;
    }

    getDuration() {
        return this.duration;
    }
}
