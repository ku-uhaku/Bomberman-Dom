import { fuse } from "../../shared/global.js";

export class Bomb {
	constructor(idx, owner, range) {
		this.idx = idx;
		this.owner = owner;
		this.fuse = fuse;
		this.range = range;
	}

	tick(dt) {
		this.fuse -= dt;
		return this.fuse <= 0;
	}
}
