# API Proxy UI

Admittedly vibe-coded this thing, but I did design the over arching architecture, i.e. services and how they connect, and how they should function. So while Claude did make the UI/UX, I did direct it how I wanted and architected the code design itself.

Admin console for the API Proxy — monitor requests, manage routes, orgs, service accounts, rate limits, and users.

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

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Request volume, latency, error rate, top routes, rate pressure chart — auto-refreshes every 2 min |
| `/log` | Paginated request log with filtering, sorting, and CSV export |
| `/routes` | Route CRUD — pattern, method, backend URL, with 24h inline stats |
| `/rate-limits` | Bi-layered rate limits (org-scoped and service-account-scoped) |
| `/orgs` | Organization management |
| `/service-accounts` | Service account management — client secret shown once on creation |
| `/users` | Admin user management |
| `/audit` | Read-only audit log (requires backend support) |

## Docker

### Build and run

```bash
docker build -t api-proxy-ui .
docker run -e BACKEND_URL=http://your-backend:8080 -p 8081:80 api-proxy-ui
```

The container serves the Angular app on port 80 via nginx. All `/api/*` requests are proxied to `BACKEND_URL` at runtime — this is required for the app to function.

`BACKEND_URL` is injected at container startup via `envsubst`. It must point to the API Proxy backend (include protocol and port, no trailing slash).

### Docker Compose

A full stack example alongside the API Proxy backend:

```yaml
services:
  api-proxy-ui:
    build:
      context: ./api-proxy-ui
    environment:
      - BACKEND_URL=http://api-proxy:8080
    ports:
      - "8081:80"
    depends_on:
      api-proxy:
        condition: service_healthy
```

Within a Compose network, services communicate using their service name as the hostname — `http://api-proxy:8080`, not the container name.

### nginx

The included `nginx.conf` handles:
- SPA routing (`try_files` fallback to `index.html`)
- `/api/` proxy pass to `BACKEND_URL`
- gzip compression for JS, CSS, JSON, and SVG

## Auth & Sessions

The app authenticates against the backend's OAuth token endpoint (`/api/v1/admin/oauth/token`) using email and password. Tokens are stored in `localStorage`.

**Session refresh**: tokens are re-requested automatically before expiry using the credentials from the current session. A warning modal appears 2 minutes before expiry, counting down with an option to extend the session or sign out. If no action is taken the user is signed out automatically.

**Page reload**: the token timestamp is persisted so the app can calculate remaining lifetime after a reload. If the token has already expired the user is redirected to login. If it expires while they are away, they will be signed out on the next action.
