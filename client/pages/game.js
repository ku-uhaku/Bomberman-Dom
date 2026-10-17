import { el, Component } from "../framework/index.js";
import { Chat } from "../components/chat.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { cols, rows, tile, msg, event_names } from "/shared/global.js";
import { playSound } from "../global/sound.js";
import { PlayerStats } from "../components/playerStats.js";

import { toCol, toRow } from "/shared/util.js";
const atlas = "/client/assets/images/art.png";
const characters = [0, 1, 2, 3].map((idx) => [
	[0, 96 + 32 * idx],
	[32, 96 + 32 * idx],
]);

const objFrames = {
	bomb: [[0, 64], [32, 64]],
	explosion: [[64, 64], [96, 64]],
	"pu-bombs": [[128, 64], [160, 64]],
	"pu-flames": [[128, 96], [160, 96]],
	"pu-speed": [[128, 128], [160, 128]],
};

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
		this.flips = new Map(); // playerId -> facing left
		this.playerPosHistory = []; // { t, players } snapshots
		this.held = new Set(); // pressed movement key codes
		this.lastMoveDirection = { x: 0, y: 0 };
		this.fpsNode = null;
		this.frames = 0;
		this.fpsAcc = 0;
		this.previousGameState = null;
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
			this.playerPosHistory.push({ t: performance.now(), players: m.snapshot.players });
			if (this.playerPosHistory.length > 2) {
				this.playerPosHistory.shift();
			}

			// sounds
			const me = String(this.props.playerId);
			for (const e of m.events ?? []) {
				if (e.type === event_names.bomb) {
					playSound("bombPlaced");
				}
				else if (e.type === event_names.explode) {
					playSound("explosion");
				}
				else if (e.type === event_names.hit && String(e.playerId) === me) {
					playSound("damaged");
				}
				else if (e.type === event_names.died) {
					playSound("dead");
				}
				else if (e.type === event_names.powerupPicked && String(e.playerId) === me) {
					playSound("powerUp");
				}
			}

			this.previousGameState = {
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
		this.playerPosHistory = [];
		this.previousGameState = null;
		this.players.clear();
		this.flips.clear();
		this.held.clear();
		this.lastMoveDirection = { x: 0, y: 0 };
		this.fit();
		this.state.start = start;
		this.state.snap = null;
		this.state.over = null;
	}

	key(e, down) {
		const t = e.target.tagName;
		if (t === "INPUT" || t === "TEXTAREA"){
			// prevent movement while typing in chat
			return;
		}

		if (e.code === "Space") {
			e.preventDefault();
			if (down && !e.repeat){
				this.props.ws.sendMessage({ type: msg.bomb });
			}
			return;
		}
		const dir = keys[e.code];
		if (!dir){
			return;
		}

		e.preventDefault();
		if (down){
			this.held.add(e.code);
		}
		else {
			this.held.delete(e.code);
		}

		let x = 0;
		let y = 0;
		for (const code of this.held) {
			x += keys[code][0];
			y += keys[code][1];
		}
		x = Math.sign(x);
		y = Math.sign(y);
		if (x === this.lastMoveDirection.x && y === this.lastMoveDirection.y){
			return;
		}

		this.lastMoveDirection = { x, y };
		this.props.ws.sendMessage({ type: msg.input, x, y });
	}

	fit() {
		const size = Math.max(8, Math.floor(Math.min(window.innerWidth / cols, (window.innerHeight - 160) / rows)));
		if (this.root) {
			this.root.style.setProperty("--tile", `${size}px`);
			this.root.style.setProperty("--obj-scale", String(size / tile));
			this.root.style.setProperty("--ui", String(size / tile));
		}
		this.scale = size / tile;
		for (const [id, node] of this.players) {
			const p = this.state.snap?.players[id] ?? this.state.start?.players[id];
			if (p){
				this.movePlayer(node, p.x, p.y);
			}
		}
	}

	tick(delta) {
		// fps counter
		this.frames++;
		this.fpsAcc += delta;
		if (this.fpsAcc >= 500) {
			const text = `${Math.round((this.frames * 1000) / this.fpsAcc)} fps`;
			if (this.fpsNode && this.fpsNode.textContent !== text) {
				this.fpsNode.textContent = text;
			}
			this.frames = 0;
			this.fpsAcc = 0;
		}

		const history = this.playerPosHistory;
		const older = history[0] ?? null;
		const newer = history[1] ?? older;
		if (!older) {
			return;
		}

		for (const [id, node] of this.players) {
			const from = older.players[id];
			const to = newer.players[id];
			
			// move players, lerp between last 2 positions
			this.movePlayer(node, to.x, to.y);

			const dx = to.x - from.x;
			if (dx > 1) {
				this.setFlip(id, node, false);
			}
			else if (dx < -1) {
				this.setFlip(id, node, true);
			}

			const dead = to.lives <= 0;
			if (node.classList.contains("dead") !== dead) {
				node.classList.toggle("dead", dead);
			}

			const flashing = !dead && to.iframes;
			if (node.classList.contains("iframes") !== flashing) {
				node.classList.toggle("iframes", flashing);
			}
		}
	}

	// static map geometry, written once per match
	geoClass(idx, start) {
		if (!start.map.walls.includes(idx)) return "cell";
		return `cell wall-${start.map.wallVariants[idx]}`;
	}

	blockVariant(idx) { return (toCol(idx) + toRow(idx)) % 3; }

	// cell objects, re-evaluated per snapshot
	objClass(idx, start) {
		const c = this.previousGameState;
		if (!c){
			return start.map.blocks.includes(idx) ? `block-${this.blockVariant(idx)}` : "";
		}

		if (c.explosions.has(idx)) return "explosion";
		if (c.bombs.has(idx)) return "bomb";
		const pu = c.powerups.get(idx);
		if (pu) return `pu-${pu}`;
		return c.blocks.has(idx) ? `block-${this.blockVariant(idx)}` : "";
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
			const frames = objFrames[obj];
			if (obj.startsWith("block-")){
				cell["data-obj"] = obj;
			}
			cells.push(el("div", cell, frames ? [el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames })] : []));
		}

		const players = Object.entries(start.players).map(([id, p]) =>
			el("div", {
				key: id,
				class: "player",
				ref: (node) => {
					if (!this.players.has(id)) this.movePlayer(node, p.x, p.y);
					this.players.set(id, node);
				},
			}, el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames: characters[(Number(id) - 1) % characters.length], flip: this.flips.get(id) ?? false }))
		);

		const roster = snap ? snap.players : start.players;
		const me = snap?.players[this.props.playerId];
		const out = me?.lives === 0;
		return root([
			el("div", { class: "hud" }, Object.entries(roster).map(([id, p]) =>
				el(PlayerStats, { key: id, player: p, playerId: this.props.playerId })
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

	movePlayer(node, x, y) {
		const s = this.scale;
		node.style.transform = `translate(${(x - tile / 2) * s}px, ${(y - tile / 2) * s}px) scale(${s})`;
	}

	setFlip(id, node, flip) {
		if (this.flips.get(id) === flip) return;
		this.flips.set(id, flip);
		node.firstChild?.classList.toggle("flip", flip);
	}
}

