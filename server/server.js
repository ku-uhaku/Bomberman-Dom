import http from "node:http";
import { serveStatic } from "./static.js";
import { WebSocketServer } from "ws";
import { msg } from "../shared/global.js";
import { findOrCreateRoom } from "./rooms.js";

const PORT = 3000;

// room -> lobby + chat + game
const rooms = new Set();
const socketRoom = new WeakMap(); // socket -> room

// socket helpers
function send(socket, obj) {
	if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj));
}

function sendError(socket, reason) {
	send(socket, { type: msg.error, reason });
}

const server = http.createServer(async (req, res) => {
	if (req.method !== "GET") {
		res.writeHead(405, { allow: "GET" });
		res.end();
		return;
	}

	const urlPath = new URL(req.url, "http://localhost").pathname;
	if (await serveStatic(res, urlPath)) return;
	await serveStatic(res, "/client/index.html");
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

			if (socketRoom.has(socket))
				return sendError(socket, "already joined");

			const room = findOrCreateRoom(send, rooms, data.nickname);
			if (room.taken) return sendError(socket, "nickname already taken");

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
		case msg.chat:
		case msg.input:
		case msg.bomb: {
			const room = socketRoom.get(socket);
			const player = room?.lobby.findPlayer(socket);
			if (!player) return sendError(socket, "join first");

			if (data.type === msg.chat) {
				if (typeof data.text !== "string")
					return sendError(socket, "text must be a string");
				const result = room.chat.submit(player, data.text);
				if (!result.ok)
					return sendError(socket, result.reason);
				return;
			}
			if (room.game.gameState !== "playing") return;
			if (data.type === msg.input) {
				if (typeof data.x !== "number" || typeof data.y !== "number")
					return sendError(socket, "input x,y must be numbers");
				room.game.inputs.set(player.id, { x: data.x, y: data.y });
				return;
			}
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
	verifyClient: (info) => info.req.headers.origin === `http://${info.req.headers.host}`,
});

wss.on("connection", (socket) => {
	socket.on("message", (raw) => onMessage(socket, raw.toString()));
});

server.listen(PORT, () => console.log(`bomberman-dom on http://localhost:${PORT}`));
