import { msg } from "../../shared/global.js";

const replay = new Set([msg.lobby, msg.chatHistory, msg.start]);

export class AppWebSocket {
	constructor() {
		this.socket = null;
		this.openPromise = null;
		this.handlers = new Map(); // type -> Set<fn>
		this.last = new Map(); // type -> last payload
	}

	connect() {
		if (this.openPromise) {
			return this.openPromise;
		}

		// open websocket
		const { protocol, host } = window.location;
		const socketProtocol = protocol === "https:" ? "wss:" : "ws:";
		let socket;
		try {
			socket = new window.WebSocket(`${socketProtocol}//${host}`);
		} catch (error) {
			return Promise.reject(error);
		}
		this.socket = socket;

		this.openPromise = new Promise((resolve, reject) => {
			let opened = false;
			let settled = false;

			socket.onerror = () => {
				if (!opened && !settled) {
					settled = true;
					this.clearSocket(socket);
					reject(new Error("websocket connection failed"));
				}
			};
			socket.onclose = () => {
				this.clearSocket(socket);
				if (!opened && !settled) {
					settled = true;
					reject(new Error("websocket connection closed before opening"));
				} else if (opened) {
					this.dispatch({ type: msg.error, reason: "connection closed" });
				}
			};
			socket.onmessage = (event) => {
				let data;
				try {
					data = JSON.parse(event.data);
				} catch {
					return;
				}
				if (!data || typeof data.type !== "string") return;
				if (data.type === msg.roundEnd) this.last.delete(msg.start);
				else if (replay.has(data.type)) this.last.set(data.type, data);
				this.dispatch(data);
			};
			socket.onopen = () => {
				opened = true;
				settled = true;
				resolve();
			};
		});
		return this.openPromise;
	}

	clearSocket(socket) {
		if (this.socket !== socket) return;
		this.socket = null;
		this.openPromise = null;
	}

	dispatch(message) {
		const set = this.handlers.get(message.type);
		if (set) for (const fn of set) fn(message);
	}

	sendMessage(message) {
		if (!this.socket || this.socket.readyState !== window.WebSocket.OPEN) {
			this.dispatch({ type: msg.error, reason: "not connected" });
			return false;
		}
		try {
			this.socket.send(JSON.stringify(message));
			return true;
		} catch {
			this.dispatch({ type: msg.error, reason: "message could not be sent" });
			return false;
		}
	}

	on(type, fn) {
		let set = this.handlers.get(type);
		if (!set) {
			set = new Set();
			this.handlers.set(type, set);
		}
		set.add(fn);
		if (this.last.has(type)) fn(this.last.get(type));

		// return unsubscribe function
		return () => set.delete(fn);
	}
}
