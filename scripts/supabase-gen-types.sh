#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1
  pwd
)"

cd "$ROOT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Error: supabase CLI not found in PATH."
  exit 1
fi

OUTPUT_FILE="lib/supabase/database.types.ts"

if [[ -f "$ROOT_DIR/supabase/.temp/project-ref" ]]; then
  echo "Generating Supabase types from linked project..."
  supabase gen types typescript --linked > "$OUTPUT_FILE"
elif [[ -n "${SUPABASE_PROJECT_REF:-}" ]] || [[ -n "${1:-}" ]]; then
  PROJECT_REF="${1:-${SUPABASE_PROJECT_REF}}"
  echo "Generating Supabase types for project: $PROJECT_REF"
  supabase gen types typescript --project-id "$PROJECT_REF" > "$OUTPUT_FILE"
elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo "Generating Supabase types from SUPABASE_DB_URL (requires Docker)..."
  supabase gen types typescript --db-url "$SUPABASE_DB_URL" > "$OUTPUT_FILE"
else
  echo "Usage: $(basename "$0") [project-ref]"
  echo "Link a project first (supabase link) or set SUPABASE_PROJECT_REF."
  exit 2
fi

echo "Wrote $OUTPUT_FILE"
