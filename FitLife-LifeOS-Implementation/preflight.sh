#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(pwd)}"
cd "$ROOT"
fail(){ echo "ERROR: $*" >&2; exit 1; }
[ -f package.json ] || fail "Run from the FitLife Full repository root. package.json is missing."
[ -f src/App.jsx ] || fail "src/App.jsx is missing."
[ -f src/lib/supabaseClient.js ] || fail "src/lib/supabaseClient.js is missing."
grep -q "SnapshotPage" src/App.jsx || fail "Expected FitLife App structure was not found."
grep -q "SettingsPage" src/App.jsx || fail "Expected Settings integration was not found."
command -v node >/dev/null || fail "node is required."
command -v npm >/dev/null || fail "npm is required."
echo "Preflight passed: $(pwd)"
