import { maxPlayers, queueMs, countdownMs, roundEndMs, tickMs, msg, event_names } from "../../shared/global.js";
import { World } from "./world.js";

export class Game {
	constructor(lobby) {
		this.lobby = lobby;
		this.phase = "idle"; // idle | queue | countdown | playing | over
		this.queueEndsAt = null;
		this.countdownEndsAt = null;
		this.world = null;
		this.interval = null; // phase deadline checker (250ms)
		this.roundTimer = null; // pause after game_over before the next round
		this.loopTimer = null; // 30Hz simulation loop
		this.loopAcc = 0;
		this.loopLast = 0;
		this.inputs = new Map(); // playerId -> { x, y }
		this.pendingBombs = new Set(); // playerIds this tick
	}

	setInput(playerId, intent) {
		this.inputs.set(playerId, intent);
	}

	requestBomb(playerId) {
		this.pendingBombs.add(playerId);
	}

	sync() {
		if (this.phase !== "playing") this.evaluate();
		this.lobby.broadcast();
	}

	evaluate() {
		const n = this.lobby.players.size;
		if (n >= maxPlayers) {
			if (this.phase === "idle" || this.phase === "queue") this.startCountdown();
		} else if (n >= 2) {
			if (this.phase === "idle") this.startQueue();
		} else {
			this.reset();
		}
	}

	startQueue() {
		this.phase = "queue";
		this.countdownEndsAt = null;
		this.queueEndsAt = Date.now() + queueMs;
		this.run();
	}

	startCountdown() {
		this.phase = "countdown";
		this.queueEndsAt = null;
		this.countdownEndsAt = Date.now() + countdownMs;
		this.run();
	}

	reset() {
		this.phase = "idle";
		this.queueEndsAt = null;
		this.countdownEndsAt = null;
		if (this.roundTimer) {
			clearTimeout(this.roundTimer);
			this.roundTimer = null;
		}
		this.stop();
	}

	run() {
		this.stop();
		this.interval = setInterval(() => this.tick(), 250);
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	tick() {
		const now = Date.now();
		if (this.phase === "queue" && now >= this.queueEndsAt) {
			if (this.lobby.players.size >= 2) this.startCountdown();
			else this.reset();
			this.lobby.broadcast();
		} else if (this.phase === "countdown" && now >= this.countdownEndsAt) {
			this.beginMatch();
		}
	}

	startLoop() {
		this.stopLoop();
		this.loopLast = Date.now();
		this.loopAcc = 0;
		this.loopTimer = setInterval(() => this.loopTick(), tickMs);
	}

	stopLoop() {
		if (this.loopTimer) {
			clearInterval(this.loopTimer);
			this.loopTimer = null;
		}
	}

	// accumulator: never drop a tick, clamp after a long stall
	loopTick() {
		const now = Date.now();
		this.loopAcc += now - this.loopLast;
		this.loopLast = now;
		if (this.loopAcc > 1000) this.loopAcc = 1000;
		while (this.loopAcc >= tickMs) {
			this.advance(tickMs);
			this.loopAcc -= tickMs;
		}
	}

	beginMatch() {
		this.stop();
		this.phase = "playing";
		this.queueEndsAt = null;
		this.countdownEndsAt = null;

		const players = [...this.lobby.players.values()].map((p) => ({
			id: p.id,
			nickname: p.nickname,
		}));
		this.world = new World(players);

		const map = {
			walls: [...this.world.walls],
			blocks: [...this.world.blocks],
		};
		const startPlayers = {};
		for (const p of this.world.players.values())
			startPlayers[p.id] = { x: Math.round(p.x), y: Math.round(p.y), nickname: p.nickname };

		this.lobby.sendAll({ type: msg.start, map, players: startPlayers });

		this.startLoop();
	}

	advance(dt) {
		const events = this.world.step(dt, this.inputs, this.pendingBombs);
		this.pendingBombs.clear();
		this.lobby.sendAll({ type: msg.state, snapshot: this.world.toSnapshot(), events });

		const over = events.find((e) => e.type === event_names.gameOver);
		if (over) {
			this.stopLoop();
			this.phase = "over";
			this.lobby.sendAll({ type: msg.gameOver, winnerId: over.winnerId });
			this.roundTimer = setTimeout(() => this.endRound(), roundEndMs);
		}
	}

	// game_over -> roundEndMs -> back to the lobby, roster kept
	endRound() {
		this.roundTimer = null;
		if (this.phase !== "over") return;
		this.phase = "idle";
		this.lobby.sendAll({ type: msg.roundEnd });
		this.evaluate();
		this.lobby.broadcast();
	}
}
