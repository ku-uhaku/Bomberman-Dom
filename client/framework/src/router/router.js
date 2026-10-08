import { Component } from "../component/component.js";
import { el } from "../virtualDOM/vdom.js";

// "#/about" -> "/about", "#about" -> "/about", "" -> "/"
export function currentPath() {
	const path = window.location.hash.replace(/^#\/?/, "");
	return "/" + path;
}

export function navigate(path) {
	window.location.hash = path;
}

export class Router extends Component {
	constructor(props) {
		super(props, { path: currentPath() });
		this.onHashChange = () => {
			const path = currentPath();
			if (this.allowed(path)) {
				this.state.path = path; // re-renders only if the path changed
			} else {
				navigate(this.state.path); // blocked: put the URL back
			}
		};
	}

	attach() {
		window.addEventListener("hashchange", this.onHashChange);
	}

	detach() {
		window.removeEventListener("hashchange", this.onHashChange);
	}

	allowed(path) {
		const { guard } = this.props;
		return !guard || guard(path);
	}

	render() {
		// everything except the router's own props is forwarded to the page
		const { routes, fallback, guard, ...pageProps } = this.props;
		const path = this.state.path;

		if (!routes) throw new Error('mini-framework: Router requires a "routes" prop { "/": HomePage }');

		// a blocked path (e.g. opened directly on first load) shows the fallback
		const Page = this.allowed(path) ? routes[path] ?? fallback : fallback;

		if (!Page) {
			if (!this.allowed(path)) throw new Error(`mini-framework: blocked route "${path}" has no fallback`);
			throw new Error(`mini-framework: no route matches "${path}"`);
		}
		if (typeof Page !== "function") throw new Error(`mini-framework: route "${path}" must be a Component class`);

		return el(Page, { ...pageProps, key: path });
	}
}
