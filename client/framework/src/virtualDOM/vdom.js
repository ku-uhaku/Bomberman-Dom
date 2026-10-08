import { setHandler, removeHandler } from "../events/events.js";

/**
 * Create single VDOM element.
 * type: string "div", "header" or component class
 * props: html properties, special cases: key, ref, on*
 */
export function el(type, props, children) {
	const childrenList = ( // remove dead children (💀), nested arrays flattened
		Array.isArray(children) ? children.flat(Infinity) : [children]
	)
		.filter((c) => c !== null && c !== undefined && typeof c !== "boolean")
		.map((c) => (typeof c === "object" ? c : String(c)));

	let key;
	let ref;
	const cleanProps = {};
	if (props) {
		for (const name in props) {
			if (name === "key") {
				key = props[name]; // hoist "key" so it's not an attribute and doesn't cause false SET_ATTR
			} else if (name === "ref") {
				ref = props[name]; // hoist "ref" so it's not an attribute/event
			} else {
				cleanProps[name] = props[name];
			}
		}
	}

	return { type: type, props: cleanProps, children: childrenList, key: key, ref: ref };
}

export function setProp(element, name, value) {
	if (name.startsWith("on") && typeof value === "function") {
		// event listener
		setHandler(element, name.slice(2).toLowerCase(), value);
	} else if (name === "value") {
		element.value = value; // property: attributes can't overwrite typed text
	} else if (value === null || value === true) {
		// null/true = attribute with no value like checked, disabled
		element[name] = true;
		element.setAttribute(name, "");
	} else if (value === false) {
		element[name] = false;
		element.removeAttribute(name);
	} else {
		element.setAttribute(name, value);
	}
}

/**
 * Remove a prop from an element.
 */
export function removeProp(element, name, wasProperty) {
	if (name.startsWith("on")) {
		// event listener
		removeHandler(element, name.slice(2).toLowerCase());
	} else if (wasProperty) {
		element[name] = false;
		element.removeAttribute(name);
	} else {
		element.removeAttribute(name);
	}
}

/**
 * Convert VDOM element (see el) to real DOM element
 */
export function VDOMtoDOM(element) {
  if (typeof element === "string") {
		return document.createTextNode(element);
	}

	const htmlEl = document.createElement(element.type);
	for (const key in element.props) {
		setProp(htmlEl, key, element.props[key]);
	}
	(element.children || []).forEach((child) => {
		htmlEl.appendChild(VDOMtoDOM(child));
	});

	// wait for browser to build DOM
	if (element.ref) queueMicrotask(() => element.ref(htmlEl));

	return htmlEl;
}