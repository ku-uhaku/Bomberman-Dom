import { el, Component } from "../framework/index.js";

const fps = 4;
const frameMs = 1000 / fps;

export class AnimatedImage extends Component {
	constructor(props) {
		super(props);
		this.node = null; // ref to node
		this.time = 0;
		this.idx = 0; // frame index
		this.applied = null; // last background-position
		this.lastFrames = null;
		this.lastFlip = null;
	}

	render() {
		const { atlas, cellW, cellH, className, flip } = this.props;
		if (!atlas) {
			throw new Error('AnimatedImage: "atlas" prop is required');
		}

		if (!(cellW > 0) || !(cellH > 0)){
			throw new Error('AnimatedImage: "cellW"/"cellH" must be > 0');
		}

		const classs = `animated-image${className ? ` ${className}` : ""}${flip ? " flip" : ""}`;
		return el("span", {
			ref: (node) => this.onRef(node),
			class: classs,
			style: `width:${cellW}px;height:${cellH}px;background-image:url("${atlas}")`,
		});
	}

	onRef(node) {
		this.node = node;
		this.applied = null;
		this.lastFlip = null;
		this.syncFlip();
		this.apply();
	}

	syncFlip() {
		const flip = !!this.props.flip;
		if (!this.node || flip === this.lastFlip) {
			return;
		}
		this.node.classList.toggle("flip", flip);
		this.lastFlip = flip;
	}

	tick(delta) {
		const p = this.props;
		const frames = p.frames;
		if (!this.node || !frames || !frames.length) {
			return;
		}
		this.syncFlip();

		if (frames !== this.lastFrames) {
			// frames changed (bomb became an explosion...)
			this.lastFrames = frames;
			this.time = 0;
			this.idx = 0;
			this.applied = null;
			this.apply();
			return;
		}

		this.time += delta;
		const steps = Math.floor(this.time / frameMs);
		if (steps == 0){
			return;
		}

		this.time %= frameMs; // keep the remainder for the next tick
		this.idx = (this.idx + steps) % frames.length;
		this.apply();
	}

	apply() {
		const frames = this.props.frames;
		if (!this.node || !frames || !frames.length) {
			return;
		}

		const [x, y] = frames[this.idx % frames.length];
		const pos = `${-x}px ${-y}px`;
		if (pos === this.applied){
			// no change
			return;
		}
		this.node.style.backgroundPosition = pos;
		this.applied = pos;
	}
}
