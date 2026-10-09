import { VDOMtoDOM } from "./virtualDOM/vdom.js";
import { diff, patch } from "./virtualDOM/diff.js";
import {
	VDOMToInstance,
	cleanupDetachedComponents,
	tickComponents,
	hasTickers,
} from "./component/componentManager.js";

let rootElement; // html root like #root
let cachedVDOM;
let currentRootComponent;

export function createApp(rootComponent, mount) {
	if (rootElement) throw new Error("mini-framework: already called");
	if (!mount) throw new Error('mini-framework: mount not found');

	currentRootComponent = rootComponent;

	const seen = new Set();
	cachedVDOM = VDOMToInstance(currentRootComponent(), [], seen);
	if (cachedVDOM == null) throw new Error("mini-framework: root is null");
	rootElement = VDOMtoDOM(cachedVDOM);
	mount.appendChild(rootElement);
	ensureLoop(); // components mounted with tick() need the loop running
}

/**
 * Calls renderTree once per animation frame
 */ 
let pending = false;
export function reRender() {
	if (!rootElement || pending) return;
	pending = true;
	ensureLoop();
}

/**
 * Shared animation-frame loop: renders pending work, then ticks components.
 */
let rafId = 0;
let lastTime = 0;

function ensureLoop() {
	if (!rafId) rafId = requestAnimationFrame(tick);
}

function tick(time) {
	rafId = 0;
	const delta = lastTime ? time - lastTime : 0;
	lastTime = time;

	if (pending) {
		pending = false;
		renderTree();
	}
	tickComponents(delta);

	if (pending || hasTickers()) ensureLoop();
}

/**
 * rebuild virtual dom, diff and patch with current
 */
function renderTree() {
	const seen = new Set();
	const newVDOM = VDOMToInstance(currentRootComponent(), [], seen);
	if (newVDOM == null) throw new Error("mini-framework: root is null");

	const ops = diff(cachedVDOM, newVDOM);
	if (ops[0] && ops[0].type === "REPLACE" && ops[0].path.length === 0) {
		// the root itself changed: patch works inside the root, so swap it here
		const newEl = VDOMtoDOM(ops[0].node);
		rootElement.parentElement.replaceChild(newEl, rootElement);
		rootElement = newEl;
	} else {
		patch(rootElement, ops);
	}

	cleanupDetachedComponents(seen);
	cachedVDOM = newVDOM;
}