# Agent notes

## Cursor Cloud specific instructions

This is a single Next.js 15 (pnpm) app (constituency “eOffice”) backed by **Supabase Postgres**. There is no monorepo and no Makefile/devcontainer.

### Required services

| Service | How to start | Notes |
|---------|--------------|-------|
| Docker daemon | `sudo dockerd` (background) | Needed for local Supabase. Use `fuse-overlayfs` storage driver in this VM. |
| Local Supabase | `pnpm exec supabase start` | Ports from `supabase/config.toml`: API `54421`, DB `54422`, Studio `54423`. Migrations apply on start. |
| Next.js dev | `pnpm dev` | http://localhost:3000 — health check: `GET /ping` → `pong` |

### Env file

Create `.env.local` (gitignored) for local Supabase. `NEXT_PUBLIC_SUPABASE_URL` **must** be set explicitly for local (`http://127.0.0.1:54421`) because it cannot be derived from a `127.0.0.1` DB URL. Use the JWT `SERVICE_ROLE_KEY` from `pnpm exec supabase status -o env` (not the newer `sb_secret_…` key). Minimal keys: `AUTH_SECRET`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. `GOOGLE_GENERATIVE_AI_API_KEY` is only required for real AI chat/translate/letters.

Verify DB: `pnpm db:verify`.

### Lint / test / run

- **Lint:** `npx next lint` (clean warnings). Prefer not to run `pnpm lint` blindly — it chains `biome lint --write --unsafe` and will rewrite files. Biome currently reports many pre-existing issues.
- **Tests:** `pnpm test` (Playwright; auto-starts `pnpm dev` via `playwright.config.ts`, sets `PLAYWRIGHT=True` for mock AI). Needs a working Supabase + `.env.local`.
- **Dev:** `pnpm dev` (see README). Standard scripts live in `package.json`.

### Gotchas

- New users from `/register` have **no role** and land on `/modules/profile` (“No role assigned”). Module access is permission-gated in the DB.
- Redis / Vercel Blob / Brave Search / WhatsApp worker / VAPID are optional; core auth + most modules work without them.
- After a VM reboot: start `dockerd`, then `supabase start`, ensure `.env.local` still matches `supabase status -o env`, then `pnpm dev`.
