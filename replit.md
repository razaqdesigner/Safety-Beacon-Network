# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Running locally (outside Replit, incl. Windows)

Requires Node 24 and pnpm 10 (`npm i -g pnpm@10`; the lockfile is pnpm 10 format). After `pnpm install`:

- `pnpm local` — starts an embedded PostgreSQL 16 (data in `.local/pgdata`), pushes the schema, then runs the API (http://localhost:8080) and admin (http://localhost:23744/admin/, proxies `/api`)
- `pnpm local:mobile` — Expo dev server; the app calls the API at `http://<LAN IP>:8080` so Expo Go on the same Wi-Fi works
- `pnpm local:db`, `local:push`, `local:api`, `local:admin` — run pieces individually

Optional overrides go in a root `.env` (see `.env.example`). Set `DATABASE_URL` there to use an existing database instead (required on Linux, where the embedded Postgres binaries are not installed).

## Authentication

- **Citizens** get an opaque bearer token from `POST /users/register` or account recovery (`POST /auth/recover` → 6-digit code → `POST /auth/recover/verify`). The mobile app stores it in SecureStore and sends it via `setAuthTokenGetter`. Sessions don't expire; `POST /auth/logout` revokes one. Only token hashes are stored (`user_sessions`).
- **Dispatchers** sign in at the admin dashboard (`POST /admin/login`), which sets an HTTP-only `sa_admin` cookie (12h, SameSite=Lax, path `/api`).
- Citizens can only read/write their own user and alerts; listing users/alerts, stats and resolving alerts require a dispatcher. `pushToken` is never returned by the API.

### Environment variables / Secrets

| Variable | Purpose |
|---|---|
| `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` (≥12 chars), `ADMIN_BOOTSTRAP_NAME` | Creates that dispatcher account on API start if it doesn't exist. Never overwrites an existing password. Remove after first sign-in. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Send recovery codes by SMS (preferred) |
| `RESEND_API_KEY`, `OTP_EMAIL_FROM` | Send recovery codes by email if Twilio isn't configured |

Without an SMS/email provider, recovery codes are printed to the API log in development; in production recovery returns 503 until a provider is configured.
