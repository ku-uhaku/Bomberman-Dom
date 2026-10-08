import { setProp, removeProp, VDOMtoDOM } from "./vdom.js";

/**
 * diff 2 VDOMS and generate operations
 * ops type: ADD / REMOVE / REPLACE / SET_ATTR / REMOVE_ATTR / SET_TEXT / MOVE
 */
export function diff(oldNode, newNode, path = []) {
	const ops = []; // {type, path, extra_arg}

	// text - text
	if (typeof oldNode === 'string' && typeof newNode === 'string') {
		if (oldNode !== newNode) {
			ops.push({ type: 'SET_TEXT', path, value: newNode });
		}
		return ops;
	}

	// text - element
	if (typeof oldNode !== typeof newNode) {
		ops.push({ type: 'REPLACE', path, node: newNode });
		return ops;
	}

	// elemet - element
	if (oldNode.type !== newNode.type) {
		ops.push({ type: 'REPLACE', path, node: newNode });
		return ops;
	}

	if (oldNode.key !== newNode.key) {
		ops.push({ type: 'REPLACE', path, node: newNode });
		return ops;
	}

	// attributes //

	// attrs new or modified
	for (const name in newNode.props) {
		if (oldNode.props[name] !== newNode.props[name]) {
			ops.push({ type: 'SET_ATTR', path, name, value: newNode.props[name] });
		}
	}
	// attrs removed
	for (const name in oldNode.props) {
		if (!(name in newNode.props)) {
			ops.push({
				type: 'REMOVE_ATTR',
				path,
				name,
				wasProperty: oldNode.props[name] === null || typeof oldNode.props[name] === "boolean",
			});
		}
	}

	// children //

	// diff children
	const oldChildren = oldNode.children || [];
	const newChildren = newNode.children || [];

	const keyed = (c) => typeof c === "object" && c.key != null;
	if (newChildren.some(keyed) || oldChildren.some(keyed)) {
		ops.push(...diffKeyed(oldChildren, newChildren, path));
		return ops;
	}

	const max = Math.max(oldChildren.length, newChildren.length);
	const removals = [];

	for (let i = 0; i < max; i++) {
		const childPath = [...path, i]; // index as ID [0, 2, 1...]

		if (i >= oldChildren.length) {
			ops.push({ type: 'ADD', path: childPath, node: newChildren[i] });
		} else if (i >= newChildren.length) {
			// don't remove inside loop!!!
			removals.push({ type: 'REMOVE', path: childPath });
		} else {
			// recurse
			ops.push(...diff(oldChildren[i], newChildren[i], childPath));
		}
	}

	ops.push(...removals.reverse());

	return ops;
}

function diffKeyed(oldChildren, newChildren, path) {
	const hasKey = (c) => typeof c === "object" && c.key != null;
	const ops = [];

	const oldIndexByKey = new Map();
	oldChildren.forEach((c, i) => {
		if (!hasKey(c)) return;
		if (oldIndexByKey.has(c.key)) throw new Error(`mini-framework: duplicate key "${c.key}"`);
		oldIndexByKey.set(c.key, i);
	});

	const seen = new Set();
	const match = newChildren.map((c) => {
		if (!hasKey(c)) return -1;
		if (seen.has(c.key)) throw new Error(`mini-framework: duplicate key "${c.key}"`);
		seen.add(c.key);
		return oldIndexByKey.get(c.key) ?? -1;
	});

	const matched = match.filter((i) => i >= 0);
	const removals = oldChildren
		.map((_, i) => i)
		.filter((i) => !matched.includes(i))
		.sort((a, b) => b - a); // right to left so earlier paths stay valid
	for (const i of removals) ops.push({ type: 'REMOVE', path: [...path, i] });

	// survivors keep their relative order, renumbered after the removals
	const position = new Map(); // old index -> current DOM index
	matched.slice().sort((a, b) => a - b).forEach((oldIdx, pos) => position.set(oldIdx, pos));

	for (let i = 0; i < newChildren.length; i++) {
		const childPath = [...path, i];
		const oldIdx = match[i];

		if (oldIdx < 0) {
			ops.push({ type: 'ADD', path: childPath, node: newChildren[i] });
			for (const [k, pos] of position) if (pos >= i) position.set(k, pos + 1);
			continue;
		}

		const from = position.get(oldIdx);
		if (from !== i) {
			ops.push({ type: 'MOVE', path: [...path, from], to: i });
			for (const [k, pos] of position) {
				if (from < i && pos > from && pos <= i) position.set(k, pos - 1);
				if (from > i && pos >= i && pos < from) position.set(k, pos + 1);
			}
		}
		position.set(oldIdx, i);

		ops.push(...diff(oldChildren[oldIdx], newChildren[i], childPath));
	}

	return ops;
}

export function patch(container, ops) {
	// gets html element corresponding to VDOM node
	const getChild = (container, path) => {
		let node = container;
		for (const index of path) {
			node = node.childNodes[index];
		}
		return node;
	}

	for (const op of ops) {
		switch (op.type) {
			case 'ADD': {
				const parent = getChild(container, op.path.slice(0, -1)); // path minus last element to get parent
				const index = op.path[op.path.length - 1];
				const newEl = VDOMtoDOM(op.node);
				if (index >= parent.childNodes.length) parent.appendChild(newEl);
				else parent.insertBefore(newEl, parent.childNodes[index]);
				break;
			}

			case 'REMOVE': {
				const parent = getChild(container, op.path.slice(0, -1));
				const index = op.path[op.path.length - 1];
				const target = parent.childNodes[index];
				if (target) parent.removeChild(target);
				break;
			}

			case 'REPLACE': {
				const parent = getChild(container, op.path.slice(0, -1));
				const index = op.path[op.path.length - 1];
				const oldChild = parent.childNodes[index];
				parent.replaceChild(VDOMtoDOM(op.node), oldChild);
				break;
			}

			case 'MOVE': {
				const parent = getChild(container, op.path.slice(0, -1));
				const from = op.path[op.path.length - 1];
				const node = parent.childNodes[from];
				parent.removeChild(node);
				parent.insertBefore(node, parent.childNodes[op.to] ?? null);
				break;
			}

			case 'SET_TEXT': {
				const target = getChild(container, op.path); // path points AT the text node
				target.textContent = op.value;
				break;
			}

			case 'SET_ATTR': {
				const target = getChild(container, op.path);
				setProp(target, op.name, op.value);
				break;
			}

			case 'REMOVE_ATTR': {
				const target = getChild(container, op.path);
				removeProp(target, op.name, op.wasProperty);
				break;
			}
		}
	}
}