import {
	cols,
	rows,
	tile,
	playerBox,
	explosionTime,
	powerupChance,
	event_names,
} from "../../shared/global.js";
import { toCol, toRow, toIdx } from "../../shared/util.js";
import { createMap } from "./map.js";
import { Player } from "./Player.js";
import { Bomb } from "./bomb.js";

const half = playerBox / 2;
const powerupTypes = ["bombs", "flames", "speed"];

export class World {
	constructor(players) {
		const { walls, blocks, spawns, wallVariants } = createMap(players.length);
		this.walls = walls;
		this.blocks = blocks;
		this.wallVariants = wallVariants;
		this.bombs = new Map(); // idx -> Bomb
		this.explosions = new Map(); // idx -> ttl
		this.powerups = new Map(); // idx -> type
		this.players = new Map(); // id -> Player
		this.over = false;

		players.forEach((player, i) => {
			const instance = new Player({ ...player, spawn: spawns[i] });
			this.players.set(instance.id, instance);
		});
	}

	// tiles that player overlaps (even if empty)
	boxTiles(x, y) {
		const left = x - half;
		const right = x + half;
		const top = y - half;
		const bottom = y + half;

		const firstCol = Math.max(0, Math.floor(left / tile));
		const lastCol = Math.min(cols - 1, Math.ceil(right / tile) - 1);
		const firstRow = Math.max(0, Math.floor(top / tile));
		const lastRow = Math.min(rows - 1, Math.ceil(bottom / tile) - 1);

		const tiles = [];
		for (let r = firstRow; r <= lastRow; r++){
			for (let c = firstCol; c <= lastCol; c++) {
				tiles.push(toIdx(c, r));
			}
		}
		return tiles;
	}

	collides(x, y) {
		if (
			x - half < 0 ||
			x + half > cols * tile ||
			y - half < 0 ||
			y + half > rows * tile
		){
			return true;
		}

		return this.boxTiles(x, y).some(
			(idx) => this.walls.has(idx) || this.blocks.has(idx)
		);
	}

	placeBomb(id, events) {
		const player = this.players.get(id);
		if (!player || player.lives <= 0) return;

		const idx = player.cell;
		if (this.bombs.has(idx)) return;

		let active = 0;
		for (const bomb of this.bombs.values())
			if (bomb.owner === id) active++;
		if (active >= player.maxBombs) return;

		this.bombs.set(idx, new Bomb(idx, id, player.range));
		events.push({ type: event_names.bomb, playerId: id, idx });
	}

	explode(bomb, events) {
		this.bombs.delete(bomb.idx);

		const baseCol = toCol(bomb.idx);
		const baseRow = toRow(bomb.idx);
		for (const [dc, dr] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		]) {
			// walk in direction until blocked
			for (let d = 1; d <= bomb.range; d++) {
				const c = baseCol + dc * d;
				const r = baseRow + dr * d;
				if (c < 0 || c >= cols || r < 0 || r >= rows){
					// out of map
					break;
				}

				const idx = toIdx(c, r);
				if (this.walls.has(idx)){
					// wall
					break;
				}

				this.explosions.set(idx, explosionTime);
				if (this.blocks.has(idx)) {
					this.blocks.delete(idx);
					if (Math.random() < powerupChance) {
						// spawn upgrade
						const type =
							powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
						this.powerups.set(idx, type);
					}
					break;
				}
			}
		}

		this.explosions.set(bomb.idx, explosionTime);
		events.push({ type: event_names.explode, idx: bomb.idx });
	}

	pickup(player, events) {
		const type = this.powerups.get(player.cell);
		if (!type) return;

		player.applyPowerup(type);
		this.powerups.delete(player.cell);
		events.push({ type: event_names.powerupPicked, playerId: player.id, powerup: type });
	}

	damage(player, dt, events) {
		if (player.iFrames > 0) {
			player.iFrames -= dt;
			return;
		}

		// check player pos for all explosions
		for (const idx of this.boxTiles(player.x, player.y)) {
			if (!this.explosions.has(idx)){
				continue;
			}

			const died = player.takeHit();
			events.push({ type: event_names.hit, playerId: player.id, lives: player.lives });
			if (died){
				events.push({ type: event_names.died, playerId: player.id });
			}
			return;
		}
	}

	checkWin(events) {
		if (this.over){
			return;
		}
		
		const alive = [...this.players.values()].filter((p) => p.lives > 0);
		if (alive.length <= 1) {
			this.over = true;
			events.push({ type: event_names.gameOver, winnerId: alive[0]?.id ?? null });
		}
	}

	// dt in milliseconds
	// inputs: Map playerId -> { x, y }, -1 1
	// bombReqs: playerIds requesting a bomb this tick
	tick(dt, inputs, bombReqs) {
		const events = [];

		for (const id of bombReqs) this.placeBomb(id, events);

		for (const player of this.players.values()) {
			if (player.lives <= 0) continue;
			player.move(this, inputs.get(player.id) ?? { x: 0, y: 0 }, dt);
		}

		for (const [idx, bomb] of [...this.bombs]) {
			if (bomb.tick(dt)) this.explode(bomb, events);
		}

		for (const [idx, ttl] of [...this.explosions]) {
			if (ttl - dt <= 0) this.explosions.delete(idx);
			else this.explosions.set(idx, ttl - dt);
		}

		for (const player of this.players.values()) {
			if (player.lives <= 0) continue;
			this.pickup(player, events);
			this.damage(player, dt, events);
		}

		this.checkWin(events);
		return events;
	}

	syncClient() {
		const players = {};
		for (const player of this.players.values())
			players[player.id] = player.toJson();
		return {
			players,
			blocks: [...this.blocks],
			bombs: [...this.bombs].map(([idx, bomb]) => ({ i: idx, owner: bomb.owner })),
			explosions: [...this.explosions.keys()],
			powerups: [...this.powerups].map(([idx, type]) => [idx, type]),
		};
	}
}
