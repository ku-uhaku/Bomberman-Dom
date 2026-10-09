# Lifecycle

Every component goes through a lifecycle managed by the framework.

## Creation

When a component is created via `el(ComponentClass, props)`:

1. Constructor runs — receive `props` and optional initial `state`.
2. `attach()` is called (if implemented).
3. `render()` is called to produce the VDOM.
4. The VDOM is converted to real DOM nodes.

```js
class MyComponent extends Component {
  constructor(props) {
    super(props, { initialized: false });
    // setup that doesn't depend on DOM
  }

  attach() {
    // runs before render(), so there is no DOM yet — use it for
    // subscriptions or timers, not for querying elements
  }
}
```

## Updates

When state or props change, the component re-renders:

1. `render()` is called again.
2. The new VDOM is diffed against the old one.
3. Only the changed parts are patched in the real DOM.
4. `attach()` is not called again — the component instance persists.

## Removal

When the component is no longer in the rendered tree (e.g., route changes away from a page):

1. `detach()` is called (if implemented) — clean up event listeners, timers, subscriptions.
2. The component instance is removed from the internal registry.

```js
class TimerPage extends Component {
  constructor(props) {
    super(props, { seconds: 0 });
    this.interval = null;
  }

  attach() {
    this.interval = setInterval(() => {
      this.state.seconds += 1;
    }, 1000);
  }

  detach() {
    clearInterval(this.interval);
  }

  render() {
    return el("p", {}, `Elapsed: ${this.state.seconds}s`);
  }
}
```

## Frame ticks

Components that implement `tick(delta)` are called every animation frame while mounted — after any pending render. The instance persists across re-renders exactly like `attach()`, so per-frame cursor data (animation index, interpolation state) can live in plain instance fields.

## Component instance reuse

The framework keeps component instances alive across re-renders. Props are updated on the existing instance rather than creating a new one each time. This means `attach()` only runs once per mount, and instance properties (like timers or subscriptions set in `attach()`) persist until `detach()` is called.
