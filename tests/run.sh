#!/usr/bin/env bash
# Оба набора: node-тесты логики + Playwright-смоук страницы. Код возврата != 0 при любом падении.
set -u
cd "$(dirname "$0")/.."
rc=0
echo "== node:test =="
timeout 120 node --test tests/*.test.js 2>&1 | grep -E "^# (tests|pass|fail)|^not ok" || true
timeout 120 node --test tests/*.test.js >/dev/null 2>&1 || rc=1
echo "== playwright smoke =="
PY="${PY:-$HOME/.venv/playwright/bin/python}"
out=$(timeout 240 "$PY" tests/smoke_physics_test.py 2>&1); src=$?
echo "$out" | grep -E "^FAIL|^smoke:|Error|Traceback" || true
echo "smoke: pass=$(echo "$out" | grep -c '^PASS') fail=$(echo "$out" | grep -c '^FAIL')"
[ $src -eq 0 ] || rc=1
[ $rc -eq 0 ] && echo "ALL GREEN" || echo "RED"
exit $rc
