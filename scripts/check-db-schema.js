#!/usr/bin/env node

/**
 * Database Schema Checker
 * 
 * This script connects to PostgreSQL and checks the actual table schema,
 * verifies data types, and tests assignment creation to identify the mismatch issue.
 */

import 'dotenv/config'; // Load .env file
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db, pool } from '../server/db.js';
import { users, projects, projectAssignments } from '../shared/schema.js';
import { eq, desc, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkDatabaseSchema() {
  console.log('🔍 Database Schema Verification');
  console.log('=================================\n');
  
  try {
    // 1. Test basic connection
    console.log('📡 Testing database connection...');
    const connectionTest = await pool.query('SELECT NOW() as current_time');
    console.log(`✅ Connected to PostgreSQL at ${connectionTest.rows[0].current_time}\n`);
    
    // 2. Check actual table structures and data types
    console.log('🏗️  Checking table structures and data types...');
    
    // Check users table structure
    const usersSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('👤 Users table structure:');
    usersSchema.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    console.log();
    
    // Check projects table structure
    const projectsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Projects table structure:');
    projectsSchema.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    console.log();
    
    // Check project_assignments table structure
    const assignmentsSchema = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'project_assignments' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('🎯 Project_assignments table structure:');
    assignmentsSchema.rows.forEach(col => {
      console.log(`   • ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    console.log();
    
    // 3. Check foreign key constraints
    console.log('🔗 Checking foreign key constraints...');
    const fkConstraints = await pool.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
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
        AND tc.table_name IN ('project_assignments', 'users', 'projects');
    `);
    
    console.log('Foreign key constraints:');
    fkConstraints.rows.forEach(fk => {
      console.log(`   • ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    console.log();
    
    // 4. DATA TYPE MISMATCH CHECK - This is the key issue!
    console.log('⚠️  DATA TYPE MISMATCH ANALYSIS:');
    console.log('==================================\n');
    
    const usersIdType = usersSchema.rows.find(col => col.column_name === 'id')?.data_type;
    const projectsIdType = projectsSchema.rows.find(col => col.column_name === 'id')?.data_type;
    const assignmentsUserIdType = assignmentsSchema.rows.find(col => col.column_name === 'user_id')?.data_type;
    const assignmentsProjectIdType = assignmentsSchema.rows.find(col => col.column_name === 'project_id')?.data_type;
    
    console.log(`🔍 Data type comparison:`);
    console.log(`   • users.id: ${usersIdType}`);
    console.log(`   • projects.id: ${projectsIdType}`);
    console.log(`   • project_assignments.userId: ${assignmentsUserIdType}`);
    console.log(`   • project_assignments.projectId: ${assignmentsProjectIdType}\n`);
    
    // Check for mismatches
    if (usersIdType !== assignmentsUserIdType) {
      console.log('🚨 FOUND ISSUE: users.id type does NOT match project_assignments.userId type!');
      console.log(`   Expected: ${assignmentsUserIdType}, Got: ${usersIdType}`);
      console.log('   This will cause foreign key constraint violations!\n');
    } else {
      console.log('✅ users.id and project_assignments.userId types match\n');
    }
    
    if (projectsIdType !== assignmentsProjectIdType) {
      console.log('🚨 FOUND ISSUE: projects.id type does NOT match project_assignments.projectId type!');
      console.log(`   Expected: ${assignmentsProjectIdType}, Got: ${projectsIdType}`);
      console.log('   This will cause foreign key constraint violations!\n');
    } else {
      console.log('✅ projects.id and project_assignments.projectId types match\n');
    }
    
    // 5. Check current data
    console.log('📊 Current data counts:');
    const userCount = await db.select().from(users);
    const projectCount = await db.select().from(projects);
    const assignmentCount = await db.select().from(projectAssignments);
    
    console.log(`   • Users: ${userCount.length}`);
    console.log(`   • Projects: ${projectCount.length}`);
    console.log(`   • Assignments: ${assignmentCount.length}\n`);
    
    // 6. Show sample IDs if data exists
    if (userCount.length > 0) {
      console.log('🔍 Sample user IDs:');
      userCount.slice(0, 3).forEach(user => {
        console.log(`   • ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}: ${user.id} (${typeof user.id})`);
      });
      console.log();
    }
    
    if (projectCount.length > 0) {
      console.log('🔍 Sample project IDs:');
      projectCount.slice(0, 3).forEach(project => {
        console.log(`   • ${project.name}: ${project.id} (${typeof project.id})`);
      });
      console.log();
    }
    
    if (assignmentCount.length > 0) {
      console.log('🔍 Sample assignment references:');
      assignmentCount.slice(0, 3).forEach(assignment => {
        console.log(`   • Assignment ${assignment.id}:`);
        console.log(`     - userId: ${assignment.userId} (${typeof assignment.userId})`);
        console.log(`     - projectId: ${assignment.projectId} (${typeof assignment.projectId})`);
      });
      console.log();
    }
    
    // 7. Test assignment creation with type checking
    console.log('🧪 Testing assignment creation...');
    if (userCount.length > 0 && projectCount.length > 0) {
      const testUser = userCount[0];
      const testProject = projectCount[0];
      
      console.log(`   Attempting to create assignment:`);
      console.log(`     User ID: ${testUser.id} (${typeof testUser.id})`);
      console.log(`     Project ID: ${testProject.id} (${typeof testProject.id})\n`);
      
      try {
        // First check if assignment exists
        const existingAssignment = await db.select().from(projectAssignments)
          .where(and(
            eq(projectAssignments.userId, testUser.id),
            eq(projectAssignments.projectId, testProject.id)
          ));
        
        if (existingAssignment.length === 0) {
          const newAssignment = await db.insert(projectAssignments).values({
            userId: testUser.id,
            projectId: testProject.id,
            role: 'test_assignment',
            isActive: true,
          }).returning();
          
          console.log(`✅ Test assignment created successfully! ID: ${newAssignment[0].id}`);
          
          // Clean up test assignment
          await db.delete(projectAssignments).where(eq(projectAssignments.id, newAssignment[0].id));
          console.log('   🧹 Test assignment cleaned up\n');
        } else {
          console.log('✅ Test assignment already exists, no need to create\n');
        }
      } catch (error) {
        console.log('❌ Test assignment creation FAILED:');
        console.log(`   Error: ${error.message}`);
        if (error.code) {
          console.log(`   PostgreSQL Error Code: ${error.code}`);
        }
        console.log('   This confirms the schema mismatch issue!\n');
      }
    } else {
      console.log('⚠️  Cannot test assignment creation - missing users or projects\n');
    }
    
    console.log('🎉 Database schema analysis completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database schema check failed:', error);
    console.error('\nError details:', error.message);
    process.exit(1);
  }
}

// Run the check
checkDatabaseSchema();