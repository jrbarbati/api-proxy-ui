# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200/
ng build           # Production build → dist/
ng build --watch --configuration development  # Watch mode
ng test            # Run unit tests via Vitest
```

## Architecture

Angular 21 SPA using the **standalone component architecture** (no NgModules). The app bootstraps via `bootstrapApplication()` in `src/main.ts`.

Key conventions:
- Components live in `src/app/components/`
- Routes are defined in `src/app/app.routes.ts`
- Providers/app config in `src/app/app.config.ts`
- Signals-based state (root component uses signals)
- **No type suffixes in filenames** — use `auth.ts` not `auth.service.ts`, `login.ts` not `login.component.ts`, `org.ts` not `org.model.ts`. The directory (`services/`, `models/`, `components/`) provides the context.

## Stack

- **Angular 21** with strict TypeScript 5.9 (strict templates, strict injection)
- **Tailwind CSS 4** via PostCSS — utility classes in templates and `src/styles.css`
- **Vitest** for unit tests (not Jasmine/Jest)
- **Prettier** — 100-char width, single quotes, Angular HTML parser

## State & Reactivity

- Use `signal()`, `computed()`, and `effect()` — no RxJS Observables in components
- Use `inject()` for dependency injection — no constructor injection
- Use `firstValueFrom()` to consume HTTP observables in services
- Use `untracked()` inside effects when reading signals that should not trigger re-runs (e.g. reading theme inside a data effect)
- `input()` and `output()` for component I/O — not `@Input()`/`@Output()`

## HTTP & Services

- All HTTP calls live in `src/app/services/` — components never call `HttpClient` directly
- Services use `firstValueFrom()` and return `Promise<T>`
- The auth interceptor (`src/app/interceptors/auth.ts`) attaches `Bearer` tokens and handles 401 responses (logout), unless the session warning modal is already active
- `AuthService` manages token storage, session scheduling, and the session-warning signal

## Auth & Session

- Token and metadata stored in `localStorage` under `api_proxy_token`, `api_proxy_token_at`, `api_proxy_token_ttl`
- `AuthService.showWarning` signal drives the session warning modal — mounted globally in `app.html`
- Warning fires 2 min before expiry; modal auto-logouts at 0:00 if no action taken
- `extendSession()` re-POSTs credentials silently and reschedules the warning
- **Do not** re-add a hardcoded refresh timer (previous pattern) — the warning modal now owns the expiry flow

## Routing

All authenticated pages are lazy-loaded children of the `Layout` component. The layout renders `<router-outlet>` and the top nav. The two guards are:
- `authGuard` — redirects unauthenticated users to `/login`
- `guestGuard` — redirects authenticated users away from `/login`

## Pages & Features

| Page | Component | Notes |
|---|---|---|
| Dashboard | `dashboard/dashboard` | Auto-refresh every 2 min, comparison deltas, latency mode toggle, top routes, rate pressure chart |
| Request Log | `request-log-page/request-log-page` | Sortable columns, CSV export, latency coloring, `/` shortcut to focus search |
| Routes | `routes-page/routes-page` | CRUD + inline 24h stats (count, error rate, avg latency) |
| Rate Limits | `rate-limits-page/rate-limits-page` | Bi-layered: org-scoped rows with SA sub-rows |
| Orgs | `orgs-page/orgs-page` | Standard CRUD |
| Service Accounts | `service-accounts-page/service-accounts-page` | `client_secret` shown once after creation |
| Users | `users-page/users-page` | Create + inactivate/reactivate only, no edit |
| Audit Log | `audit-log-page/audit-log-page` | Read-only, pending backend implementation |

## Light/Dark Mode

All components must support both light and dark themes. The app uses class-based dark mode via Tailwind CSS 4's `@custom-variant dark` — the `.dark` class is toggled on `<html>` by `ThemeService`.

- Design tokens (colors, backgrounds, borders) are defined as CSS custom properties in `src/styles.css` under `:root` (light) and `.dark` (dark)
- Component CSS references those global variables — do not hardcode color values in component CSS
- Use Tailwind's `dark:` utility prefix in templates where appropriate
- Every new component should be reviewed for both light and dark appearance before considering it complete

## Design System

- **Fonts**: DM Mono (monospace labels, values, badges) + Outfit (body text, headings)
- **Accent**: `#c8922a` amber — used for interactive states, active indicators, primary buttons
- **Shape**: sharp rectangles throughout — no `border-radius` anywhere
- **CSS variables**: `--bg`, `--bg-card`, `--border`, `--border-focus`, `--text`, `--text-muted`, `--accent`, `--accent-hover`, `--error`, `--error-bg`
- Status colors (not in variables): `#3a8c62` green (2xx/success), `#3a6e9e` blue (3xx), `#c8922a` amber (4xx/warn), `#9e3a3a` red (5xx/error)
- All new components must follow this system — no ad-hoc colors

## Charts

- All charts use Chart.js with `maintainAspectRatio: false`
- Chart components use `:host { height: 100% }` and a `position: relative; height: Npx` wrapper in the parent
- Theme reactivity: charts listen to an `effect()` on `isDark` from `ThemeService` and call `chart.update()` after patching dataset/scale colors
- Use `untracked()` when reading `isDark` inside a data effect to avoid double-triggering

## TypeScript

Strict mode is fully enabled including `noImplicitReturns` and `noFallthroughCasesInSwitch`. The Angular compiler enforces strict templates and strict standalone imports. Run `ng build` to catch type errors.

## CSS Import Order

`src/styles.css` must have `@import url(...)` for Google Fonts **before** `@import 'tailwindcss'`. Tailwind 4 expands its import to `@layer` blocks inline, which would push any subsequent `@import` after non-import rules — a CSS spec violation that esbuild warns about.

## Docker

- Production build output is at `dist/api-proxy-ui/browser/` (Angular 17+ application builder)
- `nginx.conf` uses `${BACKEND_URL}` substituted at container start via `envsubst`
- The Dockerfile CMD runs `envsubst '${BACKEND_URL}' < default.conf.template > default.conf && nginx -g 'daemon off;'`
- All `/api/` traffic is proxied to `BACKEND_URL` — required because all environment URLs are relative paths
