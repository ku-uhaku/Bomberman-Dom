const proxyCache = new WeakMap();

export function createState(target, onChange) {
	if (typeof onChange !== "function") {
		throw new Error(
			'mini-framework: createState requires callback'
		);
	}
	return new Proxy(target, {
		get(obj, prop) {
			const value = obj[prop];
			// recursive proxy
			if (value && typeof value === "object") {
				if (proxyCache.has(value)) return proxyCache.get(value);
				const proxy = createState(value, onChange);
				proxyCache.set(value, proxy);
				return proxy;
			}
			return value;
		},
		set(obj, prop, value) {
			if (obj[prop] === value) return true; // nothing changed
			obj[prop] = value;
			onChange();
			return true;
		},
		deleteProperty(obj, prop) {
			if (delete obj[prop]) onChange();
			return true;
		},
	});
}