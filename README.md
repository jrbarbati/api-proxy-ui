# API Proxy UI

Admin console for the API Proxy — monitor requests, manage routes, orgs, service accounts, and rate limits.

## Requirements

- Node.js 20+
- npm 10+
- API Proxy backend running locally or accessible remotely

## Setup

```bash
npm install
npm start        # dev server at http://localhost:4200
```

## Environment Configuration

### Angular environments

Three environment files live in `src/environments/`:

| File | Used when |
|---|---|
| `environment.dev.ts` | `npm start` (development build) |
| `environment.prod.ts` | `ng build` (production build) |
| `environment.ts` | Base/default — swapped out at build time, do not import directly |

Edit the appropriate file to change API URLs before building.

### Dev server proxy

During development, the Angular dev server proxies `/api/*` requests to the API Proxy backend via `proxy.conf.js`. The default target is `http://localhost:8080`.

To point the dev server at a different backend, set the `API_PROXY_URL` environment variable:

```bash
# Local (default)
npm start

# Staging
API_PROXY_URL=https://staging.example.com npm start
```

The proxy only applies during `ng serve`. Production builds talk directly to the URL configured in `environment.prod.ts`.

## Commands

```bash
npm start                                     # Dev server at http://localhost:4200
ng build                                      # Production build → dist/
ng build --watch --configuration development  # Watch mode
ng test                                       # Run unit tests via Vitest
```
