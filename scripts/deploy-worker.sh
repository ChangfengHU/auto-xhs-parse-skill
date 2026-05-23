#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(cd "$SCRIPT_DIR/../worker" && pwd)"

CF_EMAIL="${CF_EMAIL_SKILL:-go20260310@outlook.com}"
CF_API_KEY="${CF_API_KEY_SKILL:-}"

if [[ -z "$CF_API_KEY" ]]; then
  echo "CF_API_KEY_SKILL env var required" >&2; exit 1
fi

echo "Deploying CF Worker: auto-api-xhs-parse..."
cd "$WORKER_DIR"

# install wrangler if needed
if ! command -v wrangler >/dev/null 2>&1 && [[ ! -f node_modules/.bin/wrangler ]]; then
  npm install --silent wrangler
fi

WRANGLER="$(command -v wrangler 2>/dev/null || echo ./node_modules/.bin/wrangler)"

CLOUDFLARE_EMAIL="$CF_EMAIL" CLOUDFLARE_API_KEY="$CF_API_KEY" \
  "$WRANGLER" deploy --config wrangler.toml 2>&1

echo ""
echo "Worker deployed: https://auto-api-xhs-parse.hb67egcim4.workers.dev"
