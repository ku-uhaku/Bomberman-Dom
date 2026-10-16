import { bombTimer } from "../../shared/global.js";

export class Bomb {
	constructor(idx, owner, range) {
		this.idx = idx;
		this.owner = owner;
		this.bombTimer = bombTimer;
		this.range = range;
	}

	tick(dt) {
		this.bombTimer -= dt;
		return this.bombTimer <= 0;
	}
}
