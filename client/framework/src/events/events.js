// only events that bubble can be delegated to the document
const supported = new Set([
	"click",
	"dblclick",
	"mousedown",
	"mouseup",
	"mousemove",
	"mouseover",
	"mouseout",
	"input",
	"change",
	"submit",
	"keydown",
	"keyup",
	"focusin",
	"focusout",
]);

const listening = new Set(); // events already listened to on the document

// handlers are stored on the element itself, so they go away with it
export function setHandler(element, eventName, handler) {
	if (!supported.has(eventName)) {
		throw new Error(`mini-framework: event "${eventName}" doesn't bubble and isn't supported.`);
	}

	if (!listening.has(eventName)) {
		listening.add(eventName);
		document.addEventListener(eventName, dispatch);
	}

	element.mf_handlers ??= {};
	element.mf_handlers[eventName] = handler;
}

export function removeHandler(element, eventName) {
	if (element.mf_handlers) delete element.mf_handlers[eventName];
}

// walk from the target up to the document, calling handlers on the way
function dispatch(event) {
	let node = event.target;
	if (node.nodeType === Node.TEXT_NODE) node = node.parentElement; // text nodes can't hold handlers

	while (node) {
		node.mf_handlers?.[event.type]?.(event);
		if (event.cancelBubble) break; // stopPropagation() sets this
		node = node.parentElement;
	}
}
