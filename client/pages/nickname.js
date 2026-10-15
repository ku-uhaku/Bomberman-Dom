import { el, Component, navigate } from "../framework/index.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { msg, tile } from "/shared/global.js";

const atlas = "/assets/images/art.png";

// frame 1 of each player sprite, matching characters[0] / characters[1] in game.js
const credits = [
	{ name: "Mbarrah", frames: [[0, 96], [32, 96]] },
	{ name: "Mbelhouss", frames: [[0, 64], [32, 64]] },
];

export class NicknamePage extends Component {
	constructor(props) {
		super(props, { nickname: "", error: "", busy: false });
	}

	attach() {
		this.offJoined = this.props.ws.on(msg.joined, () => {
			this.state.busy = false;
			navigate("/lobby");
		});
		this.offError = this.props.ws.on(msg.error, (m) => {
			this.state.busy = false;
			this.state.error = m.reason;
		});
	}

	detach() {
		this.offJoined();
		this.offError();
	}

	submit(e) {
		e.preventDefault();
		if (this.state.busy) return;
		this.state.error = "";
		this.state.busy = true;
		this.props.ws
			.connect()
			.then(() => {
				const sent = this.props.ws.sendMessage({
					type: msg.join,
					nickname: this.state.nickname,
				});
				if (!sent) {
					this.state.busy = false;
					this.state.error = "not connected";
				}
			})
			.catch(() => {
				this.state.busy = false;
				this.state.error = "connection failed";
			});
	}

	render() {
		const { nickname, error, busy } = this.state;
		const panel = [
			el("h2", {}, "Nickname"),
			el("form", { onsubmit: (e) => this.submit(e) }, [
				el("input", {
					value: nickname,
					oninput: (e) => {
						this.state.error = "";
						this.state.nickname = e.target.value;
					},
					placeholder: "nickname",
					maxlength: 12,
					ref: (node) => node.focus(),
				}),
				el("button", { type: "submit", disabled: busy }, busy ? "Joining…" : "Join"),
			]),
			error ? el("p", { class: "error" }, error) : null,
		];

		const credit = (c, key, flip) =>
			el("div", { class: "credit", key }, [
				el("div", { class: flip ? "credit-sprite flip" : "credit-sprite" },
					el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames: c.frames })
				),
				el("span", {}, c.name),
			]);

		return el("main", {}, [
			el("img", { class: "title", src: "/assets/images/title.png", alt: "Bomberman" }),
			el("p", { class: "credits-label" }, "A game by"),
			el("div", { class: "credits" }, [
				credit(credits[0], "left"),
				el("div", { class: "nickname-panel" }, panel),
				credit(credits[1], "right", true),
			]),
		]);
	}
}
