import { el, Component } from "../framework/index.js";
import { Chat } from "../components/chat.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { cols, rows, tile, msg, event_names } from "/shared/global.js";
import { playMusic, playSound, stopMusic } from "../global/sound.js";
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
		this.players = new Map(); // playerId -> node
		this.flips = new Map(); // playerId -> facing left
		this.held = new Set(); // pressed movement key codes
		this.lastMoveDirection = { x: 0, y: 0 };
		this.previousGameState = null;
		this.previousSnapshot = null;
		this.rootNode = null;
		this.frameColor = false;
		
	}

	attach() {
		playMusic("game");
		this.onKey = (e) => this.key(e, e.type === "keydown");

		window.addEventListener("keydown", this.onKey);
		window.addEventListener("keyup", this.onKey);

		const ws = this.props.ws;
		this.offStart = ws.on(msg.start, (m) => this.reset(m));
		this.offState = ws.on(msg.state, (m) => {
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
			this.updatePlayers(m.snapshot.players, this.previousSnapshot);
		this.previousSnapshot = m.snapshot.players;
		});
		this.offOver = ws.on(msg.gameOver, (m) => {
			this.state.over = m;
		});
		this.offRoundEnd = ws.on(msg.roundEnd, () => {
			this.state.start = null;
			this.state.snap = null;
			this.state.over = null;
			this.previousSnapshot = null;
		});
	}

	detach() {
		stopMusic("game");
		window.removeEventListener("keydown", this.onKey);
		window.removeEventListener("keyup", this.onKey);
		
		this.offStart();
		this.offState();
		this.offOver();
		this.offRoundEnd();
	}

	reset(start) {
		this.previousGameState = null;
		this.players.clear();
		this.flips.clear();
		this.held.clear();
		this.lastMoveDirection = { x: 0, y: 0 };
		this.state.start = start;
		this.state.snap = null;
		this.state.over = null;
		this.previousSnapshot = start.players;
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

	tick(delta) {
		this.frameColor = !this.frameColor;
		this.rootNode?.style.setProperty("--frame-color", this.frameColor ? "#fff" : "#000");

		const snap = this.state.snap;
		if (!snap) return;
		const players = snap.players;
		for (const [id, node] of this.players) {
			const player = players[id];
			if (player) this.movePlayer(node, player.x, player.y);
		}
	}

	updatePlayers(players, previousPlayers) {
		for (const [id, node] of this.players) {
			const player = players[id];
			if (!player) continue;

			// flip
			const previous = previousPlayers[id];
			const dx = player.x - previous.x;
			if (dx > 1) this.setFlip(id, node, false);
			else if (dx < -1) this.setFlip(id, node, true);

			// dead
			const dead = player.lives <= 0;
			if (node.classList.contains("dead") !== dead) {
				node.classList.toggle("dead", dead);
			}

			// damage
			const flashing = !dead && player.iframes;
			if (node.classList.contains("iframes") !== flashing) {
				node.classList.toggle("iframes", flashing);
			}
		}
	}

	// static map geometry, written once per match
	getCellCssClass(idx, start) {
		if (!start.map.walls.includes(idx)) return "cell";
		return `cell wall-${start.map.wallVariants[idx]}`;
	}

	getBlockVariant(idx) {
		return (toCol(idx) + toRow(idx)) % 3;
	}

	// cell objects, re-evaluated per snapshot
	getCellContentsClass(idx, start) {
		const c = this.previousGameState;
		if (!c){
			return start.map.blocks.includes(idx) ? `block-${this.getBlockVariant(idx)}` : "";
		}

		if (c.explosions.has(idx)) return "explosion";
		if (c.bombs.has(idx)) return "bomb";
		const pu = c.powerups.get(idx);
		if (pu) return `pu-${pu}`;
		return c.blocks.has(idx) ? `block-${this.getBlockVariant(idx)}` : "";
	}

	render() {
		const { start, snap, over } = this.state;
		const root = (children) => el("div", {
			class: "game",
			ref: (node) => { this.rootNode = node; },
		}, children);
		if (!start) return root([]);

		// convert cells into html
		const cells = [];
		for (let idx = 0; idx < cols * rows; idx++) {
			const cell = { key: idx, class: this.getCellCssClass(idx, start) };
			const obj = this.getCellContentsClass(idx, start);
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
					this.players.set(id, node);
					
					const position = this.previousSnapshot ? this.previousSnapshot[id] : p;
					this.movePlayer(node, position.x, position.y);
				},
			}, el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames: characters[(Number(id) - 1) % characters.length], flip: this.flips.get(id) ?? false }))
		);

		const roster = snap ? snap.players : start.players;
		const me = snap?.players[this.props.playerId];
		const out = me?.lives === 0;
		return root([
			el("div", { class: "game-content" }, [
				el("div", { class: "hud" }, Object.entries(roster).map(([id, p]) =>
					el(PlayerStats, { key: id, player: p, playerId: this.props.playerId })
				)),
				el(Chat, { ws: this.props.ws }),
				el("div", { class: "board" }, [
					...cells,
					...players,
					out && !over ? el("div", { class: "overlay" }, "You are out") : null,
					over ? el("div", { class: "overlay" }, this.winnerText(over, start)) : null,
				]),
			]),
		]);
	}

	winnerText(over, start) {
		if (over.winnerId === null) return "Draw";
		if (String(over.winnerId) === String(this.props.playerId)) return "You win!";
		return `${start.players[over.winnerId]?.nickname ?? "Player"} wins`;
	}

	movePlayer(node, x, y) {
		node.style.left = `${x - tile / 2}px`;
		node.style.top = `${y - tile / 2}px`;
	}

	setFlip(id, node, flip) {
		if (this.flips.get(id) === flip) return;
		this.flips.set(id, flip);
		node.firstChild?.classList.toggle("flip", flip);
	}
}
