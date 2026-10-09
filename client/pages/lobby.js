import { el, Component } from "../framework/index.js";

export class LobbyPage extends Component {
	render() {
		return el("main", {}, el("h2", {}, "Lobby"));
	}
}

