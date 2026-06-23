---
name: Auth public routes
description: /privacy and /terms must be reachable by unauthenticated users — add them to AuthPages Switch, not just MainApp routes.
---

# Public routes in AuthPages

`App.tsx` has two separate route trees:
- `AuthPages` — shown when `userId === null` (not logged in)
- `MainAppInner` — shown when logged in

Pages like `/privacy` and `/terms` are linked from Login and Register forms. If they are only registered in MainApp's `<Switch>`, clicking them while logged out causes a redirect to Login instead of showing the page.

**Rule:** Any page linked from Login/Register must also appear in `AuthPages`'s `<Switch>`.

**Why:** Wouter's `Switch` falls through to the default `<Login>` route for unknown paths when in auth mode.

**How to apply:** When adding new public informational pages, add their `<Route>` to *both* the `AuthPages` switch and the `MainApp` switch.
