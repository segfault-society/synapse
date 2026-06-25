#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0

for f in supabase/tests/test_*.sql; do
  if [ ! -f "$f" ]; then
    echo "No SQL test files found matching supabase/tests/test_*.sql"
    exit 0
  fi
  echo "Running $f ..."
  if psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f "$f"; then
    PASS=$((PASS + 1))
  else
    echo "FAILED: $f"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "DB tests: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
