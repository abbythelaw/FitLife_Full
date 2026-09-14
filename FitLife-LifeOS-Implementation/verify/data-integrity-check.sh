#!/usr/bin/env bash
set -euo pipefail
cd "${1:-$(pwd)}"
for f in src/data/repositories/baseRepository.js src/data/repositories/profileRepository.js src/data/repositories/nutritionRepository.js src/features/nutrition/NutritionPage.jsx; do [ -s "$f" ] || { echo "Missing $f"; exit 1; }; done
! grep -R "localStorage.setItem" src/features/nutrition src/data/repositories >/dev/null || { echo "Canonical Nutrition/repositories contain localStorage writes"; exit 1; }
grep -q "NutritionPage" src/App.jsx
grep -q "className=\"nutrition-page\"" src/features/nutrition/NutritionPage.jsx
echo "Data integrity static checks passed."
