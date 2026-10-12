import { el, Component, createApp, Router, navigate } from "./framework/index.js";
import { AppWebSocket } from "./network/webSocket.js";
import { NicknamePage } from "./pages/nickname.js";
import { LobbyPage } from "./pages/lobby.js";
import { GamePage } from "./pages/game.js";
import { msg } from "/shared/global.js";

class HomePage extends Component {
	render() {
		return el("main", {style:"display:flex; flex-direction:column; align-items:center"}, [
			el("img", {src:"/assets/images/title.png", width:"500px"}),
			el("button", { onclick: () => navigate("/nickname") }, "Nickname"),
			el("button", { onclick: () => navigate("/lobby") }, "Lobby"),
			el("button", { onclick: () => navigate("/game") }, "Game preview"),
		]);
	}
}

class App extends Component {
	constructor(props) {
		super(props, { playerId: null });
		this.ws = new AppWebSocket();
		this.ws.on(msg.joined, (m) => {
			this.state.playerId = m.playerId;
		});
		this.ws.on(msg.start, () => navigate("/game"));
		this.ws.on(msg.roundEnd, () => navigate("/lobby"));
	}

	guard(path) {
		if (path === "/" || path === "/nickname") return true;
		return this.state.playerId !== null; // /lobby and /game need a joined player
	}

	render() {
		return el(Router, {
			routes: {
				"/": HomePage,
				"/nickname": NicknamePage,
				"/lobby": LobbyPage,
				"/game": GamePage,
			},
			fallback: HomePage,
			guard: (path) => this.guard(path),
			ws: this.ws,
		});
	}
}

createApp(() => el(App), document.querySelector("#root"));
