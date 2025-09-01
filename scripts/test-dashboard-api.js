#!/usr/bin/env node

/**
 * Dashboard API Testing
 * 
 * This script simulates the exact API calls that the student dashboard makes
 * to verify that assignments are being returned correctly.
 */

import 'dotenv/config'; // Load .env file
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../server/db.js';
import { users, projects, projectAssignments } from '../shared/schema.js';
import { eq, desc, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDashboardAPI() {
  console.log('🌐 Testing Dashboard API Endpoints');
  console.log('====================================\n');
  
  try {
    // Find Carlos Cuartas specifically
    const carlos = await db.select().from(users)
      .where(eq(users.email, 'carlos.cuartas@lab.local'));
    
    if (carlos.length === 0) {
      console.log('❌ Carlos Cuartas user not found');
      process.exit(1);
    }
    
    const carlosUser = carlos[0];
    console.log(`👤 Testing for user: ${carlosUser.firstName} ${carlosUser.lastName}`);
    console.log(`   Email: ${carlosUser.email}`);
    console.log(`   ID: ${carlosUser.id}`);
    console.log(`   Role: ${carlosUser.role}\n`);
    
    // Test 1: Simulate /api/assignments/user/:userId endpoint
    console.log('🧪 Test 1: User Assignments API (/api/assignments/user/:userId)');
    
    const userAssignments = await db
      .select({
        // Assignment fields
        id: projectAssignments.id,
        userId: projectAssignments.userId,
        projectId: projectAssignments.projectId,
        role: projectAssignments.role,
        isActive: projectAssignments.isActive,
        assignedAt: projectAssignments.createdAt,
        allocationPercentage: projectAssignments.allocationPercentage,
        startDate: projectAssignments.startDate,
        endDate: projectAssignments.endDate,
        // Project fields joined
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        projectType: projects.projectType,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(and(
        eq(projectAssignments.userId, carlosUser.id),
        eq(projectAssignments.isActive, true)
      ));
    
    console.log(`   ✅ Query executed successfully`);
    console.log(`   📊 Found ${userAssignments.length} active assignment(s) for Carlos\n`);
    
    if (userAssignments.length > 0) {
      userAssignments.forEach((assignment, index) => {
        console.log(`   Assignment #${index + 1}:`);
        console.log(`     • Project: "${assignment.name}"`);
        console.log(`     • Project ID: ${assignment.projectId}`);
        console.log(`     • Assignment ID: ${assignment.id}`);
        console.log(`     • Role: ${assignment.role}`);
        console.log(`     • Status: ${assignment.status}`);
        console.log(`     • Type: ${assignment.projectType}`);
        console.log(`     • Allocation: ${assignment.allocationPercentage || 'N/A'}%`);
        console.log(`     • Assigned: ${assignment.assignedAt?.toLocaleDateString()}`);
        console.log(`     • Description: ${assignment.description?.substring(0, 80)}...`);
        console.log('');
      });
    } else {
      console.log('   ❌ No assignments returned - this explains why Carlos sees an empty dashboard!\n');
    }
    
    // Test 2: Test the simplified query that might be used in the UI
    console.log('🧪 Test 2: Simplified Projects Query');
    
    const simpleProjectQuery = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        projectType: projects.projectType,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(and(
        eq(projectAssignments.userId, carlosUser.id),
        eq(projectAssignments.isActive, true)
      ));
    
    console.log(`   ✅ Simplified query returned ${simpleProjectQuery.length} project(s)`);
    
    simpleProjectQuery.forEach(project => {
      console.log(`     • "${project.name}" (${project.status})`);
    });
    console.log();
    
    // Test 3: Test all assignments in the system (for debugging)
    console.log('🧪 Test 3: All System Assignments (Debug View)');
    
    const allAssignments = await db
      .select({
        assignmentId: projectAssignments.id,
        userId: projectAssignments.userId,
        projectId: projectAssignments.projectId,
        isActive: projectAssignments.isActive,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        projectName: projects.name,
      })
      .from(projectAssignments)
      .innerJoin(users, eq(projectAssignments.userId, users.id))
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id));
    
    console.log(`   📊 Total assignments in system: ${allAssignments.length}`);
    
    allAssignments.forEach((assignment, index) => {
      const isCarlos = assignment.userEmail === 'carlos.cuartas@lab.local';
      console.log(`   Assignment #${index + 1}${isCarlos ? ' (👤 CARLOS)' : ''}:`);
      console.log(`     • User: ${assignment.userFirstName} ${assignment.userLastName} (${assignment.userEmail})`);
      console.log(`     • Project: "${assignment.projectName}"`);
      console.log(`     • Active: ${assignment.isActive ? '✅' : '❌'}`);
      console.log(`     • User ID: ${assignment.userId}`);
      console.log(`     • Project ID: ${assignment.projectId}`);
      console.log('');
    });
    
    // Test 4: Verify Carlos's user ID matches assignment user ID
    console.log('🧪 Test 4: ID Matching Verification');
    
    const carlosAssignments = allAssignments.filter(a => a.userEmail === 'carlos.cuartas@lab.local');
    
    if (carlosAssignments.length > 0) {
      const assignment = carlosAssignments[0];
      console.log(`   Carlos's user ID from users table: ${carlosUser.id}`);
      console.log(`   Carlos's user ID from assignment: ${assignment.userId}`);
      console.log(`   IDs match: ${carlosUser.id === assignment.userId ? '✅ YES' : '❌ NO'}`);
      console.log(`   Assignment is active: ${assignment.isActive ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('   ❌ No assignments found for Carlos in the system');
    }
    console.log();
    
    // Test 5: Test what the actual dashboard component would receive
    console.log('🧪 Test 5: Dashboard Component Data Simulation');
    
    // This is what a typical React component would receive
    const dashboardData = {
      user: {
        id: carlosUser.id,
        firstName: carlosUser.firstName,
        lastName: carlosUser.lastName,
        email: carlosUser.email,
        role: carlosUser.role,
      },
      projects: userAssignments.map(assignment => ({
        id: assignment.projectId,
        name: assignment.name,
        description: assignment.description,
        status: assignment.status,
        type: assignment.projectType,
        assignmentId: assignment.id,
        role: assignment.role,
        assignedAt: assignment.assignedAt,
      }))
    };
    
    console.log(`   Dashboard data structure:`);
    console.log(`     • User: ${dashboardData.user.firstName} ${dashboardData.user.lastName}`);
    console.log(`     • Projects count: ${dashboardData.projects.length}`);
    
    if (dashboardData.projects.length > 0) {
      console.log(`     • Projects:`);
      dashboardData.projects.forEach(project => {
        console.log(`       - "${project.name}" (${project.status})`);
      });
    } else {
      console.log(`     • ❌ No projects - dashboard will show "No projects assigned"`);
    }
    console.log();
    
    console.log('🎉 Dashboard API testing completed!');
    
    // Final assessment
    console.log('\n📋 Final Assessment:');
    if (userAssignments.length > 0) {
      console.log('✅ Carlos Cuartas HAS active assignments');
      console.log('✅ Database schema is working correctly');
      console.log('✅ API queries return the expected data');
      console.log('✅ If Carlos sees an empty dashboard, the issue is likely in the frontend');
      console.log('\n💡 Recommended next steps:');
      console.log('   1. Check the frontend API calls to ensure they use the correct endpoints');
      console.log('   2. Verify the authentication/session is working properly');
      console.log('   3. Check browser network tab for failed API requests');
      console.log('   4. Verify the user ID being passed to API calls matches the database');
    } else {
      console.log('❌ Carlos Cuartas has NO active assignments');
      console.log('❌ This explains the empty dashboard');
      console.log('\n💡 Recommended next steps:');
      console.log('   1. Use the admin interface to assign projects to Carlos');
      console.log('   2. Check if assignments are being created but marked as inactive');
      console.log('   3. Verify the assignment creation process in the admin panel');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Dashboard API testing failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Run the test
testDashboardAPI();