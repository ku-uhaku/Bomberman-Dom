import { msg, chatMax, chatHistory } from "../shared/global.js";

export class Chat {
	constructor(lobby) {
		this.lobby = lobby;
		this.history = []; // { playerId, nickname, text }
	}

	submit(player, text) {
		const clean = text.trim();
		if (!clean)
			return { ok: false, reason: "empty message" };

		if (clean.length > chatMax)
			return { ok: false, reason: `message too long (max ${chatMax})` };

		const message = { playerId: player.id, nickname: player.nickname, text: clean };
		this.history.push(message);
		if (this.history.length > chatHistory){
			// delete old
			this.history.shift();
		}

		this.lobby.sendAll({ type: msg.chatMsg, message });
		return { ok: true };
	}
}
