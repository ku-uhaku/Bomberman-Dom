import { reRender } from "../main.js";
import { createState } from "../state/createState.js";

export class Component {
	#state;

	constructor(props, initialState) {
		this.props = props;
		this.#state = createState(initialState ?? {}, reRender);
	}

	get state() {
		return this.#state;
	}

	attach() {}

	detach() {}

	tick(delta) {}

	render() {
		throw new Error("Implement");
	}
}