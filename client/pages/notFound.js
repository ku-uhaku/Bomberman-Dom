import { el, Component } from "../framework/index.js";

export class NotFound extends Component {
	render() {
		return el("main", {}, [
			el("img", { class: "title", src: "/assets/images/title.png", alt: "Bomberman" }),
			el("h2", {}, "404 — page not found"),
			el("button", { onclick: () => (window.location.href = "/") }, "Back to lobby"),
		]);
	}
}