#!/usr/bin/env bash
#
# Applies pending Supabase migrations during a Vercel build.
#
# Behaviour:
#   * Runs only on Vercel (VERCEL=1) *production* deployments by default, so that
#     preview/branch builds never mutate the production database. Set
#     FORCE_DB_MIGRATE=true to run it in any environment.
#   * No-ops (exit 0) whenever the guard is not satisfied or no database URL is
#     configured, so it is always safe to chain before `next build`.
#
# Required env (set these in the Vercel project's Environment Variables):
#   SUPABASE_DB_URL              Postgres connection string. Use a DIRECT
#                                connection (host db.<ref>.supabase.co:5432),
#                                NOT the transaction pooler on port 6543.
# Optional env:
#   SUPABASE_DB_MIGRATION_URL    Overrides SUPABASE_DB_URL for migrations only.
#   FORCE_DB_MIGRATE=true        Run migrations regardless of VERCEL_ENV.

set -euo pipefail

FORCE="${FORCE_DB_MIGRATE:-false}"

if [[ "$FORCE" != "true" ]]; then
  if [[ "${VERCEL:-}" != "1" ]]; then
    echo "[migrate] Not running on Vercel; skipping Supabase migrations."
    exit 0
  fi
  if [[ "${VERCEL_ENV:-}" != "production" ]]; then
    echo "[migrate] VERCEL_ENV='${VERCEL_ENV:-unset}' (not production); skipping migrations."
    echo "[migrate] Set FORCE_DB_MIGRATE=true to run migrations for this environment."
    exit 0
  fi
fi

DB_URL="${SUPABASE_DB_MIGRATION_URL:-${SUPABASE_DB_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "[migrate] No SUPABASE_DB_URL / SUPABASE_DB_MIGRATION_URL set; skipping migrations."
  exit 0
fi

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1
  pwd
)"
cd "$ROOT_DIR"

echo "[migrate] Applying Supabase migrations via 'supabase db push'..."
pnpm exec supabase db push --db-url "$DB_URL" --yes
echo "[migrate] Supabase migrations applied."
