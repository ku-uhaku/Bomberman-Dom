import { maxPlayers } from "../shared/global.js";
import { Lobby } from "./lobby.js";
import { Chat } from "./chat.js";
import { Game } from "./game/game.js";

// Multi-lobby routing: one Lobby + Chat + Game per room.
// Joiners go to the first room still gathering players, else a fresh one.
// Rooms running a match (playing/over) are closed to joiners.

export function createRoom(send, rooms) {
	const lobby = new Lobby(send);
	const room = { lobby, chat: new Chat(lobby), game: new Game(lobby) };
	lobby.game = room.game;
	lobby.onEmpty = () => {
		if (lobby.players.size === 0 && room.game.gameState === "idle") rooms.delete(room);
	};
	rooms.add(room);
	return room;
}

export function findRoom(send, rooms, nickname) {
	const name = nickname.trim().toLowerCase();
	for (const room of rooms) {
		const { lobby, game } = room;
		if (game.gameState !== "idle" && game.gameState !== "queue" && game.gameState !== "countdown") continue;
		if (lobby.players.size >= maxPlayers) continue;
		if ([...lobby.players.values()].some((p) => p.nickname.toLowerCase() === name)) continue;
		return room;
	}
	return createRoom(send, rooms);
}
