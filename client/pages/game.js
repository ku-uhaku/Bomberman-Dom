import { el, Component } from "../framework/index.js";
import { Chat } from "../components/chat.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { cols, rows, tile, tickMs, baseSpeed, speedStep, msg } from "/shared/global.js";
import { toCol, toRow } from "/shared/util.js";

const atlas = "/assets/images/art.png";
const characters = [0, 1, 2, 3].map((idx) => [
	[0, 64 + 32 * idx],
	[32, 64 + 32 * idx],
]);

const keys = { // suport arrows and WASD
	KeyW: [0, -1], ArrowUp: [0, -1],
	KeyS: [0, 1], ArrowDown: [0, 1],
	KeyA: [-1, 0], ArrowLeft: [-1, 0],
	KeyD: [1, 0], ArrowRight: [1, 0],
};

export class GamePage extends Component {
	constructor(props) {
		super(props, { start: null, snap: null, over: null });
		this.root = null;
		this.scale = 1;
		this.players = new Map(); // playerId -> node
		this.buffer = []; // { t, players } snapshots, oldest first
		this.held = new Set(); // pressed movement key codes
		this.sent = { x: 0, y: 0 }; // last intent sent
		this.fpsNode = null;
		this.frames = 0;
		this.fpsAcc = 0;
		this.cache = null; // per-snapshot Sets for O(1) objClass
	}

	attach() {
		this.onResize = () => this.fit();
		this.onKey = (e) => this.key(e, e.type === "keydown");
		window.addEventListener("resize", this.onResize);
		window.addEventListener("keydown", this.onKey);
		window.addEventListener("keyup", this.onKey);
		const ws = this.props.ws;
		this.offStart = ws.on(msg.start, (m) => this.reset(m));
		this.offState = ws.on(msg.state, (m) => {
			this.buffer.push({ t: performance.now(), players: m.snapshot.players });
			this.cache = {
				blocks: new Set(m.snapshot.blocks),
				bombs: new Set(m.snapshot.bombs.map((b) => b.i)),
				explosions: new Set(m.snapshot.explosions),
				powerups: new Map(m.snapshot.powerups),
			};
			this.state.snap = m.snapshot;
		});
		this.offOver = ws.on(msg.gameOver, (m) => {
			this.state.over = m;
		});
		this.offRoundEnd = ws.on(msg.roundEnd, () => {
			this.state.start = null;
			this.state.snap = null;
			this.state.over = null;
		});
	}

	detach() {
		window.removeEventListener("resize", this.onResize);
		window.removeEventListener("keydown", this.onKey);
		window.removeEventListener("keyup", this.onKey);
		this.offStart();
		this.offState();
		this.offOver();
		this.offRoundEnd();
	}

	reset(start) {
		this.buffer = [];
		this.cache = null;
		this.players.clear();
		this.held.clear();
		this.sent = { x: 0, y: 0 };
		this.fit();
		this.state.start = start;
		this.state.snap = null;
		this.state.over = null;
	}

	key(e, down) {
		if (/^(input|textarea)$/i.test(e.target.tagName)) return;
		if (e.code === "Space") {
			e.preventDefault();
			if (down && !e.repeat) this.props.ws.sendMessage({ type: msg.bomb });
			return;
		}
		const dir = keys[e.code];
		if (!dir) return;
		e.preventDefault();
		if (down) this.held.add(e.code);
		else this.held.delete(e.code);
		let x = 0;
		let y = 0;
		for (const code of this.held) {
			x += keys[code][0];
			y += keys[code][1];
		}
		x = Math.sign(x);
		y = Math.sign(y);
		if (x === this.sent.x && y === this.sent.y) return;
		this.sent = { x, y };
		this.props.ws.sendMessage({ type: msg.input, x, y });
	}

	fit() {
		const size = Math.max(8, Math.floor(Math.min(window.innerWidth / cols, (window.innerHeight - 160) / rows)));
		if (this.root) this.root.style.setProperty("--tile", `${size}px`);
		this.scale = size / tile;
		for (const [id, node] of this.players) {
			const p = this.state.snap?.players[id] ?? this.state.start?.players[id];
			if (p) this.place(node, p.x, p.y);
		}
	}

