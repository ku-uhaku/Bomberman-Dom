import { el, Component } from "../framework/index.js";
import { Chat } from "../components/chat.js";
import { msg, maxPlayers } from "/shared/global.js";

export class LobbyPage extends Component {
	constructor(props) {
		super(props, { lobby: null });
		this.labelNode = null;
		this.acc = 0;
	}

	attach() {
		this.offLobby = this.props.ws.on(msg.lobby, (m) => {
			this.state.lobby = m;
		});
	}

	detach() {
		this.offLobby();
	}

	label() {
		const lobby = this.state.lobby;
		if (!lobby) return "";
		const left = (at) => Math.max(0, Math.ceil((at - Date.now()) / 1000));
		if (lobby.countdownEndsAt) return `game starts in ${left(lobby.countdownEndsAt)}`;
		if (lobby.queueEndsAt) return `waiting for players — ${left(lobby.queueEndsAt)}s left`;
		return "waiting for players…";
	}

	// timer label is the only periodic DOM write — throttled, textContent only when it changes
	tick(delta) {
		this.acc += delta;
		if (this.acc < 250) return;
		this.acc = 0;
		if (!this.labelNode) return;
		const text = this.label();
		if (this.labelNode.textContent !== text) this.labelNode.textContent = text;
	}

	render() {
		const lobby = this.state.lobby;
		const players = lobby ? lobby.players : [];
		return el("main", {}, [
			el("h2", {}, `${players.length} / ${maxPlayers}`),
			el("ul", {}, players.map((p) => el("li", { key: p.id }, p.nickname))),
			el("p", { ref: (n) => (this.labelNode = n) }, this.label()),
			el(Chat, { ws: this.props.ws }),
		]);
	}
}
