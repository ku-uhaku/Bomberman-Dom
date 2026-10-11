import { maxPlayers, blastRange } from "../shared/global.js";
import { Bomb } from "./bomb.js";
import { Explosion } from "./explosion.js";

const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
];

export class Game {
    constructor() {
        // map must provide isWall(x, y) and isBox(x, y) in tile coords
        this.map = null;
        this.players = [];
        this.bombs = [];
        this.explosions = [];
        this.powerups = [];
        this.gameState = "waiting"; // waiting, countdown, playing, over
        this.startTime = null;
    }

    addPlayer(player) {
        if (this.players.length >= maxPlayers) {
            throw new Error("Maximum number of players reached");
        }
        this.players.push(player);
    }

    removePlayer(player) {
        const index = this.players.indexOf(player);
        if (index !== -1) {
            this.players.splice(index, 1);
        }
    }

    start() {
        this.gameState = "playing";
        this.startTime = Date.now();
        this.players.forEach((p) => p.setStatus("playing"));
    }

    getAlivePlayers() {
        return this.players.filter((p) => p.isAlive());
    }

    // the last player standing, or null while the round is still going
    getWinner() {
        const alive = this.getAlivePlayers();
        return alive.length === 1 ? alive[0] : null;
    }

    placeBomb(player) {
        if (!player.canPlaceBomb()) return null;
        const { x, y } = player.getPosition();
        if (this.bombs.some((b) => b.position.x === x && b.position.y === y)) return null;

        const radius = blastRange + player.powerUps.flames - 1;
        const bomb = new Bomb({ x, y }, player, radius);
        player.activeBombs++;
        this.bombs.push(bomb);
        return bomb;
    }

    // flames spread in 4 directions, stop at walls, and stop after burning a box
    getBlastTiles(bomb) {
        const { x, y } = bomb.getPosition();
        const tiles = [{ x, y }];
        for (const d of dirs) {
            for (let i = 1; i <= bomb.getExplosionRadius(); i++) {
                const tx = x + d.x * i;
                const ty = y + d.y * i;
                if (this.map.isWall(tx, ty)) break;
                tiles.push({ x: tx, y: ty });
                if (this.map.isBox(tx, ty)) break;
            }
        }
        return tiles;
    }

    explodeBomb(bomb) {
        if (bomb.getStatus() !== "active") return null;
        bomb.explode();
        bomb.getOwner().activeBombs--;

        const explosion = new Explosion(
            bomb.getPosition(),
            bomb.getExplosionRadius(),
            this.getBlastTiles(bomb),
            bomb.getOwner()
        );
        this.explosions.push(explosion);

        // chain reaction
        for (const other of this.bombs) {
            if (other.getStatus() === "active" && explosion.covers(other.position.x, other.position.y)) {
                this.explodeBomb(other);
            }
        }
        return explosion;
    }

    // dt in ms
    update(dt) {
        if (this.gameState !== "playing") return;

        for (const bomb of [...this.bombs]) {
            if (bomb.update(dt)) this.explodeBomb(bomb);
        }
        this.bombs = this.bombs.filter((b) => b.getStatus() === "active");

        this.explosions = this.explosions.filter((e) => !e.update(dt));

        if (this.players.length > 1 && this.getAlivePlayers().length <= 1) {
            this.gameState = "over";
        }
    }
}
