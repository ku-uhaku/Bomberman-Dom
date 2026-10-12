import { tickMs } from "../shared/global.js";

export class Loop {
	constructor(onStep) {
		this.onStep = onStep; // (dtMs) => void, once per fixed tick
		this.acc = 0;
		this.last = 0;
		this.timer = null;
	}

	start() {
		this.stop();
		this.last = Date.now();
		this.acc = 0;
		this.timer = setInterval(() => this.tick(), tickMs);
	}

	stop() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	tick() {
		const now = Date.now();
		this.acc += now - this.last;
		this.last = now;
		if (this.acc > 1000) this.acc = 1000; // clamp after a long stall
		while (this.acc >= tickMs) {
			this.onStep(tickMs);
			this.acc -= tickMs;
		}
	}
}
