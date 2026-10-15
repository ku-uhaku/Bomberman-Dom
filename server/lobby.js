import { msg, maxPlayers, graceMs } from "../shared/global.js";

export class Lobby {
	constructor(send) {
		this.send = send;
		this.players = new Map(); // id -> { id, nickname, socket }
		this.nextId = 1;
		this.game = null; // set by server: owns the timer machine
		this.onEmpty = null;
	}

	findPlayer(socket) {
		for (const p of this.players.values()) if (p.socket === socket) return p;
		return null;
	}

	sendAll(obj) {
		for (const p of this.active()) this.send(p.socket, obj);
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

		const id = this.nextId++;
		this.players.set(id, { id, nickname: name, socket, departed: false });
		socket.on("close", () => this.leave(id));
		this.game.sync();
		return { ok: true, playerId: id };
	}

	// players still holding a seat; departed ones are kept only for the grace window
	active() {
		return [...this.players.values()].filter((p) => !p.departed);
	}

	leave(id) {
		const player = this.players.get(id);
		if (!player || player.departed) return;
		// free the nickname immediately so a refresh can rejoin, keep the seat for graceMs
		player.departed = true;
		setTimeout(() => {
			this.players.delete(id);
			this.game.inputs.delete(id);
			this.game.sync();
			if (this.onEmpty) this.onEmpty();
		}, graceMs);
	}

	sendLobby() {
		const players = this.active().map((p) => ({ id: p.id, nickname: p.nickname }));
		this.sendAll({
			type: msg.lobby,
			players,
			queueEndsAt: this.game.queueEndsAt,
			countdownEndsAt: this.game.countdownEndsAt,
		});
	}
}
