import { msg, maxPlayers } from "../shared/global.js";

export class Lobby {
	constructor(send) {
		this.send = send;
		this.players = new Map(); // id -> { id, nickname, socket }
		this.nextPlayerId = 1;
		this.game = null; // set by server
		this.onEmpty = null;
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
		this.game.sync();
		return { ok: true, playerId: id };
	}

	active() {
		return [...this.players.values()];
	}

	leave(id) {
		const player = this.players.get(id);
		if (!player) return;
		this.players.delete(id);
		this.game.inputs.delete(id);
		this.game.sync();
		if (this.onEmpty) this.onEmpty();
	}

	sendLobby() {
		this.sendAll({
			type: msg.lobby,
			players: this.active().map((p) => ({ id: p.id, nickname: p.nickname })),
			queueEndsAt: this.game.queueEndsAt,
			countdownEndsAt: this.game.countdownEndsAt,
		});
	}

	sendAll(obj) {
		for (const p of this.active()) this.send(p.socket, obj);
	}
}