	// render two ticks in the past so there is always a snapshot pair to lerp between
	tick(delta) {
		this.frames++;
		this.fpsAcc += delta;
		if (this.fpsAcc >= 500) {
			const text = `${Math.round((this.frames * 1000) / this.fpsAcc)} fps`;
			if (this.fpsNode && this.fpsNode.textContent !== text) this.fpsNode.textContent = text;
			this.frames = 0;
			this.fpsAcc = 0;
		}
		const buf = this.buffer;
		if (!buf.length) return;
		const at = performance.now() - 2 * tickMs;
		while (buf.length > 2 && buf[1].t <= at) buf.shift();
		const a = buf[0];
		const b = buf[1] ?? a;
		const k = b.t > a.t ? Math.min(1, Math.max(0, (at - a.t) / (b.t - a.t))) : 1;
		for (const [id, node] of this.players) {
			const from = a.players[id];
			const to = b.players[id];
			if (!from || !to) continue;
			this.place(node, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
			if (node.classList.contains("dead") === !to.alive) continue;
			node.classList.toggle("dead", !to.alive);
		}
	}

	// static map geometry, written once per match
	geoClass(idx, start) {
		if (!start.map.walls.includes(idx)) return "cell";
		const border = toCol(idx) === 0 || toRow(idx) === 0 || toCol(idx) === cols - 1 || toRow(idx) === rows - 1;
		return border ? "cell wall" : "cell pillar";
	}

	// cell objects, re-evaluated per snapshot
	objClass(idx, start) {
		const c = this.cache;
		if (!c) return start.map.blocks.includes(idx) ? "block" : "";
		if (c.explosions.has(idx)) return "explosion";
		if (c.bombs.has(idx)) return "bomb";
		const pu = c.powerups.get(idx);
		if (pu) return `pu-${pu}`;
		return c.blocks.has(idx) ? "block" : "";
	}

	render() {
		const { start, snap, over } = this.state;
		const root = (children) =>
			el("div", { class: "game", ref: (node) => { this.root = node; this.fit(); } }, children);
		if (!start) return root([]);

		// convert cells into html
		const cells = [];
		for (let idx = 0; idx < cols * rows; idx++) {
			const cell = { key: idx, class: this.geoClass(idx, start) };
			const obj = this.objClass(idx, start);
			if (obj) cell["data-obj"] = obj;
			cells.push(el("div", cell));
		}

		const players = Object.entries(start.players).map(([id, p]) =>
			el("div", {
				key: id,
				class: "player",
				ref: (node) => {
					if (!this.players.has(id)) this.place(node, p.x, p.y);
					this.players.set(id, node);
				},
			}, el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames: characters[(Number(id) - 1) % characters.length] }))
		);

		const roster = snap ? snap.players : start.players;
		const me = snap?.players[this.props.playerId];
		const out = me?.alive === false;
		return root([
			el("div", { class: "hud" }, Object.entries(roster).map(([id, p]) =>
				el("div", { key: id, class: String(id) === String(this.props.playerId) ? "hud-player me" : "hud-player" }, [
					el("span", {}, p.nickname),
					el("span", { class: "badges" }, p.alive ? `B${p.maxBombs} F${p.range} S${Math.round((p.speed - baseSpeed) / speedStep)}` : ""),
					el("span", { class: "hearts" }, p.lives === undefined ? "" : p.alive ? "♥".repeat(p.lives) : "out"),
				])
			)),
			el("div", { class: "fps", ref: (n) => (this.fpsNode = n) }),
			el(Chat, { ws: this.props.ws }),
			el("div", { class: "board" }, [
				...cells,
				...players,
				out && !over ? el("div", { class: "overlay" }, "You are out") : null,
				over ? el("div", { class: "overlay" }, this.winnerText(over, start)) : null,
			]),
		]);
	}

	winnerText(over, start) {
		if (over.winnerId === null) return "Draw";
		if (String(over.winnerId) === String(this.props.playerId)) return "You win!";
		return `${start.players[over.winnerId]?.nickname ?? "Player"} wins`;
	}

	place(node, x, y) {
		const s = this.scale;
		node.style.transform = `translate(${(x - tile / 2) * s}px, ${(y - tile / 2) * s}px) scale(${s})`;
	}
}
