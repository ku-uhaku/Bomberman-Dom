import { Lobby } from "./lobby.js";
import { Chat } from "./chat.js";
import { Game } from "./game/game.js";

export function findOrCreateRoom(send, rooms, nickname) {
	const name = nickname.trim().toLowerCase();
	for (const room of rooms) {
		if (room.lobby.active().some((p) => p.nickname.toLowerCase() === name))
			return { taken: true };
	}

	for (const room of rooms) {
		if (room.phase === "lobby" && room.lobby.acceptingPlayers()) {
			return room;
		}
	}

	return new Room(send, rooms);
}

export class Room {
	constructor(send, rooms) {
		this.phase = "lobby"; // lobby | playing
		this.rooms = rooms;
		this.lobby = new Lobby(send);
		this.game = new Game();
		this.chat = new Chat(this.lobby);

		this.lobby.onCountdownEnd = () => this.startMatch(); // lobby -> game
		this.lobby.onPlayerLeft = (id) => {
			this.game.removePlayer(id);
		};
		this.game.onEnd = () => this.finishMatch(); // game -> lobby
		this.lobby.onEmpty = () => {
			if (this.lobby.active().length === 0 && this.lobby.gameState === "idle" && this.phase === "lobby") {
				this.rooms.delete(this);
			}
		};
		this.rooms.add(this);
	}

	startMatch() {
		this.phase = "playing";
		this.lobby.stop();
		this.game.beginGame(this.lobby.snapshot(), (obj) => this.lobby.sendAll(obj));
	}

	finishMatch() {
		this.phase = "lobby";
		this.lobby.evaluate();
		this.lobby.sendLobby();
		if (this.lobby.onEmpty) {
			this.lobby.onEmpty();
		}
	}
}