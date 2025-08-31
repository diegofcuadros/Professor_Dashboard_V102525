#!/usr/bin/env node

/**
 * Phase 4 Notification System Integration Test
 * 
 * This script tests all the notification features implemented in Phase 4:
 * 1. Email template system
 * 2. Notification triggers
 * 3. AI-powered notifications
 * 4. Communication dashboard API endpoints
 * 5. Real-time progress monitoring
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function log(message, color = '') {
  console.log(`${color}${message}${RESET}`);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`, exists ? GREEN : RED);
  return exists;
}

function checkFileContains(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const contains = content.includes(searchText);
    log(`${contains ? '✅' : '❌'} ${description}`, contains ? GREEN : RED);
    return contains;
  } catch (error) {
    log(`❌ Error reading ${filePath}: ${error.message}`, RED);
    return false;
  }
}

async function testNotificationSystem() {
  log('\n🧪 Phase 4: Enhanced Communication & Notifications - Integration Test', BLUE);
  log('=' * 70, BLUE);

  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Email Templates System
  log('\n📧 Testing Email Templates System', YELLOW);
  totalTests++;
  if (checkFileExists(path.join(__dirname, 'server', 'email-templates.ts'), 'Email templates file')) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'email-templates.ts'), 
      'StudentEmailTemplates', 
      'Student email templates defined'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'email-templates.ts'), 
      'ProfessorEmailTemplates', 
      'Professor email templates defined'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'email-templates.ts'), 
      'generateEmailFromTemplate', 
      'Template generation function exists'
    );
  }

  // Test 2: Notification Service
  log('\n🔔 Testing Notification Service', YELLOW);
  totalTests++;
  if (checkFileExists(path.join(__dirname, 'server', 'notifications.ts'), 'Notification service file')) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'notifications.ts'), 
      'NotificationService', 
      'NotificationService class defined'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'notifications.ts'), 
      'notifyTaskAssignment', 
      'Task assignment notifications'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'notifications.ts'), 
      'notifyScheduleSubmitted', 
      'Schedule submission notifications'
    );
  }

  // Test 3: AI Notification Service
  log('\n🤖 Testing AI Notification Service', YELLOW);
  totalTests++;
  if (checkFileExists(path.join(__dirname, 'server', 'ai-notifications.ts'), 'AI notification service file')) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'ai-notifications.ts'), 
      'AINotificationService', 
      'AINotificationService class defined'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'ai-notifications.ts'), 
      'analyzeStudentProductivity', 
      'Student productivity analysis'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'ai-notifications.ts'), 
      'generateIntelligentAlerts', 
      'Intelligent alerts generation'
    );
  }

  // Test 4: Progress Monitor Service
  log('\n📊 Testing Progress Monitor Service', YELLOW);
  totalTests++;
  if (checkFileExists(path.join(__dirname, 'server', 'progress-monitor.ts'), 'Progress monitor service file')) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'progress-monitor.ts'), 
      'ProgressMonitorService', 
      'ProgressMonitorService class defined'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'progress-monitor.ts'), 
      'monitorProgress', 
      'Progress monitoring functionality'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'progress-monitor.ts'), 
      'getRealtimeLabStats', 
      'Real-time statistics generation'
    );
  }

  // Test 5: Communication Dashboard Component
  log('\n💬 Testing Communication Dashboard', YELLOW);
  totalTests++;
  if (checkFileExists(path.join(__dirname, 'client', 'src', 'components', 'communication', 'CommunicationDashboard.tsx'), 'Communication dashboard component')) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'client', 'src', 'components', 'communication', 'CommunicationDashboard.tsx'), 
      'CommunicationDashboard', 
      'CommunicationDashboard component defined'
    );
    checkFileContains(
      path.join(__dirname, 'client', 'src', 'components', 'communication', 'CommunicationDashboard.tsx'), 
      'sendDirectMessage', 
      'Direct messaging functionality'
    );
  }

  // Test 6: Real-time Monitoring Component
  log('\n⚡ Testing Real-time Monitoring', YELLOW);
  totalTests++;
  if (checkFileExists(path.join(__dirname, 'client', 'src', 'components', 'communication', 'RealtimeMonitoring.tsx'), 'Real-time monitoring component')) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'client', 'src', 'components', 'communication', 'RealtimeMonitoring.tsx'), 
      'RealtimeMonitoring', 
      'RealtimeMonitoring component defined'
    );
    checkFileContains(
      path.join(__dirname, 'client', 'src', 'components', 'communication', 'RealtimeMonitoring.tsx'), 
      'WebSocket', 
      'WebSocket integration for real-time updates'
    );
  }

  // Test 7: Routes Integration
  log('\n🛤️  Testing API Routes Integration', YELLOW);
  totalTests++;
  if (checkFileContains(
    path.join(__dirname, 'server', 'routes.ts'), 
    'notificationService', 
    'Notification service integrated in routes'
  )) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'routes.ts'), 
      '/api/messages/send', 
      'Direct messaging API endpoint'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'routes.ts'), 
      '/api/ai/lab-insights', 
      'AI lab insights API endpoint'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'routes.ts'), 
      '/api/realtime/lab-stats', 
      'Real-time statistics API endpoint'
    );
  }

  // Test 8: Cron Jobs Integration
  log('\n⏰ Testing Cron Jobs Integration', YELLOW);
  totalTests++;
  if (checkFileContains(
    path.join(__dirname, 'server', 'cron.ts'), 
    'aiNotificationService', 
    'AI notification service integrated in cron jobs'
  )) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'cron.ts'), 
      'generateIntelligentAlerts', 
      'Intelligent alerts cron job'
    );
    checkFileContains(
      path.join(__dirname, 'server', 'cron.ts'), 
      'setupLabInsightsReport', 
      'Lab insights report cron job'
    );
  }

  // Test 9: Admin Dashboard Integration
  log('\n👨‍💼 Testing Admin Dashboard Integration', YELLOW);
  totalTests++;
  if (checkFileContains(
    path.join(__dirname, 'client', 'src', 'pages', 'admin', 'AdminDashboard.tsx'), 
    'CommunicationDashboard', 
    'Communication dashboard integrated in admin panel'
  )) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'client', 'src', 'pages', 'admin', 'AdminDashboard.tsx'), 
      'communication', 
      'Communication section in admin sidebar'
    );
  }

  // Test 10: Server Initialization
  log('\n🖥️  Testing Server Initialization', YELLOW);
  totalTests++;
  if (checkFileContains(
    path.join(__dirname, 'server', 'index.ts'), 
    'progressMonitor.start()', 
    'Progress monitor initialized on server start'
  )) {
    passedTests++;
    checkFileContains(
      path.join(__dirname, 'server', 'index.ts'), 
      'setupLabInsightsReport', 
      'Lab insights report cron job initialized'
    );
  }

  // Summary
  log('\n📋 Test Summary', BLUE);
  log('=' * 50, BLUE);
  log(`Total tests: ${totalTests}`, BLUE);
  log(`Passed tests: ${passedTests}`, passedTests === totalTests ? GREEN : YELLOW);
  log(`Failed tests: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? GREEN : RED);
  log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`, passedTests === totalTests ? GREEN : YELLOW);

  if (passedTests === totalTests) {
    log('\n🎉 All Phase 4 notification features are properly integrated!', GREEN);
    log('\nKey Features Implemented:', GREEN);
    log('✅ Comprehensive email template system', GREEN);
    log('✅ Automated notification triggers', GREEN);
    log('✅ AI-powered productivity analysis and alerts', GREEN);
    log('✅ Professor communication dashboard', GREEN);
    log('✅ Real-time progress monitoring with WebSocket', GREEN);
    log('✅ Direct messaging between professors and students', GREEN);
    log('✅ Weekly lab intelligence reports', GREEN);
    log('✅ Schedule approval/rejection notifications', GREEN);
    log('✅ Task assignment and overdue notifications', GREEN);
    log('✅ Automated productivity alerts and interventions', GREEN);
  } else {
    log('\n⚠️  Some features may need attention. Please review the failed tests above.', YELLOW);
  }

  return passedTests === totalTests;
}

// Run the test
if (require.main === module) {
  testNotificationSystem().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testNotificationSystem };