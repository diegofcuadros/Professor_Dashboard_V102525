#!/bin/bash

# Production startup script for Railway
echo "🚂 Starting DataProfessor Dashboard on Railway..."

# Run database migrations/setup if needed
echo "🗄️ Setting up database schema..."
npm run db:push || echo "⚠️ Schema setup failed, continuing..."

echo "🌱 Seeding initial data..."
npx tsx scripts/seed-database.js || echo "⚠️ Seeding skipped (data may already exist)"

echo "🚀 Starting application..."
node dist/index.js