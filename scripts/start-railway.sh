#!/usr/bin/env bash
set -euo pipefail

bash scripts/run-migrations.sh
node scripts/bootstrap-owner.mjs

exec npm run start:container
