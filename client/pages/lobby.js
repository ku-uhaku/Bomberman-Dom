import { el, Component } from "../framework/index.js";
import { Chat } from "../components/chat.js";
import { AnimatedImage } from "../components/animatedImage.js";
import { msg, maxPlayers, tile } from "/shared/global.js";
import { playSound } from "../global/sound.js";

const atlas = "/client/assets/images/art.png";

const credits = [
	{ name: "Mbarrah", frames: [[0, 128], [32, 128]] },
	{ name: "Mbelhouss", frames: [[0, 96], [32, 96]] },
];

export class LobbyPage extends Component {
	constructor(props) {
		super(props, { lobby: null, nickname: "", error: "", busy: false });
		this.labelNode = null;
		this.lastSec = null;
	}

	attach() {
		this.offLobby = this.props.ws.on(msg.lobby, (m) => {
			this.state.lobby = m;
		});
		this.offJoined = this.props.ws.on(msg.joined, () => {
			this.state.busy = false;
			this.state.error = "";
		});
		this.offError = this.props.ws.on(msg.error, (m) => {
			this.state.busy = false;
			this.state.error = m.reason;
		});
	}

	detach() {
		this.offLobby();
		this.offJoined();
		this.offError();
	}

	submit(e) {
		e.preventDefault();
		const name = this.state.nickname.trim();
		if (this.state.busy || !name){
			return;
		}
		
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

	label() {
		const lobby = this.state.lobby;
		if (!lobby) return "";
		if (lobby.countdownEndsAt) {
			const left = Math.max(0, Math.ceil((lobby.countdownEndsAt - Date.now()) / 1000));
			return `game starts in ${left}`;
		}
		if (lobby.queueEndsAt) {
			const left = Math.max(0, Math.ceil((lobby.queueEndsAt - Date.now()) / 1000));
			return `waiting for players — ${left}s left`;
		}
		return "waiting for players…";
	}

	tick(delta) {
		if (!this.labelNode) {
			return;
		}

		const text = this.label();
		if (this.labelNode.textContent !== text) {
			this.labelNode.textContent = text;
		}

		const sec = this.state.lobby?.countdownEndsAt
			? Math.max(0, Math.ceil((this.state.lobby.countdownEndsAt - Date.now()) / 1000))
			: null;
		if (sec !== null && sec !== this.lastSec) {
			this.lastSec = sec;
			playSound("timer");
		}
		if (sec === null) {
			this.lastSec = null;
		}
	}

	credit(credit, key, flip) {
		return el("div", { class: "credit", key }, [
			el("div", { class: "credit-sprite" },
				el(AnimatedImage, { atlas, cellW: tile, cellH: tile, frames: credit.frames, flip })
			),
			el("span", {class: "credit-label"}, credit.name),
		]);
	}

	render() {
		const { nickname, error, busy, lobby } = this.state;
		const players = lobby ? lobby.players : [];
		const joined = this.props.playerId !== null;

		const panel = joined
			? [
				el("h2", {}, `${players.length} / ${maxPlayers}`),
				el("ul", {}, players.map((p) => el("li", { key: p.id }, p.nickname))),
				el("p", { ref: (n) => (this.labelNode = n) }, this.label()),
			]
			: [
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
					el("button", { type: "submit", disabled: busy || !nickname.trim() }, busy ? "Joining…" : "Join"),
				]),
				error ? el("p", { class: "error" }, error) : null,
			];

		return el("main", {}, [
			el("img", { class: "title", src: "/client/assets/images/title.png", alt: "Bomberman" }),
			el("div", { class: "credits" }, [
				this.credit(credits[0], "left"),
				el("div", { class: "lobby-panel" }, panel),
				this.credit(credits[1], "right", true),
			]),
			el("p", { class: "credits-label" }, "Project By"),
			joined ? el(Chat, { ws: this.props.ws }) : null,
		]);
	}
}
