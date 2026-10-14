import { el, Component } from "../framework/index.js";
import { Chat } from "../components/chat.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { cols, rows, tile, tickMs, baseSpeed, speedStep, msg } from "/shared/global.js";
import { toCol, toRow } from "/shared/util.js";

const atlas = "/assets/images/art.png";
const characters = [
	[[0, 64], [32, 64]],
	[[0, 96], [32, 96]],
];

const keys = {
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
		this.tokens = new Map(); // playerId -> node
		this.buffer = []; // { t, players } snapshots, oldest first
		this.held = new Set(); // pressed movement key codes
		this.sent = { x: 0, y: 0 }; // last intent sent
		this.fpsNode = null;
		this.frames = 0;
		this.fpsAcc = 0;
		this.out = false; // local player is dead: stop sending input
	}

	attach() {
		this.onResize = () => this.fit();
		this.onKey = (e) => this.key(e, e.type === "keydown");
		window.addEventListener("resize", this.onResize);
		window.addEventListener("keydown", this.onKey);
		window.addEventListener("keyup", this.onKey);
		this.offStart = this.props.ws.on(msg.start, (m) => {
			this.state.start = m;
		});
		this.offState = this.props.ws.on(msg.state, (m) => {
			this.buffer.push({ t: performance.now(), players: m.snapshot.players });
			this.state.snap = m.snapshot;
		});
		this.offOver = this.props.ws.on(msg.gameOver, (m) => {
			this.state.over = m;
		});
	}

	detach() {
		window.removeEventListener("resize", this.onResize);
		window.removeEventListener("keydown", this.onKey);
		window.removeEventListener("keyup", this.onKey);
		this.offStart();
		this.offState();
		this.offOver();
	}

	key(e, down) {
		if (this.out || /^(input|textarea)$/i.test(e.target.tagName)) return;
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
		if (!this.root) return;
		const size = Math.max(8, Math.floor(Math.min(window.innerWidth / cols, (window.innerHeight - 90) / rows)));
		this.root.style.setProperty("--tile", `${size}px`);
		this.scale = size / tile;
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
		for (const [id, node] of this.tokens) {
			const from = a.players[id];
			const to = b.players[id];
			if (!from || !to) continue;
			this.place(node, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
			node.classList.toggle("dead", !to.alive);
		}
	}

	cellClass(idx, start, snap) {
		const blocks = snap ? snap.blocks : start.map.blocks;
		if (snap && snap.explosions.includes(idx)) return "cell explosion";
		if (snap && snap.bombs.some((b) => b.i === idx)) return "cell bomb";
		const powerup = snap?.powerups.find(([i]) => i === idx);
		if (powerup) return `cell pu-${powerup[1]}`;
		if (blocks.includes(idx)) return "cell block";
		if (start.map.walls.includes(idx)) {
			const col = toCol(idx);
			const row = toRow(idx);
			const border = col === 0 || row === 0 || col === cols - 1 || row === rows - 1;
			return border ? "cell wall" : "cell pillar";
		}
		return "cell";
	}

	render() {
		const { start, snap, over } = this.state;
		const me = snap?.players[this.props.playerId];
		this.out = !!me && !me.alive;
		if (!start) return el("div", { class: "game" });

		const cells = [];
		for (let idx = 0; idx < cols * rows; idx++)
			cells.push(el("div", { key: idx, class: this.cellClass(idx, start, snap) }));

		const tokens = Object.entries(start.players).map(([id, p], i) =>
			el("div", {
				key: id,
				class: "token",
				ref: (node) => {
					this.tokens.set(id, node);
					this.place(node, p.x, p.y);
				},
			}, el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames: characters[i % characters.length] }))
		);

		return el("div", { class: "game", ref: (node) => { this.root = node; this.fit(); } }, [
			el("div", { class: "hud" }, Object.entries(snap ? snap.players : start.players).map(([id, p]) =>
				el("div", { key: id, class: Number(id) === this.props.playerId ? "hud-player me" : "hud-player" }, [
					el("span", {}, p.nickname),
					el("span", { class: "badges" }, p.alive ? `B${p.maxBombs} F${p.range} S${(p.speed - baseSpeed) / speedStep}` : ""),
					el("span", { class: "hearts" }, p.lives === undefined ? "" : p.alive ? "♥".repeat(p.lives) : "out"),
				])
			)),
			el("div", { class: "fps", ref: (n) => (this.fpsNode = n) }),
			el(Chat, { ws: this.props.ws }),
			el("div", { class: "board" }, [
				...cells,
				...tokens,
				this.out && !over ? el("div", { class: "overlay" }, "You are out") : null,
				over ? el("div", { class: "overlay" }, this.winnerText(over, start)) : null,
			]),
		]);
	}

	winnerText(over, start) {
		if (over.winnerId === null) return "Draw";
		if (over.winnerId === this.props.playerId) return "You win!";
		return `${start.players[over.winnerId]?.nickname ?? "Player"} wins`;
	}

	place(node, x, y) {
		const s = this.scale;
		node.style.transform = `translate(${(x - tile / 2) * s}px, ${(y - tile / 2) * s}px) scale(${s})`;
	}
}
