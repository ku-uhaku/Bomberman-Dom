import { el, Component } from "../framework/index.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { baseSpeed, speedStep } from "../../shared/global.js";

const iconAtlas = "/client/assets/images/art.png";
const iconSize = 16;

const statDefs = [
	{ frames: [[128, 192]], value: (p) => (p.alive ? p.lives : "out") },
	{ frames: [[144, 192]], value: (p) => p.maxBombs },
	{ frames: [[160, 192]], value: (p) => p.range },
	{ frames: [[176, 192]], value: (p) => Math.round((p.speed - baseSpeed) / speedStep) },
];

export class PlayerStats extends Component {
	render() {
		const { player, playerId } = this.props;
		return el("div", {
			class: String(player.id) === String(playerId) ? "hud-player me" : "hud-player",
		}, [
			el("span", {}, player.nickname),
			el("div", { class: "stats" }, statDefs.map((stat) =>
				el("div", { class: "stat" }, [
					el("div", { class: "stat-icon" },
						el(AnimatedImage, { atlas: iconAtlas, cellW: iconSize, cellH: iconSize, frames: stat.frames })),
					el("span", { class: "stat-value" }, String(stat.value(player))),
				])
			)),
		]);
	}
}