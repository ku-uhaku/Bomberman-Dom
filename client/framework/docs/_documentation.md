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

Override `tick(delta)` (milliseconds since the previous frame) for per-frame work — game logic, sprite animation, FPS counters. The framework runs it every animation frame, right after any pending re-render, for as long as the component is mounted. No wiring needed:

```js
class Sprite extends Component {
  tick(delta) {
    // move sprites, update the FPS counter
  }
}
```

The shared loop sleeps when no mounted component implements `tick()` and nothing is pending.

Never put per-frame values (positions, transforms) in state or props — write them on `ref`-captured nodes inside `tick()`.

---

## Table of contents

- [Creating elements](./creating-elements.md)
- [Components](./components.md)
- [State](./state.md)
- [Routing](./routing.md)
- [Lifecycle](./lifecycle.md)
