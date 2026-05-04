#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--" ]]; then
  shift
fi

PROJECT_REF="${1:-}"
if [[ -z "$PROJECT_REF" ]]; then
  echo "Usage: $(basename "$0") <supabase-project-ref>"
  echo "Example: $(basename "$0") llupotqpghutqabnvpom"
  exit 2
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not found in PATH."
  echo "Install: https://supabase.com/docs/guides/cli/getting-started"
  exit 1
fi

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1
  pwd
)"

if [[ ! -f "$ROOT_DIR/supabase/config.toml" ]]; then
  echo "Error: could not find supabase/config.toml at: $ROOT_DIR/supabase/config.toml"
  echo "Run this script from within a Supabase CLI project."
  exit 1
fi

cd "$ROOT_DIR"

echo "Linking to project: $PROJECT_REF"
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
else
  supabase link --project-ref "$PROJECT_REF"
fi

echo "Pushing migrations to linked project: $PROJECT_REF"
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  supabase db push --password "$SUPABASE_DB_PASSWORD"
else
  supabase db push
fi

echo "Done."
