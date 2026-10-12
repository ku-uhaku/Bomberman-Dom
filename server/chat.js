import { msg, chatMax, chatHistory, chatRate, chatRateWindow } from "../shared/global.js";

export class Chat {
	constructor(lobby) {
		this.lobby = lobby;
		this.history = []; // { playerId, nickname, text }
		this.rate = new Map(); // playerId -> timestamps[]
	}

	submit(player, text) {
		const clean = text.trim();
		if (!clean) return { ok: false, reason: "empty message" };
		if (clean.length > chatMax)
			return { ok: false, reason: `message too long (max ${chatMax})` };

		const now = Date.now();
		const times = (this.rate.get(player.id) ?? []).filter((t) => now - t < chatRateWindow);
		if (times.length >= chatRate) return { ok: false, reason: "slow down" };
		times.push(now);
		this.rate.set(player.id, times);

		const message = { playerId: player.id, nickname: player.nickname, text: clean };
		this.history.push(message);
		if (this.history.length > chatHistory) this.history.shift();

		this.lobby.sendAll({ type: msg.chatMsg, message });
		return { ok: true };
	}

	historyPayload() {
		return { type: msg.chatHistory, messages: this.history };
	}
}
