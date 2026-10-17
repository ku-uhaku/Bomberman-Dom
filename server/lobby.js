import { msg, maxPlayers, queueMs, countdownMs } from "../shared/global.js";

export class Lobby {
	constructor(send) {
		this.send = send;
		this.players = new Map(); // id -> { id, nickname, socket }
		this.nextPlayerId = 1;
		this.onEmpty = null;
		this.onCountdownEnd = null;
		this.onPlayerLeft = null;

		this.gameState = "idle"; // idle | queue | countdown | playing
		this.queueEndsAt = null;
		this.countdownEndsAt = null;
		this.intervalId = null; // deadline checker setInterval
	}

	findPlayer(socket) {
		for (const p of this.players.values()) if (p.socket === socket) return p;
		return null;
	}

	join(socket, nickname) {
		if (this.findPlayer(socket)) return { ok: false, reason: "already joined" };

		const name = nickname.trim();
		if (name.length < 1 || name.length > 12)
			return { ok: false, reason: "nickname must be 1-12 characters" };
		if (this.active().length >= maxPlayers)
			return { ok: false, reason: "lobby is full" };
		if (this.active().some((p) => p.nickname.toLowerCase() === name.toLowerCase()))
			return { ok: false, reason: "nickname already taken" };

		const id = this.nextPlayerId++;
		this.players.set(id, { id, nickname: name, socket });
		socket.on("close", () => this.leave(id));
		this.updateLobbyState();
		this.sendLobby();
		return { ok: true, playerId: id };
	}

	active() {
		return [...this.players.values()];
	}

	acceptingPlayers() {
		return this.gameState !== "playing" && this.players.size < maxPlayers;
	}

	snapshot() {
		return this.active().map((p) => ({
			id: p.id,
			nickname: p.nickname,
		}));
	}

	leave(id) {
		const player = this.players.get(id);
		if (!player) {
			return;
		}
		this.players.delete(id);
		this.updateLobbyState();
		this.sendLobby();
		if (this.onEmpty) {
			this.onEmpty();
		}
		if (this.onPlayerLeft) {
			this.onPlayerLeft(id);
		}
	}

	updateLobbyState() {
		if (this.gameState === "playing") return;

		const n = this.players.size;
		if (n >= maxPlayers) {
			this.startCountdown();
			return;
		}
		if (n < 2) {
			this.reset();
			return;
		}

		if (this.gameState === "queue") return;

		// start queue
		this.gameState = "queue";
		this.countdownEndsAt = null;
		this.queueEndsAt = Date.now() + queueMs;
		this.stop();
		this.intervalId = setInterval(() => this.checkDeadlines(), 250);
	}

	startCountdown() {
		if (this.gameState === "countdown") {
			return;
		}
		this.gameState = "countdown";
		this.queueEndsAt = null;
		this.countdownEndsAt = Date.now() + countdownMs;
		this.stop();
		this.intervalId = setInterval(() => this.checkDeadlines(), 250);
	}

	reset() {
		this.gameState = "idle";
		this.queueEndsAt = null;
		this.countdownEndsAt = null;
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
			if (this.active().length >= 2) {
				this.startCountdown();
			}
			else {
				this.reset();
			}
			this.sendLobby();
		}
		else if (this.gameState === "countdown" && now >= this.countdownEndsAt) {
			this.gameState = "playing";
			this.countdownEndsAt = null;
			this.stop();
			this.onCountdownEnd?.();
		}
	}

	sendLobby() {
		this.sendAll({
			type: msg.lobby,
			players: this.active().map((p) => ({ id: p.id, nickname: p.nickname })),
			queueEndsAt: this.queueEndsAt,
			countdownEndsAt: this.countdownEndsAt,
		});
	}

	sendAll(obj) {
		for (const p of this.active()){
			this.send(p.socket, obj);
		}
	}
}
