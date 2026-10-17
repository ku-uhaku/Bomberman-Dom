import http from "node:http";
import { serveStatic } from "./static.js";
import { WebSocketServer } from "ws";
import { chatMax, msg } from "../shared/global.js";
import { findOrCreateRoom } from "./rooms.js";

const PORT = 3000;

const rooms = new Set();
const socketRoom = new WeakMap(); // socket -> room

// socket helpers
function send(socket, obj) {
	if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj));
}

function onMessage(socket, raw) {
	let data;
	try {
		data = JSON.parse(raw);
	} catch {
		return send(socket, { type: msg.error, reason: "invalid json" });
	}
	if (typeof data !== "object" || data === null || Array.isArray(data) || typeof data.type !== "string") {
		return send(socket, { type: msg.error, reason: "invalid message" });
	}

	switch (data.type) {
		case msg.join: {
			if (typeof data.nickname !== "string")
				return send(socket, { type: msg.error, reason: "nickname must be a string" });
			if (socketRoom.has(socket))
				return send(socket, { type: msg.error, reason: "already joined" });
			const nickname = data.nickname.trim();
			if (nickname.length < 1 || nickname.length > 12)
				return send(socket, { type: msg.error, reason: "nickname must be 1-12 characters" });

			const room = findOrCreateRoom(send, rooms, nickname);
			if (room.taken) return send(socket, { type: msg.error, reason: "nickname already taken" });

			const result = room.lobby.join(socket, nickname);
			if (!result.ok) {
				room.lobby.onEmpty();
				return send(socket, { type: msg.error, reason: result.reason });
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
			if (!player) return send(socket, { type: msg.error, reason: "join first" });

			if (data.type === msg.chat) {
				if (typeof data.text !== "string")
					return send(socket, { type: msg.error, reason: "text must be a string" });
				if (data.text.trim().length < 1)
					return send(socket, { type: msg.error, reason: "empty message" });
				if (data.text.trim().length > chatMax)
					return send(socket, { type: msg.error, reason: `message too long (max ${chatMax})` });
				const result = room.chat.submit(player, data.text);
				if (!result.ok) return send(socket, { type: msg.error, reason: result.reason });
				return;
			}

			if (room.getPhase() !== "playing") return;
			if (data.type === msg.input) {
				if (
					!Number.isInteger(data.x) ||
					!Number.isInteger(data.y) ||
					data.x < -1 || data.x > 1 ||
					data.y < -1 || data.y > 1
				)
					return send(socket, { type: msg.error, reason: "input x,y must be -1, 0, or 1" });
				room.game.inputs.set(player.id, { x: data.x, y: data.y });
				return;
			}
			room.game.pendingBombs.add(player.id);
			return;
		}
		default:
			return send(socket, { type: msg.error, reason: "unknown message type" });
	}
}

const server = http.createServer(async (req, res) => {
	try {
		if (req.method !== "GET") {
			res.writeHead(405, { allow: "GET" });
			res.end();
			return;
		}

		const urlPath = new URL(req.url, "http://localhost").pathname;
		if (await serveStatic(res, urlPath)) return;
		await serveStatic(res, "/client/index.html");
	} catch {
		if (!res.headersSent) res.writeHead(500);
		res.end();
	}
});

const wss = new WebSocketServer({
	server,
	maxPayload: 4096,
	perMessageDeflate: false,
	verifyClient: (info) => info.req.headers.origin === `http://${info.req.headers.host}`,
});

wss.on("connection", (socket) => {
	socket.on("message", (raw) => {
		try {
			onMessage(socket, raw.toString());
		} catch {
			socket.close();
		}
	});
	socket.on("error", () => socket.close());
});

server.listen(PORT, () => console.log(`bomberman-dom on http://localhost:${PORT}`));
