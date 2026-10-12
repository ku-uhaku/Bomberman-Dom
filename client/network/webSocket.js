import { msg } from "/shared/global.js";

// payload types a (re)mounting component may replay — everything else is fire-once
const REPLAY = new Set([msg.lobby, msg.chatHistory]);

export class AppWebSocket {
	constructor() {
		this.socket = null;
		this.openPromise = null;
		this.handlers = new Map(); // type -> Set<fn>
		this.last = new Map(); // type -> last payload
	}

	getWebSocketURL() {
		const { protocol, host } = window.location;
		const socketProtocol = protocol === "https:" ? "wss:" : "ws:";
		return `${socketProtocol}//${host}`;
	}

	connect() {
		if (this.openPromise) return this.openPromise;
		const socket = new window.WebSocket(this.getWebSocketURL());
		this.socket = socket;
		this.openPromise = new Promise((resolve, reject) => {
			socket.onopen = () => resolve();
			socket.onerror = () => {
				this.socket = null;
				this.openPromise = null;
				reject(new Error("websocket connection failed"));
			};
			socket.onclose = () => {
				this.socket = null;
				this.openPromise = null;
			};
			socket.onmessage = (event) => this.dispatch(event.data);
		});
		return this.openPromise;
	}

	sendMessage(message) {
		if (!this.socket || this.socket.readyState !== window.WebSocket.OPEN) return false;
		this.socket.send(JSON.stringify(message));
		return true;
	}

	// subscribe to a message type; returns an unsubscribe fn.
	// cached payloads (lobby, chat_history) replay immediately on subscribe.
	on(type, fn) {
		let set = this.handlers.get(type);
		if (!set) {
			set = new Set();
			this.handlers.set(type, set);
		}
		set.add(fn);
		if (this.last.has(type)) fn(this.last.get(type));
		return () => set.delete(fn);
	}

	dispatch(raw) {
		let data;
		try {
			data = JSON.parse(raw);
		} catch {
			return;
		}
		if (!data || typeof data.type !== "string") return;
		if (REPLAY.has(data.type)) this.last.set(data.type, data);
		const set = this.handlers.get(data.type);
		if (set) for (const fn of set) fn(data);
	}
}
