@echo off
set DATABASE_URL=postgresql://lia_user:lia_password@localhost:5432/lia_lab
set NODE_ENV=development
set PORT=5000
set OLLAMA_HOST=http://localhost:11434
set AI_ANALYSIS_ENABLED=true
npx tsx server/index.ts