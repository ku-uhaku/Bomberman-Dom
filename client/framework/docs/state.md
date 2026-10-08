# Managing state

State in mini-framework is created with `createState`, which returns a Proxy that triggers re-renders on changes. The `onChange` callback is required — calling `createState(target)` without it throws.

```js
import { createState } from "../index.js";

const state = createState(
  { count: 0, user: null },
  () => { /* called when state changes */ }
);
```

Inside a `Component`, state is managed automatically — `this.state` is already a reactive proxy backed by `createState`. You don't need to call `createState` yourself in components.

## Reactive updates

Any assignment to a state property triggers a re-render:

```js
this.state.count = 5;
this.state.user = { name: "Sam" };
this.state.items.push({ id: 1, title: "New" });
```

Nested objects are also reactive — changing a deep property works:

```js
this.state.profile.age = 30;  // triggers re-render
```

## Batching

Re-renders are batched per animation frame. If you change state multiple times in the same synchronous block, only one re-render happens:

```js
this.state.count = 1;
this.state.count = 2;
this.state.count = 3;  // single re-render at the end
```

## Sharing state across components

Keep shared state in a long-lived component (usually the root `App`) and pass it down as props. Child components receive the data and callbacks through props:

```js
class App extends Component {
  constructor(props) {
    super(props, { count: 0 });
  }
  render() {
    return el(CounterDisplay, {
      count: this.state.count,
      onIncrement: () => this.state.count += 1,
    });
  }
}
```
