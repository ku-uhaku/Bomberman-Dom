import { roundEndMs, tickMs, msg, event_names } from "../../shared/global.js";
import { World } from "./world.js";

export class Game {
	constructor() {
		this.world = null;
		this.sendAll = null;

		this.inputs = new Map(); // playerId -> { x, y }
		this.pendingBombs = new Set(); // playerIds this tick

		this.over = false;
		this.roundTimer = null; // pause after game_over
		this.loopTimer = null; // 30FPS
		this.loopAcc = 0;
		this.loopLast = 0;
		this.onEnd = null;
	}

	stopLoop() {
		if (this.loopTimer) {
			clearInterval(this.loopTimer);
			this.loopTimer = null;
		}
	}

	loopTick() {
		const now = Date.now();
		this.loopAcc += now - this.loopLast;
		this.loopLast = now;
		if (this.loopAcc > 1000) this.loopAcc = 1000; // background safety
		while (this.loopAcc >= tickMs) {
			this.loopAcc -= tickMs;

			// game loop
			const events = this.world.tick(tickMs, this.inputs, this.pendingBombs);
			this.pendingBombs.clear();
			this.sendAll({ type: msg.state, snapshot: this.world.syncClient(), events });

			const over = events.find((e) => e.type === event_names.gameOver);
			if (over) {
				// end game
				this.stopLoop();
				this.over = true;
				this.sendAll({ type: msg.gameOver, winnerId: over.winnerId });
				this.roundTimer = setTimeout(() => this.endGame(), roundEndMs);
			}
		}
	}

	beginGame(players, sendAll) {
		this.sendAll = sendAll;
		this.over = false;

		this.world = new World(players);
		this.inputs.clear();
		this.pendingBombs.clear();

		const map = {
			walls: [...this.world.walls],
			blocks: [...this.world.blocks],
			wallVariants: this.world.wallVariants,
		};
		const startPlayers = {};
		for (const p of this.world.players.values())
			startPlayers[p.id] = { x: Math.round(p.x), y: Math.round(p.y), nickname: p.nickname };

		this.sendAll({ type: msg.start, map, players: startPlayers });

		// start loop
		this.stopLoop();
		this.loopLast = Date.now();
		this.loopAcc = 0;
		this.loopTimer = setInterval(() => this.loopTick(), tickMs);
	}

	removePlayer(id) {
		const player = this.world?.players.get(id);
		if (player) {
			player.lives = 0;
		}
		this.inputs.delete(id);
	}

	// game_over -> timer -> lobby
	endGame() {
		this.roundTimer = null;
		if (!this.over) {
			return;
		}

		this.over = false;
		this.sendAll({ type: msg.roundEnd });
		if (this.onEnd) {
			this.onEnd();
		}
	}
}

