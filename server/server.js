import http from "node:http";
import { serveStatic } from "./static.js";
import { WebSocketServer } from "ws";
import { msg } from "../shared/global.js";
import { Lobby } from "./lobby.js";
import { Chat } from "./chat.js";
import { Game } from "./game.js";

const PORT = process.env.PORT || 3000;

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

function send(socket, obj) {
	if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj));
}

function sendError(socket, reason) {
	send(socket, { type: msg.error, reason });
}

const lobby = new Lobby(send);
const chat = new Chat(lobby);
const game = new Game(lobby, send);
lobby.game = game;

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
			const result = lobby.join(socket, data.nickname);
			if (!result.ok) return sendError(socket, result.reason);
			send(socket, { type: msg.joined, playerId: result.playerId });
			send(socket, chat.historyPayload());
			return;
		}
		case msg.chat: {
			const player = lobby.get(socket);
			if (!player) return sendError(socket, "join first");
			if (typeof data.text !== "string")
				return sendError(socket, "text must be a string");
			const result = chat.submit(player, data.text);
			if (!result.ok) return sendError(socket, result.reason);
			return;
		}
		case msg.input: {
			const player = lobby.get(socket);
			if (!player) return sendError(socket, "join first");
			if (typeof data.x !== "number" || typeof data.y !== "number")
				return sendError(socket, "input x,y must be numbers");
			if (game.phase !== "playing") return;
			game.setInput(player.id, { x: data.x, y: data.y });
			return;
		}
		case msg.bomb: {
			const player = lobby.get(socket);
			if (!player) return sendError(socket, "join first");
			if (game.phase !== "playing") return;
			game.requestBomb(player.id);
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
