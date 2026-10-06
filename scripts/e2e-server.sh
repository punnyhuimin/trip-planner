#!/usr/bin/env bash
# Serves the real Worker build on a fresh, throwaway D1 database for Playwright.
# Never touches the dev data in .wrangler/state.
set -euo pipefail

PERSIST=.wrangler/e2e
PORT="${E2E_PORT:-8788}"

rm -rf "$PERSIST"
npx wrangler d1 migrations apply tripmaker --local --persist-to "$PERSIST"
npx opennextjs-cloudflare build
exec npx wrangler dev --persist-to "$PERSIST" --port "$PORT" --ip 127.0.0.1
