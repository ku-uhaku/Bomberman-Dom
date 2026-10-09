import { el, Component } from "../framework/index.js";

export class NicknamePage extends Component {
	render() {
		return el("main", {}, el("h2", {}, "Nickname"));
	}
}

