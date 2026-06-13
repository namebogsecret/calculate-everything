#!/usr/bin/env bash
# deploy.sh — публикация Calculate Everything на GitHub Pages.
# Использование: ./deploy.sh ["commit message"]
# Раздаётся ветка gh-pages → https://calculators.podlevskikh.com/ (CNAME)
# Первый раз: создать репо namebogsecret/calculate-everything, ветку gh-pages,
#   в Settings → Pages включить gh-pages, в DNS podlevskikh.com добавить
#   CNAME-запись calc → namebogsecret.github.io.
set -euo pipefail
cd "$(dirname "$0")"
git add -A
if git diff --cached --quiet; then
  echo "Нечего деплоить — нет изменений."
  exit 0
fi
git -c user.email="armenia.mail.vladimir@gmail.com" -c user.name="Vladimir Podlevskikh" \
  commit -qm "${1:-update calculators}"
git push -q origin gh-pages
echo "✓ Запушено. Pages пересоберётся за ~1 мин:"
echo "  https://calculators.podlevskikh.com/"
