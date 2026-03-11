#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "Running database seed..."
./node_modules/.bin/tsx apps/api/prisma/seed.ts || echo "Seed skipped (may already be seeded)"

echo "Starting API server..."
exec node apps/api/dist/main.js
