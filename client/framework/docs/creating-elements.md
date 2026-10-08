# Creating elements

Use `el(type, props, children)`.

- `type` — the tag name, like `"div"`, `"h1"`, `"input"`, or a component class.
- `props` — an object of attributes and events.
- `children` — a string, an element, or an array of elements. Optional.

```js
el("div");                        // <div></div>
el("div", { class: "box" });      // <div class="box"></div>
el("h1", {}, "Title");            // <h1>Title</h1>
```

## Nesting elements

`children` can be a string, a single element, or an array. Nested arrays are flattened.

```js
el("div", {}, [
  el("h1", {}, "Title"),
  el("p", {}, "Some text."),
]);
```

```html
<div>
  <h1>Title</h1>
  <p>Some text.</p>
</div>
```

If you have a list of elements, build them from an array of data:

```js
el("ul", {}, items.map((item) => el("li", {}, item.name)));
```

## Adding attributes

Anything you pass in `props` becomes an attribute on the element.

```js
el("input", { type: "text", placeholder: "Insert name", class: "input" });
```

```html
<input type="text" placeholder="Insert name" class="input" />
```

`value` is set as a DOM property, not an attribute, so it overwrites text the user has already typed (controlled inputs).

### DOM properties (no value)

Some HTML attributes (`checked`, `disabled`, `selected`) are DOM properties, not values. Pass `null` to set the property (plus an empty attribute, like React). This matters for checkboxes: the property is what updates the element's state — setting the attribute alone is ignored once the element has been interacted with.

```js
el("input", { type: "checkbox", checked: null });
el("button", { disabled: null }, "Can't click me");
```

## Creating an event

Any prop starting with `on` is treated as an event handler. The framework wires it for you — you never call `addEventListener`.

```js
el("button", {
  onclick: () => alert("Clicked!"),
}, "Click me");
```

Handlers are **delegated**: one root listener per event type, created only while that type is in use and removed when it's not. Handlers clean up automatically when elements are removed.

Supported events (must bubble to be delegated): `click`, `dblclick`, `mousedown`, `mouseup`, `mousemove`, `mouseover`, `mouseout`, `input`, `change`, `submit`, `keydown`, `keyup`, `focusin`, `focusout`.

> `focus` and `blur` don't bubble, so use `focusin` and `focusout` instead. Events that can't bubble (like `scroll`) throw an error and aren't supported.

The event object is passed to your handler:

```js
el("input", {
  oninput: (e) => console.log(e.target.value),
});
```

## Key and ref

These two props are special and are not applied to the DOM.

**`key`** — the identity of an element inside a list, so the framework can tell elements apart when the list changes. Use it for each item in a list (like React):

```js
todos.map((todo) => el("li", { key: todo.id }, todo.title));
```

**`ref`** — a function called with the real DOM element once it's created (after it's attached to the document, so focusing works). Useful for focusing an input:

```js
el("input", {
  ref: (node) => {
    node.focus();
    node.select();
  },
});
```
