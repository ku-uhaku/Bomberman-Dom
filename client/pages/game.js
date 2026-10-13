import { el, Component } from "../framework/index.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { cols, rows, tile, tickMs, msg } from "/shared/global.js";
import { toCol, toRow } from "/shared/util.js";

const atlas = "/assets/images/art.png";
const characters = [
	[[0, 64], [32, 64]],
	[[0, 96], [32, 96]],
];

export class GamePage extends Component {
	constructor(props) {
		super(props, { start: null, snap: null });
		this.root = null;
		this.scale = 1;
		this.tokens = new Map(); // playerId -> node
		this.buffer = []; // { t, players } snapshots, oldest first
	}

	attach() {
		this.onResize = () => this.fit();
		window.addEventListener("resize", this.onResize);
		this.offStart = this.props.ws.on(msg.start, (m) => {
			this.state.start = m;
		});
		this.offState = this.props.ws.on(msg.state, (m) => {
			this.buffer.push({ t: performance.now(), players: m.snapshot.players });
			this.state.snap = m.snapshot;
		});
	}

	detach() {
		window.removeEventListener("resize", this.onResize);
		this.offStart();
		this.offState();
	}

	fit() {
		if (!this.root) return;
		const size = Math.max(8, Math.floor(Math.min(window.innerWidth / cols, window.innerHeight / rows)));
		this.root.style.setProperty("--tile", `${size}px`);
		this.scale = size / tile;
	}

	// render two ticks in the past so there is always a snapshot pair to lerp between
	tick() {
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
		const { start, snap } = this.state;
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
			el("div", { class: "board" }, [...cells, ...tokens]),
		]);
	}

	place(node, x, y) {
		const s = this.scale;
		node.style.transform = `translate(${(x - tile / 2) * s}px, ${(y - tile / 2) * s}px) scale(${s})`;
	}
}
