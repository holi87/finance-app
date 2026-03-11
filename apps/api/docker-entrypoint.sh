#!/bin/sh
set -e

echo "Running database migrations..."
pnpm --filter @budget-tracker/api exec prisma migrate deploy

echo "Running database seed..."
pnpm exec tsx apps/api/prisma/seed.ts || echo "Seed skipped (may already be seeded)"

echo "Starting API server..."
exec node apps/api/dist/main.js
