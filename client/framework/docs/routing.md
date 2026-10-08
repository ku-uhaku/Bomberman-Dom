# Routing

Routing syncs the app with the URL. It's **hash-based** — the route lives in the URL fragment (`#/`).

```js
el(Router, {
  routes: {
    "/": Home,
    "/about": About,
  },
  fallback: NotFound,
});
```

- `routes` — an object mapping URL paths to components. Required: the `Router` throws without it.
- `fallback` — optional; shown when no route matches (a 404 page).
- `guard` — optional; a function `(path) => boolean`. Return `false` to block navigation to that path — the URL snaps back and the current route stays. It's also enforced on first load, so opening a protected URL directly renders the `fallback` instead:

```js
el(Router, {
  routes: { "/": Home, "/admin": Admin },
  fallback: NotFound,
  guard: (path) => path !== "/admin" || isLoggedIn(),
});
```

Any other props you pass to the `Router` are forwarded to the routed page, so you can hand data and callbacks down to it:

```js
el(Router, {
  routes: { "/": Home, "/about": About },
  user: this.state.user,
  onLogout: () => this.state.user = null,
});
```

Navigate by changing the hash. Links work with plain `href`:

```js
el("a", { href: "#/about" }, "About");
```

Or navigate programmatically:

```js
import { navigate } from "../index.js";

navigate("/about");
```

When the URL changes, the matching page renders and the old page is cleaned up (`detach()` is called).

## Auth guard pattern

A common pattern is to guard routes based on auth state:

```js
class App extends Component {
  constructor(props) {
    super(props, { auth: createAuthState() });
  }

  guard = (path) => {
    const publicPaths = ["/", "/login"];
    return publicPaths.includes(path) || this.state.auth.isLoggedIn;
  };

  render() {
    return el(Router, {
      routes: {
        "/": HomePage,
        "/about": AboutPage,
        "/login": LoginPage,
      },
      fallback: LoginPage,
      guard: this.guard,
    });
  }
}
```
