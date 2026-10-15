import http from "node:http";
import { serveStatic } from "./static.js";
import { WebSocketServer } from "ws";
import { msg, maxPlayers } from "../shared/global.js";
import { Lobby } from "./lobby.js";
import { Chat } from "./chat.js";
import { Game } from "./game/game.js";

const PORT = process.env.PORT || 3000;

// each room is an independent lobby + chat + game
const rooms = new Set();
const socketRoom = new WeakMap(); // socket -> room

function createRoom() {
	const lobby = new Lobby(send);
	const room = { lobby, chat: new Chat(lobby), game: new Game(lobby) };
	lobby.game = room.game;
	lobby.onEmpty = () => {
		if (lobby.players.size === 0 && room.game.gameState === "idle") rooms.delete(room);
	};
	rooms.add(room);
	return room;
}

// first room still gathering players, else a fresh one
function findRoom(nickname) {
	const name = nickname.trim().toLowerCase();
	for (const room of rooms) {
		const { lobby, game } = room;
		if (!["idle", "queue", "countdown"].includes(game.gameState)) continue;
		if (lobby.players.size >= maxPlayers) continue;
		if ([...lobby.players.values()].some((p) => p.nickname.toLowerCase() === name)) continue;
		return room;
	}
	return createRoom();
}

// socket helpers
function send(socket, obj) {
	if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj));
}

function sendError(socket, reason) {
	send(socket, { type: msg.error, reason });
}

// server helpers
function respond(res, status, body) {
	res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
	res.end(body);
}

const server = http.createServer(async (req, res) => {
	if (req.method !== "GET") {
		res.writeHead(405, { allow: "GET" });
		res.end();
		return;
	}

	const urlPath = new URL(req.url, "http://localhost").pathname;
	const file = urlPath === "/" ? "/index.html" : urlPath;

	if (await serveStatic(res, file)) return;

	respond(res, 404, "404 Not Found");
});

function onMessage(socket, raw) {
	let data;
	try {
		data = JSON.parse(raw);
	} catch {
		return sendError(socket, "invalid json");
	}
	if (typeof data !== "object" || data === null || typeof data.type !== "string")
		return sendError(socket, "invalid message");

	switch (data.type) {
		case msg.join: {
			if (typeof data.nickname !== "string")
				return sendError(socket, "nickname must be a string");
			if (socketRoom.has(socket)) return sendError(socket, "already joined");
			const room = findRoom(data.nickname);
			const result = room.lobby.join(socket, data.nickname);
			if (!result.ok) {
				room.lobby.onEmpty();
				return sendError(socket, result.reason);
			}
			socketRoom.set(socket, room);
			send(socket, { type: msg.joined, playerId: result.playerId });
			send(socket, { type: msg.chatHistory, messages: room.chat.history });
			return;
		}
		case msg.chat: {
			const room = socketRoom.get(socket);
			const player = room?.lobby.findPlayer(socket);
			if (!player) return sendError(socket, "join first");
			if (typeof data.text !== "string")
				return sendError(socket, "text must be a string");
			const result = room.chat.submit(player, data.text);
			if (!result.ok) return sendError(socket, result.reason);
			return;
		}
		case msg.input: {
			const room = socketRoom.get(socket);
			const player = room?.lobby.findPlayer(socket);
			if (!player) return sendError(socket, "join first");
			const { game } = room;
			if (typeof data.x !== "number" || typeof data.y !== "number")
				return sendError(socket, "input x,y must be numbers");
			if (game.gameState !== "playing") return;
			game.inputs.set(player.id, { x: data.x, y: data.y });
			return;
		}
		case msg.bomb: {
			const room = socketRoom.get(socket);
			const player = room?.lobby.findPlayer(socket);
			if (!player) return sendError(socket, "join first");
			if (room.game.gameState !== "playing") return;
			room.game.pendingBombs.add(player.id);
			return;
		}
		default:
			return sendError(socket, "unknown message type");
	}
}

const wss = new WebSocketServer({
	server,
	maxPayload: 4096,
	verifyClient: (info) => {
		const origin = info.req.headers.origin;
		if (!origin) return true; // non-browser client (curl/test): no origin to check
		return origin === `http://${info.req.headers.host}`;
	},
});

wss.on("connection", (socket) => {
	socket.on("message", (raw) => onMessage(socket, raw.toString()));
});

server.listen(PORT, () => console.log(`bomberman-dom on http://localhost:${PORT}`));
