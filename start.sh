#!/bin/bash

# Production startup script for Railway
echo "🚂 Starting DataProfessor Dashboard on Railway..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
while ! npx tsx scripts/health-check.js; do
  echo "Database not ready, waiting 5 seconds..."
  sleep 5
done

echo "✅ Database connected successfully"

# Run database migrations/setup if needed
echo "🗄️ Setting up database schema..."
npm run db:push

echo "🌱 Seeding initial data..."
npx tsx scripts/seed-database.js || echo "⚠️ Seeding skipped (data may already exist)"

echo "🚀 Starting application..."
npm run start