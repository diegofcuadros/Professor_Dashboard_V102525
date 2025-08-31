#!/bin/sh

echo "🚂 Starting DataProfessor Dashboard on Railway..."

echo "🗄️ Running database migrations (drizzle push)..."
npx drizzle-kit push || echo "⚠️ Migrations failed or already applied, continuing..."

echo "🌱 Seeding initial data (non-fatal if already seeded)..."
npx tsx scripts/seed-database.js || echo "⚠️ Seeding skipped (data may already exist)"

echo "🚀 Starting application..."
node dist/index.js