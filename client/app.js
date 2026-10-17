import { el, Component, createApp, Router, navigate } from "./framework/index.js";
import { AppWebSocket } from "./global/webSocket.js";
import { LobbyPage } from "./pages/lobby.js";
import { GamePage } from "./pages/game.js";
import { NotFound } from "./pages/notFound.js";
import { msg } from "/shared/global.js";
import { playSound } from "./global/sound.js";

class App extends Component {
	constructor(props) {
		super(props, { playerId: null, inGame: false });
		this.ws = new AppWebSocket();
		this.ws.on(msg.joined, (m) => {
			this.state.playerId = m.playerId;
		});
		this.ws.on(msg.start, () => {
			this.state.inGame = true;
			playSound("gameStarted");
			navigate("/game");
		});
		this.ws.on(msg.gameOver, () => {
			playSound("gameOver");
		});
		this.ws.on(msg.roundEnd, () => {
			this.state.inGame = false;
			navigate("/");
		});
	}

	valid(path) {
		if (path === "/") return true;
		if (path === "/game") return this.state.playerId !== null && this.state.inGame;
		return false;
	}

	render() {
		if (window.location.pathname !== "/") return el(NotFound, {});
		return el(Router, {
			routes: {
				"/": LobbyPage,
				"/game": GamePage,
			},
			fallback: LobbyPage,
			guard: (path) => this.valid(path),
			ws: this.ws,
			playerId: this.state.playerId,
		});
	}
}

createApp(() => el(App), document.querySelector("#root"));
