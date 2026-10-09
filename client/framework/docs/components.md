# Components

A component is a class that extends `Component`. It must implement `render()`, which returns what the component looks like.

```js
class Counter extends Component {
  constructor(props) {
    super(props, { count: 0 });   // props, then initial state
  }

  render() {
    return el("button", {
      onclick: () => (this.state.count += 1),
    }, "Count: " + this.state.count);
  }
}
```

## Props

`props` are passed in when you use the component:

```js
el(Counter, { step: 2 });
```

Access them with `this.props`. Changing props on a re-render updates the component.

## State

State is **reactive** — `this.state` is a Proxy. Changing it re-renders automatically. `this.state.count += 1` and `this.state.name = "Sam"` both trigger it:

```js
this.state.count += 1;   // triggers a re-render
this.state.name = "Sam"; // triggers a re-render
```

It's deeply reactive (nested objects work too), and re-renders are batched: change state as many times as you want, it updates once per animation frame.

## Lifecycle

- `render()` — required. Returns the element(s) for this component.
- `attach()` — optional. Called when the component instance is created, before `render()`.
- `detach()` — optional. Called when the component is removed.
- `tick(delta)` — optional. Called every animation frame while mounted, after any pending render. Use for game loops and animation.

```js
class MyPage extends Component {
  attach() {
    console.log("page shown");
  }
  detach() {
    console.log("page hidden");
  }
}
```

## Sharing state between pages

No global store: keep shared data in a component that never unmounts (like root `App`) and pass it down via `props`. Pages re-render whenever `App` does, so they always see the latest data.

```js
class App extends Component {
  constructor(props) {
    super(props, { name: "World" });
  }
  render() {
    return el(Router, {
      routes: { "/": Home, "/about": About },
    });
  }
}
```
