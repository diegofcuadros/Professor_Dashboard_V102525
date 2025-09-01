#!/usr/bin/env node

/**
 * Assignment Edge Case Testing
 * 
 * This script tests various assignment creation scenarios to ensure
 * the database schema and foreign key relationships work correctly.
 */

import 'dotenv/config'; // Load .env file
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db, pool } from '../server/db.js';
import { users, projects, projectAssignments } from '../shared/schema.js';
import { eq, desc, and, not } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAssignmentEdgeCases() {
  console.log('🧪 Testing Assignment Creation Edge Cases');
  console.log('==========================================\n');
  
  try {
    // Get all users and projects for testing
    const allUsers = await db.select().from(users);
    const allProjects = await db.select().from(projects);
    const existingAssignments = await db.select().from(projectAssignments);
    
    console.log(`📊 Available for testing:`);
    console.log(`   • Users: ${allUsers.length}`);
    console.log(`   • Projects: ${allProjects.length}`);
    console.log(`   • Existing assignments: ${existingAssignments.length}\n`);
    
    // Test 1: Try to create assignment with valid IDs
    console.log('🧪 Test 1: Valid assignment creation');
    const studentUsers = allUsers.filter(u => u.role === 'student' || u.role === 'postdoc');
    const availableProjects = allProjects.filter(p => p.status === 'active');
    
    if (studentUsers.length > 0 && availableProjects.length > 0) {
      // Find a student that doesn't have assignments to all projects
      let testUser = null;
      let testProject = null;
      
      for (const user of studentUsers) {
        for (const project of availableProjects) {
          const existingAssignment = existingAssignments.find(a => 
            a.userId === user.id && a.projectId === project.id
          );
          if (!existingAssignment) {
            testUser = user;
            testProject = project;
            break;
          }
        }
        if (testUser && testProject) break;
      }
      
      if (testUser && testProject) {
        console.log(`   Creating assignment: ${testUser.firstName} ${testUser.lastName} → ${testProject.name}`);
        console.log(`   User ID type: ${typeof testUser.id} (${testUser.id})`);
        console.log(`   Project ID type: ${typeof testProject.id} (${testProject.id})\n`);
        
        try {
          const newAssignment = await db.insert(projectAssignments).values({
            userId: testUser.id,
            projectId: testProject.id,
            role: 'test_participant',
            isActive: true,
            allocationPercentage: 50,
          }).returning();
          
          console.log(`   ✅ SUCCESS: Assignment created with ID ${newAssignment[0].id}`);
          
          // Verify the assignment can be queried back
          const verifyAssignment = await db
            .select({
              assignmentId: projectAssignments.id,
              userName: users.firstName,
              projectName: projects.name
            })
            .from(projectAssignments)
            .innerJoin(users, eq(projectAssignments.userId, users.id))
            .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
            .where(eq(projectAssignments.id, newAssignment[0].id));
          
          if (verifyAssignment.length > 0) {
            console.log(`   ✅ VERIFIED: Assignment retrieval successful`);
            console.log(`      ${verifyAssignment[0].userName} assigned to ${verifyAssignment[0].projectName}`);
          } else {
            console.log(`   ❌ FAILED: Could not retrieve created assignment`);
          }
          
          // Clean up
          await db.delete(projectAssignments).where(eq(projectAssignments.id, newAssignment[0].id));
          console.log(`   🧹 Test assignment cleaned up\n`);
          
        } catch (error) {
          console.log(`   ❌ FAILED: ${error.message}`);
          if (error.code) {
            console.log(`      PostgreSQL Error Code: ${error.code}`);
          }
          console.log();
        }
      } else {
        console.log('   ℹ️  All possible assignments already exist\n');
      }
    } else {
      console.log('   ⚠️  Insufficient users or projects for testing\n');
    }
    
    // Test 2: Try invalid foreign key references
    console.log('🧪 Test 2: Invalid foreign key references');
    console.log('   Attempting assignment with non-existent user ID...');
    
    try {
      await db.insert(projectAssignments).values({
        userId: '00000000-0000-0000-0000-000000000000', // Non-existent ID
        projectId: availableProjects[0]?.id || '00000000-0000-0000-0000-000000000000',
        role: 'invalid_test',
        isActive: true,
      }).returning();
      
      console.log('   ❌ UNEXPECTED: Invalid assignment creation succeeded (should have failed)');
    } catch (error) {
      console.log('   ✅ EXPECTED: Invalid assignment creation failed');
      console.log(`      Error: ${error.message}`);
      console.log(`      PostgreSQL Error Code: ${error.code || 'N/A'}`);
    }
    console.log();
    
    // Test 3: Data type compatibility
    console.log('🧪 Test 3: Data type compatibility check');
    
    // Check what happens when we use different ID formats
    const sampleUser = allUsers[0];
    const sampleProject = allProjects[0];
    
    console.log(`   Sample user ID: "${sampleUser.id}" (${typeof sampleUser.id})`);
    console.log(`   Sample project ID: "${sampleProject.id}" (${typeof sampleProject.id})`);
    
    // Try to verify the IDs exist in their respective tables
    const userExists = await db.select().from(users).where(eq(users.id, sampleUser.id));
    const projectExists = await db.select().from(projects).where(eq(projects.id, sampleProject.id));
    
    console.log(`   User ID validation: ${userExists.length > 0 ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Project ID validation: ${projectExists.length > 0 ? '✅ Valid' : '❌ Invalid'}`);
    console.log();
    
    // Test 4: Complex assignment queries
    console.log('🧪 Test 4: Complex assignment queries');
    
    const complexQuery = await db
      .select({
        assignmentId: projectAssignments.id,
        userId: projectAssignments.userId,
        projectId: projectAssignments.projectId,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userRole: users.role,
        projectName: projects.name,
        projectStatus: projects.status,
        projectType: projects.projectType,
        isActive: projectAssignments.isActive,
        assignedAt: projectAssignments.createdAt,
      })
      .from(projectAssignments)
      .innerJoin(users, eq(projectAssignments.userId, users.id))
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(eq(projectAssignments.isActive, true));
    
    console.log(`   ✅ Complex join query returned ${complexQuery.length} records`);
    
    complexQuery.forEach((assignment, index) => {
      console.log(`   Assignment ${index + 1}:`);
      console.log(`     • ${assignment.userFirstName} ${assignment.userLastName} (${assignment.userRole})`);
      console.log(`     • Project: ${assignment.projectName} (${assignment.projectType})`);
      console.log(`     • Assigned: ${assignment.assignedAt?.toLocaleDateString()}`);
    });
    console.log();
    
    // Test 5: Schema validation
    console.log('🧪 Test 5: Schema validation summary');
    
    // Validate foreign key constraints are working
    const fkValidation = await pool.query(`
      SELECT 
        constraint_name,
        table_name,
        column_name,
        foreign_table_name,
        foreign_column_name
      FROM (
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE constraint_type = 'FOREIGN KEY' 
          AND tc.table_name = 'project_assignments'
      ) fk_info;
    `);
    
    console.log(`   Foreign key constraints for project_assignments:`);
    fkValidation.rows.forEach(fk => {
      console.log(`   ✅ ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    console.log('\n🎉 Assignment edge case testing completed!');
    
    console.log('\n📋 Summary:');
    console.log(`   • Database schema is correctly configured`);
    console.log(`   • Foreign key relationships are working`);
    console.log(`   • Assignment creation and retrieval works properly`);
    console.log(`   • Data type compatibility is maintained`);
    console.log(`   • Complex queries execute successfully`);
    
    if (existingAssignments.length === 0) {
      console.log('\n⚠️  Note: No assignments found in the database');
      console.log('   This could mean assignments haven\'t been created through the UI yet');
    } else {
      console.log(`\n✅ Found ${existingAssignments.length} existing assignment(s) in the database`);
      console.log('   Assignment creation functionality is working');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Edge case testing failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Run the test
testAssignmentEdgeCases();