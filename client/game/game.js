import Bomb from './bomb.js';
import PowerUp from './powerups.js';
import { EMPTY, BREAKABLE } from './map.js';

const DIRS = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
};
const POWERUP_TYPES = ['speed', 'bomb', 'health', 'push'];
const POWERUP_CHANCE = 0.3;

export default class Game {
    constructor(map) {
        this.map = map;
        this.players = [];
        this.bombs = [];
        this.powerUps = [];
        this.explosions = []; // tiles currently on fire, for the UI: {x, y}
    }

    addPlayer(player) {
        this.players.push(player);
    }

    removePlayer(player) {
        this.players = this.players.filter(p => p !== player);
    }

    bombAt(x, y) {
        return this.bombs.find(b => b.x === x && b.y === y);
    }

    movePlayer(player, direction) {
        const dir = DIRS[direction];
        if (!player.isAlive() || !dir) return false;

        const nx = player.x + dir[0];
        const ny = player.y + dir[1];
        if (!this.map.isWalkable(nx, ny)) return false;

        const bomb = this.bombAt(nx, ny);
        if (bomb) {
            // push the bomb one tile further if allowed, otherwise blocked
            const bx = nx + dir[0];
            const by = ny + dir[1];
            if (!player.canPushBombs || !this.map.isWalkable(bx, by) || this.bombAt(bx, by)) return false;
            bomb.pushBomb(bx, by);
        }

        player.setPosition(nx, ny);
        this.checkPickup(player);
        return true;
    }

    checkPickup(player) {
        const i = this.powerUps.findIndex(p => p.x === player.x && p.y === player.y);
        if (i !== -1) {
            player.takePowerUp(this.powerUps[i]);
            this.powerUps.splice(i, 1);
        }
    }

    placeBomb(player, now = Date.now()) {
        if (!player.isAlive() || this.bombAt(player.x, player.y)) return null;
        const active = this.bombs.filter(b => b.owner === player).length;
        if (active >= player.bombCount) return null;

        const bomb = new Bomb(player.x, player.y, player, now);
        this.bombs.push(bomb);
        return bomb;
    }

    // call this every frame / interval
    update(now = Date.now()) {
        this.explosions = [];
        // loop because chain reactions can add bombs to the "ready" set
        let bomb;
        while ((bomb = this.bombs.find(b => b.shouldExplode(now)))) {
            this.explodeBomb(bomb);
        }
    }

    explodeBomb(bomb) {
        bomb.exploded = true;
        this.bombs = this.bombs.filter(b => b !== bomb);

        const tiles = [{ x: bomb.x, y: bomb.y }];
        for (const [dx, dy] of Object.values(DIRS)) {
            for (let d = 1; d <= bomb.range; d++) {
                const x = bomb.x + dx * d;
                const y = bomb.y + dy * d;
                const cell = this.map.get(x, y);

                if (cell !== EMPTY && cell !== BREAKABLE) break; // solid wall stops blast
                tiles.push({ x, y });
                if (cell === BREAKABLE) {
                    this.destroyWall(x, y);
                    break; // blast stops at the first breakable wall
                }
            }
        }

        for (const t of tiles) {
            for (const p of this.players) {
                if (p.isAlive() && p.x === t.x && p.y === t.y) {
                    p.takeDamage(1);
                    if (p !== bomb.owner) bomb.owner.score += 10;
                }
            }
            // chain reaction
            const other = this.bombAt(t.x, t.y);
            if (other) other.explodeAt = 0;
        }

        this.explosions.push(...tiles);
        return tiles;
    }

    destroyWall(x, y) {
        this.map.set(x, y, EMPTY);
        if (Math.random() < POWERUP_CHANCE) {
            const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            this.powerUps.push(new PowerUp(type, x, y));
        }
    }

    getWinner() {
        const alive = this.players.filter(p => p.isAlive());
        return alive.length === 1 ? alive[0] : null;
    }

    isOver() {
        return this.players.length > 1 && this.players.filter(p => p.isAlive()).length <= 1;
    }
}
