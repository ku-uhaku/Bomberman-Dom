import {
	tile,
	baseSpeed,
	speedStep,
	speedMax,
	lives,
	iFrames,
	blastRange,
	caps,
} from "../../shared/global.js";
import { toIdx, toCenterX, toCenterY } from "../../shared/util.js";

export class Player {
	constructor({ id, nickname, spawn }) {
		const idx = toIdx(spawn[0], spawn[1]);
		this.id = id;
		this.nickname = nickname;
		this.x = toCenterX(idx);
		this.y = toCenterY(idx);
		this.lives = lives;
		this.maxBombs = 1;
		this.range = blastRange;
		this.speed = baseSpeed;
		this.iFrames = 0;
	}

	get cell() {
		return toIdx(Math.floor(this.x / tile), Math.floor(this.y / tile));
	}

	move(world, movement, dt) {
		const length = Math.sqrt(movement.x * movement.x + movement.y * movement.y);
		if (length === 0){
			return;
		}

		const secs = dt / 1000;
		const vx = (movement.x / length) * this.speed * secs;
		const vy = (movement.y / length) * this.speed * secs;

		const nx = this.x + vx;
		if (!world.collides(nx, this.y)) this.x = nx;

		const ny = this.y + vy;
		if (!world.collides(this.x, ny)) this.y = ny;
	}

	applyPowerup(type) {
		if (type === "bombs")
			this.maxBombs = Math.min(caps.bombs, this.maxBombs + 1);
		else if (type === "flames")
			this.range = Math.min(caps.flames, this.range + 1);
		else if (type === "speed")
			this.speed = Math.min(
				baseSpeed + speedMax * speedStep,
				this.speed + speedStep
			);
	}

	takeHit() {
		this.lives -= 1;
		this.iFrames = iFrames;
		if (this.lives <= 0) {
			return true;
		}
		return false;
	}

	toJson() {
		return {
			x: Math.round(this.x),
			y: Math.round(this.y),
			lives: this.lives,
			iframes: this.iFrames > 0,
			maxBombs: this.maxBombs,
			range: this.range,
			speed: this.speed,
			nickname: this.nickname,
		};
	}
}


