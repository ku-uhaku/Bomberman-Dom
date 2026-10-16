import { maxPlayers, queueMs, countdownMs, roundEndMs, tickMs, msg, event_names } from "../../shared/global.js";
import { World } from "./world.js";

export class Game {
	constructor(lobby) {
		this.lobby = lobby;
		this.world = null;
		
		this.inputs = new Map(); // playerId -> { x, y }
		this.pendingBombs = new Set(); // playerIds this tick
		
		this.gameState = "idle"; // idle | queue | countdown | playing | over
		this.queueEndsAt = null;
		this.countdownEndsAt = null;
		this.intervalId = null; // deadline checker setInterval
		this.roundTimer = null; // pause after game_over
		this.loopTimer = null; // 30FPS
		this.loopAcc = 0;
		this.loopLast = 0;
	}

	sync() {
		if (this.gameState === "playing") {
			for (const p of this.world.players.values())
				if (!this.lobby.players.has(p.id)) p.lives = 0;
		} else if (this.gameState !== "over") this.evaluate();
		this.lobby.sendLobby();
	}

	evaluate() {
		const n = this.lobby.active().length;
		if (this.gameState === "countdown" || this.gameState === "playing" || this.gameState === "over") return;
		if (n >= maxPlayers) this.startCountdown();
		else if (n >= 2) {
			if (this.gameState === "idle") {
				// start queue
				this.gameState = "queue";
				this.countdownEndsAt = null;
				this.queueEndsAt = Date.now() + queueMs;
				this.stop();
				this.intervalId = setInterval(() => this.checkDeadlines(), 250);
			}
		} else {
			this.reset();
		}
	}

	startCountdown() {
		if (this.gameState === "countdown") return;
		this.gameState = "countdown";
		this.queueEndsAt = null;
		this.countdownEndsAt = Date.now() + countdownMs;
		// run
		this.stop();
		this.intervalId = setInterval(() => this.checkDeadlines(), 250);
	}

	reset() {
		this.gameState = "idle";
		this.queueEndsAt = null;
		this.countdownEndsAt = null;
		if (this.roundTimer) {
			clearTimeout(this.roundTimer);
			this.roundTimer = null;
		}
		this.stop();
	}

	stop() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	checkDeadlines() {
		const now = Date.now();
		if (this.gameState === "queue" && now >= this.queueEndsAt) {
			if (this.lobby.active().length >= 2) this.startCountdown();
			else this.reset();
			this.lobby.sendLobby();
		} else if (this.gameState === "countdown" && now >= this.countdownEndsAt) {
			this.beginGame();
		}
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
		if (this.loopAcc > 1000) this.loopAcc = 1000;
		while (this.loopAcc >= tickMs) {
			this.loopAcc -= tickMs;

			// game loop
			const events = this.world.tick(tickMs, this.inputs, this.pendingBombs);
			this.pendingBombs.clear();
			this.lobby.sendAll({ type: msg.state, snapshot: this.world.syncClient(), events });

			const over = events.find((e) => e.type === event_names.gameOver);
			if (over) {
				// end game
				this.stopLoop();
				this.gameState = "over";
				this.lobby.sendAll({ type: msg.gameOver, winnerId: over.winnerId });
				this.roundTimer = setTimeout(() => this.endGame(), roundEndMs);
			}
		}
	}

	beginGame() {
		this.stop();
		this.gameState = "playing";
		this.queueEndsAt = null;
		this.countdownEndsAt = null;

		const players = this.lobby.active().map((p) => ({
			id: p.id,
			nickname: p.nickname,
		}));
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

		this.lobby.sendAll({ type: msg.start, map, players: startPlayers });

		// start loop
		this.stopLoop();
		this.loopLast = Date.now();
		this.loopAcc = 0;
		this.loopTimer = setInterval(() => this.loopTick(), tickMs);
	}

	// game_over -> roundEndMs -> back to the lobby
	endGame() {
		this.roundTimer = null;
		if (this.gameState !== "over")
			return;
		
		this.gameState = "idle";
		this.lobby.sendAll({ type: msg.roundEnd });
		this.evaluate();
		this.lobby.sendLobby();
		
		if (this.lobby.onEmpty) this.lobby.onEmpty();
	}
}

