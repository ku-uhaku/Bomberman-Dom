import { el, Component } from "../framework/index.js";

const fps = 4;
const frameMs = 1000 / fps;

export class AnimatedImage extends Component {
	constructor(props) {
		super(props);
		this.node = null; // ref to node
		this.time = 0;
		this.idx = 0; // frame index
		this.applied = null; // last written background-position
		this.lastFrames = null;
		this.lastAtlas = null;
		this.lastCellW = null;
		this.lastCellH = null;
		this.lastFlip = null;
	}

	render() {
		const { atlas, cellW, cellH, className, flip } = this.props;
		if (!atlas) throw new Error('AnimatedImage: "atlas" prop is required');
		if (!(cellW > 0) || !(cellH > 0))
			throw new Error('AnimatedImage: "cellW"/"cellH" must be > 0');
		const cls = `animated-image${className ? ` ${className}` : ""}${flip ? " flip" : ""}`;
		return el("span", {
			ref: (node) => this.onRef(node),
			class: cls,
			style: `width:${cellW}px;height:${cellH}px;background-image:url("${atlas}")`,
		});
	}

	onRef(node) {
		this.node = node;
		this.applied = null;
		this.lastFlip = null;
		this.syncFlip();
		this.write();
	}

	syncFlip() {
		const flip = !!this.props.flip;
		if (!this.node || flip === this.lastFlip) return;
		this.node.classList.toggle("flip", flip);
		this.lastFlip = flip;
	}

	tick(delta) {
		const p = this.props;
		const frames = p.frames;
		if (!this.node || !frames || !frames.length) return;
		this.syncFlip();

		if (
			frames !== this.lastFrames ||
			p.atlas !== this.lastAtlas ||
			p.cellW !== this.lastCellW ||
			p.cellH !== this.lastCellH
		) {
			// parent swapped the frame set (state change) or the style was re-patched
			this.lastFrames = frames;
			this.lastAtlas = p.atlas;
			this.lastCellW = p.cellW;
			this.lastCellH = p.cellH;
			this.time = 0;
			this.idx = 0;
			this.applied = null;
			this.write();
			return;
		}

		this.time += delta;
		const steps = (this.time / frameMs) | 0;
		if (!steps) return;
		this.time -= steps * frameMs;
		this.idx = (this.idx + steps) % frames.length;
		this.write();
	}

	write() {
		const frames = this.props.frames;
		if (!this.node || !frames || !frames.length) return;
		const [x, y] = frames[this.idx % frames.length];
		const pos = `${-x}px ${-y}px`;
		if (pos === this.applied) return;
		this.node.style.backgroundPosition = pos;
		this.applied = pos;
	}
}
