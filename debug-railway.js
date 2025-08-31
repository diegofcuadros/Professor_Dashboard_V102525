#!/usr/bin/env node

// Debug script to understand Railway environment
console.log('🔍 Railway Environment Debug');
console.log('=========================');

console.log('\n📂 Working Directory:', process.cwd());
console.log('📂 __dirname:', __dirname);

console.log('\n📁 Files in /app:');
const fs = require('fs');
try {
  const files = fs.readdirSync('/app');
  files.forEach(file => {
    const stats = fs.statSync(`/app/${file}`);
    console.log(`  ${stats.isDirectory() ? '📁' : '📄'} ${file}`);
  });
} catch (e) {
  console.log('❌ Cannot read /app directory:', e.message);
}

console.log('\n📁 Files in ./dist (if exists):');
try {
  const distFiles = fs.readdirSync('./dist');
  distFiles.forEach(file => console.log(`  📄 ${file}`));
} catch (e) {
  console.log('❌ ./dist directory does not exist or cannot be read');
}

console.log('\n🔧 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : 'NOT SET');

console.log('\n📦 Package.json start script:');
try {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log('Start script:', pkg.scripts.start);
} catch (e) {
  console.log('❌ Cannot read package.json');
}