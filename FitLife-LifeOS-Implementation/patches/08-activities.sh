#!/usr/bin/env bash
set -euo pipefail
BUNDLE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="${1:-$(pwd)}"
"$BUNDLE/install-all.sh" --phase 08 --root "$ROOT"
