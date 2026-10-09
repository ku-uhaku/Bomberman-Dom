import { el, Component } from "../framework/index.js";

const FPS = 4;
const FRAME_MS = 1000 / FPS;

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
	}

	render() {
		const { atlas, cellW, cellH, className } = this.props;
		if (!atlas) throw new Error('AnimatedImage: "atlas" prop is required');
		if (!(cellW > 0) || !(cellH > 0))
			throw new Error('AnimatedImage: "cellW"/"cellH" must be > 0');
		return el("span", {
			ref: (node) => this.onRef(node),
			class: className ? `animated-image ${className}` : "animated-image",
			style: `width:${cellW}px;height:${cellH}px;background-image:url("${atlas}")`,
		});
	}

	onRef(node) {
		this.node = node;
		this.applied = null;
		this.write();
	}

	tick(delta) {
		const p = this.props;
		const frames = p.frames;
		if (!this.node || !frames || !frames.length) return;

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
		const steps = (this.time / FRAME_MS) | 0;
		if (!steps) return;
		this.time -= steps * FRAME_MS;
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
