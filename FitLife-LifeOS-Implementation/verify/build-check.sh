#!/usr/bin/env bash
set -euo pipefail
cd "${1:-$(pwd)}"
npm run build
