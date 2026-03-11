#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma

echo "🌱 Running database seed..."
npx tsx apps/api/prisma/seed.ts || echo "⚠️  Seed failed (may already be seeded)"

echo "🚀 Starting API server..."
exec node apps/api/dist/main.js
