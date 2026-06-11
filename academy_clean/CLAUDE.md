# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

أكاديمية البرمجة — a full-stack Arabic coding academy platform (courses, challenges, community, AI code review). pnpm workspace monorepo (frontend), TypeScript throughout. The backend is a separate Laravel + MySQL project.

## Commands

Run from the repo root (`academy_clean/`).

- `pnpm install` — install all workspace deps
- `pnpm run dev` / `pnpm run dev:frontend` — frontend only (`@workspace/academy`), Vite dev server on port 5173
- `pnpm run build` — typecheck everything, then build all packages
- `pnpm run typecheck` — typecheck `lib/*` first (`tsc --build`), then all `artifacts/**` and `scripts` packages
- Single-package typecheck: `pnpm --filter @workspace/academy run typecheck`
- No test suite is currently configured.

The Laravel API backend must be running on `http://localhost:8000` (the Vite dev server proxies `/api`, `/sanctum`, `/storage`, and `/auth` to it).

## Workspace layout

```
artifacts/
  academy/          # React 19 + Vite frontend (@workspace/academy)
lib/
  api-spec/         # openapi.yaml + orval codegen config (@workspace/api-spec)
  api-client-react/ # Generated React Query hooks from openapi.yaml (@workspace/api-client-react)
scripts/            # Misc utility scripts package
```

### API contract / codegen flow

`lib/api-spec/openapi.yaml` describes the API shape. Running `pnpm --filter @workspace/api-spec run codegen` (orval) regenerates `lib/api-client-react/src/generated/**` — the React Query hooks/types used by the frontend.

When changing an API endpoint's request/response shape, update `openapi.yaml` and re-run codegen rather than hand-editing the generated files (they are clean-regenerated). The Laravel backend's routes/controllers should stay consistent with the OpenAPI spec.

### Frontend (`artifacts/academy`)

- Vite config aliases `@` → `src/`. Dev server proxies `/api`, `/sanctum`, `/storage`, and `/auth` to `http://localhost:8000` (the Laravel backend).
- `src/lib/api-fetch.ts` — `apiFetch()` wrapper around `fetch` for legacy/manual calls: sends credentials, fetches a CSRF cookie via `/sanctum/csrf-cookie` and attaches `X-XSRF-TOKEN` for state-changing requests.
- `src/lib/auth-context.tsx` — auth/session React context.
- Prefer using the generated hooks from `@workspace/api-client-react` for new API calls over `apiFetch`.
- `src/pages/` — top-level routed pages (wouter router); `src/components/ui/` — Radix-based UI primitives; `src/components/layout/` — layout components.

## Environment files

- `artifacts/academy/.env` — `PORT`, `BASE_PATH`, `VITE_API_URL`
