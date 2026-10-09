import { Component } from "./component.js";

const instances = new Map(); // id: instance
const tickers = new Set(); // components that override tick()

/**
 * comvert VDOM nodes {type, props, children} to a Component class instance
 */
export function VDOMToInstance(node, path, seen) {
	if (node === null || node === undefined) return node;
	if (typeof node === "string") return node;
	if (typeof node !== "object") throw new Error(`mini-framework: render() must return an element, a string or null`);

	if (typeof node.type === "function") { // trick to find classes, typeof class = function
		if (!(node.type.prototype instanceof Component))
			throw new Error(`mini-framework: "${node.type.name}" must extend Component`);

		// path (+ optional key), + class name: render() to avoid same id
		const slot = node.key != null ? [...path, node.key] : path;
		const id = JSON.stringify([...slot, node.type.name]);
		seen.add(id);

		let instance = instances.get(id);
		if (!instance) {
			// new Component
			instance = new node.type(node.props || {});
			if (instance.tick !== Component.prototype.tick) tickers.add(instance);
			instance.attach();
			instances.set(id, instance);
		} else {
			instance.props = node.props || {};
		}

		const rendered = VDOMToInstance(instance.render(), path, seen);
		// keep the component's key on the rendered root so list diffing can reconcile it
		if (node.key != null && rendered && typeof rendered === "object" && rendered.key == null)
			rendered.key = node.key;
		return rendered;
	}

	const children = (node.children || [])
		.map((child, i) => {
			// keyed children keep their instance across list reordering
			const slot = typeof child === "object" && child.key != null ? String(child.key) : i;
			return VDOMToInstance(child, [...path, slot], seen);
		})
		.filter((child) => child !== null && child !== undefined); // instance.render() failed
	
	return {
		type: node.type,
		props: node.props || {},
		children,
		key: node.key,
		ref: node.ref,
	};
}

export function cleanupDetachedComponents(seen) {
	// detach components that were removed in VDOM
	for (const [id, instance] of instances) {
		if (!seen.has(id)) {
			instance.detach();
			instances.delete(id);
			tickers.delete(instance);
		}
	}
}

export function tickComponents(delta) {
	for (const instance of tickers) instance.tick(delta);
}

export function hasTickers() {
	return tickers.size > 0;
}