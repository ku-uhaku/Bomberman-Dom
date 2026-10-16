import { el, Component } from "../framework/index.js";
import { baseSpeed, speedStep } from "../../shared/global.js";

const atlas = "/client/assets/images/art.png";
const icon = 32;
const scale = icon / 16;

const stats = [
	{ x: 128, y: 192, value: (p) => (p.lives > 0 ? p.lives : "dead") },
	{ x: 144, y: 192, value: (p) => p.maxBombs },
	{ x: 160, y: 192, value: (p) => p.range },
	{ x: 176, y: 192, value: (p) => Math.round((p.speed - baseSpeed) / speedStep) },
];

export class PlayerStats extends Component {
	render() {
		const { player, playerId } = this.props;
		return el("div", {
			class: String(player.id) === String(playerId) ? "hud-player me" : "hud-player",
		}, [
			el("span", {}, player.nickname),
			el("div", { class: "stats" }, stats.map((stat) =>
				el("div", { class: "stat" }, [
					el("span", {
						class: "stat-img",
						style: `width:${icon}px;height:${icon}px;background-image:url("${atlas}");background-size:${192 * scale}px ${224 * scale}px;background-position:${-stat.x * scale}px ${-stat.y * scale}px`,
					}),
					el("span", { class: "stat-value" }, String(stat.value(player))),
				])
			)),
		]);
	}
}