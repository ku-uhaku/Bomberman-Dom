import { el, Component, createApp, Router, navigate } from "./framework/index.js";
import { AppWebSocket } from "./network/webSocket.js";
import { NicknamePage } from "./pages/nickname.js";
import { LobbyPage } from "./pages/lobby.js";
import { GamePage } from "./pages/game.js";

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
		super(props);
		this.ws = new AppWebSocket();
	}

	attach() {
		this.ws.connect();
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
		});
	}
}

createApp(() => el(App), document.querySelector("#root"));
