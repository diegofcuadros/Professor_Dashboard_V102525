#!/usr/bin/env node

// Phase 1 Validation Script - Tests all critical components
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 LIA Phase 1 Validation Script');
console.log('=====================================\n');

let issues = 0;

// Test 1: Check critical files exist
console.log('📁 Checking critical files...');
const criticalFiles = [
  'package.json',
  'docker-compose.yml',
  'Dockerfile.dev',
  '.env.example',
  'server/index.ts',
  'server/db.ts',
  'server/auth.ts',
  'server/routes.ts',
  'server/storage.ts',
  'server/websocket.ts',
  'server/worker.ts',
  'shared/schema.ts',
  'client/src/App.tsx'
];

for (const file of criticalFiles) {
  const filePath = join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    issues++;
  }
}

// Test 2: Check directory structure
console.log('\n📂 Checking directory structure...');
const requiredDirs = [
  'scripts',
  'server',
  'client/src',
  'shared',
  'uploads',
  'reports', 
  'backups',
  'database/init'
];

for (const dir of requiredDirs) {
  const dirPath = join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ ${dir}/`);
  } else {
    console.log(`  ❌ ${dir}/ - MISSING`);
    issues++;
  }
}

// Test 3: Check package.json dependencies
console.log('\n📦 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
  
  if (packageJson.name === 'lia-lab-system') {
    console.log('  ✅ Package name updated');
  } else {
    console.log('  ❌ Package name not updated');
    issues++;
  }
  
  const requiredDeps = ['pg', 'drizzle-orm', 'express', 'bcrypt', 'node-cron', 'nodemailer', 'axios'];
  const deps = Object.keys(packageJson.dependencies || {});
  
  for (const dep of requiredDeps) {
    if (deps.includes(dep)) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING DEPENDENCY`);
      issues++;
    }
  }
} catch (error) {
  console.log('  ❌ package.json invalid JSON');
  issues++;
}

// Test 4: Check Docker configuration
console.log('\n🐳 Checking Docker configuration...');
try {
  const dockerCompose = fs.readFileSync(join(__dirname, '..', 'docker-compose.yml'), 'utf8');
  
  if (dockerCompose.includes('redis://:lia_redis_password@redis:6379')) {
    console.log('  ✅ Redis URL with password');
  } else {
    console.log('  ❌ Redis URL configuration issue');
    issues++;
  }
  
  if (dockerCompose.includes('lia_lab_network')) {
    console.log('  ✅ Custom network defined');
  } else {
    console.log('  ❌ Network configuration missing');
    issues++;
  }
} catch (error) {
  console.log('  ❌ docker-compose.yml read error');
  issues++;
}

// Test 5: Check environment template
console.log('\n⚙️  Checking environment configuration...');
try {
  const envExample = fs.readFileSync(join(__dirname, '..', '.env.example'), 'utf8');
  
  if (envExample.includes('redis://:lia_redis_password@localhost:6379')) {
    console.log('  ✅ Environment Redis URL');
  } else {
    console.log('  ❌ Environment Redis URL mismatch');
    issues++;
  }
  
  if (envExample.includes('postgresql://lia_user:lia_password@localhost:5432/lia_lab')) {
    console.log('  ✅ Database URL configured');
  } else {
    console.log('  ❌ Database URL issue');
    issues++;
  }
} catch (error) {
  console.log('  ❌ .env.example read error');
  issues++;
}

// Final report
console.log('\n' + '='.repeat(40));
if (issues === 0) {
  console.log('🎉 Phase 1 Validation: PASSED');
  console.log('✅ All components are correctly configured');
  console.log('🚀 Ready to proceed to Phase 2!');
  process.exit(0);
} else {
  console.log(`❌ Phase 1 Validation: FAILED`);
  console.log(`🔧 Found ${issues} issue(s) that need to be fixed`);
  console.log('⚠️  Fix these issues before proceeding to Phase 2');
  process.exit(1);
}