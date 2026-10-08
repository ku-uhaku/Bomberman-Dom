# mini-framework

mini-framework is a small JavaScript framework for building single-page apps. It comes with:

- **Virtual DOM** — you describe the UI with plain JS objects, the framework updates the real DOM for you.
- **Class-based components** — your screen is split into reusable components with `props`, `state`, and lifecycle hooks.
- **State management** — reactive state. When you change state, the UI re-renders automatically.
- **Event handling** — delegated events. You attach handlers as `on*` props; the framework manages the listeners.
- **Routing** — a `Router` component that renders the right page based on the URL.

You write code and the framework calls you back — not the other way around.

---

## Getting started

Import the public API from `index.js` (the framework entry point):

```js
import { el, createApp, Component, Router, navigate } from "../index.js";
```

### Hello world

```js
class App extends Component {
  render() {
    return el("h1", {}, "Hello, world!");
  }
}

createApp(() => el(App), document.querySelector("#root"));
```

`createApp` takes your root component and mounts it into a DOM element. Every time state changes, it re-renders and patches only what changed. It can only be called once per page — a second call throws.

### Frame loop

`onFrame(cb)` runs `cb(time, delta)` every animation frame, right after any pending re-render, and returns a function that stops it. Use it for game loops instead of calling `requestAnimationFrame` yourself:

```js
import { onFrame } from "../index.js";

const stop = onFrame((time, delta) => {
  // move sprites, update the FPS counter
});
```

Never put per-frame values (positions, transforms) in state or props — write them on `ref`-captured nodes inside `onFrame`.

---

## Table of contents

- [Creating elements](./creating-elements.md)
- [Components](./components.md)
- [State](./state.md)
- [Routing](./routing.md)
- [Lifecycle](./lifecycle.md)
