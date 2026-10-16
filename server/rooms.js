import { maxPlayers } from "../shared/global.js";
import { Lobby } from "./lobby.js";
import { Chat } from "./chat.js";
import { Game } from "./game/game.js";

// one Lobby + Chat + Game per room; joiners go to the first room still gathering players.
export function createRoom(send, rooms) {
	const lobby = new Lobby(send);
	const room = { lobby, chat: new Chat(lobby), game: new Game(lobby) };
	lobby.game = room.game;
	lobby.onEmpty = () => {
		if (lobby.active().length === 0 && room.game.gameState === "idle") rooms.delete(room);
	};
	rooms.add(room);
	return room;
}

export function findRoom(send, rooms, nickname) {
	const name = nickname.trim().toLowerCase();
	for (const room of rooms) {
		if (room.lobby.active().some((p) => p.nickname.toLowerCase() === name))
			return { taken: true };
	}
	for (const room of rooms) {
		const { lobby, game } = room;
		if (game.gameState !== "idle" && game.gameState !== "queue" && game.gameState !== "countdown") continue;
		if (lobby.active().length >= maxPlayers) continue;
		return room;
	}
	return createRoom(send, rooms);
}
