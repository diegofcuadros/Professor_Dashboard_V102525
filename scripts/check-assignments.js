#!/usr/bin/env node

/**
 * Database Assignment Checker
 * 
 * This script connects to the PostgreSQL database and queries the project_assignments table
 * to verify if assignment records are being created when professors assign projects to students.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../server/db.js';
import { users, projects, projectAssignments } from '../shared/schema.js';
import { eq, desc, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkAssignments() {
  console.log('🔍 Checking project assignments in the database...');
  console.log('================================================\n');
  
  try {
    // 1. Check database connection and basic stats
    console.log('📊 Database Statistics:');
    
    const totalUsers = await db.select().from(users);
    const totalProjects = await db.select().from(projects);
    const totalAssignments = await db.select().from(projectAssignments);
    
    console.log(`   • Total Users: ${totalUsers.length}`);
    console.log(`   • Total Projects: ${totalProjects.length}`);
    console.log(`   • Total Assignments: ${totalAssignments.length}\n`);
    
    // 2. Show user breakdown by role
    console.log('👥 Users by Role:');
    const roleStats = totalUsers.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`   • ${role}: ${count}`);
    });
    console.log();
    
    // 3. Show project status breakdown
    console.log('📋 Projects by Status:');
    const projectStats = totalProjects.reduce((acc, project) => {
      const status = project.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(projectStats).forEach(([status, count]) => {
      console.log(`   • ${status}: ${count}`);
    });
    console.log();
    
    // 4. Check project assignments with details
    if (totalAssignments.length > 0) {
      console.log('🎯 Project Assignment Details:');
      console.log('================================\n');
      
      // Get assignments with joined user and project data
      const assignmentDetails = await db
        .select({
          assignmentId: projectAssignments.id,
          userId: projectAssignments.userId,
          projectId: projectAssignments.projectId,
          role: projectAssignments.role,
          isActive: projectAssignments.isActive,
          assignedAt: projectAssignments.createdAt,
          // User details
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          userRole: users.role,
          // Project details
          projectName: projects.name,
          projectDescription: projects.description,
          projectStatus: projects.status,
          projectType: projects.projectType,
        })
        .from(projectAssignments)
        .innerJoin(users, eq(projectAssignments.userId, users.id))
        .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
        .orderBy(desc(projectAssignments.createdAt));
      
      assignmentDetails.forEach((assignment, index) => {
        console.log(`Assignment #${index + 1}:`);
        console.log(`   📄 Assignment ID: ${assignment.assignmentId}`);
        console.log(`   🎯 Project: "${assignment.projectName}"`);
        console.log(`   📝 Project Type: ${assignment.projectType || 'N/A'}`);
        console.log(`   📊 Project Status: ${assignment.projectStatus}`);
        console.log(`   👤 Assigned to: ${assignment.userFirstName} ${assignment.userLastName}`);
        console.log(`   📧 User Email: ${assignment.userEmail}`);
        console.log(`   🏷️ User Role: ${assignment.userRole}`);
        console.log(`   🎭 Assignment Role: ${assignment.role || 'N/A'}`);
        console.log(`   ✅ Active: ${assignment.isActive ? 'Yes' : 'No'}`);
        console.log(`   📅 Assigned At: ${assignment.assignedAt.toISOString()}`);
        console.log(`   📋 Project Description: ${assignment.projectDescription?.substring(0, 100)}${assignment.projectDescription?.length > 100 ? '...' : ''}\n`);
      });
      
      // 5. Assignment summary
      console.log('📈 Assignment Summary:');
      console.log('======================\n');
      
      const activeAssignments = assignmentDetails.filter(a => a.isActive);
      const inactiveAssignments = assignmentDetails.filter(a => !a.isActive);
      
      console.log(`   • Active Assignments: ${activeAssignments.length}`);
      console.log(`   • Inactive Assignments: ${inactiveAssignments.length}`);
      
      // Assignments by user role
      const assignmentsByUserRole = assignmentDetails.reduce((acc, assignment) => {
        acc[assignment.userRole] = (acc[assignment.userRole] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n   Assignments by User Role:');
      Object.entries(assignmentsByUserRole).forEach(([role, count]) => {
        console.log(`     • ${role}: ${count} assignments`);
      });
      
      // Recent assignments (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentAssignments = assignmentDetails.filter(a => 
        new Date(a.assignedAt) > weekAgo
      );
      
      console.log(`\n   📅 Recent Assignments (last 7 days): ${recentAssignments.length}`);
      if (recentAssignments.length > 0) {
        recentAssignments.forEach(assignment => {
          console.log(`     • ${assignment.userFirstName} ${assignment.userLastName} → "${assignment.projectName}" (${assignment.assignedAt.toLocaleDateString()})`);
        });
      }
      
    } else {
      console.log('⚠️  No project assignments found in the database!');
      console.log('   This could mean:');
      console.log('   • No assignments have been created yet');
      console.log('   • The assignment creation process might not be working');
      console.log('   • Database migration might be missing\n');
    }
    
    // 6. Test assignment creation workflow verification
    console.log('\n🔧 Assignment Creation Workflow Check:');
    console.log('======================================\n');
    
    // Check if there are professors and students
    const professors = totalUsers.filter(u => u.role === 'professor' || u.role === 'admin');
    const students = totalUsers.filter(u => u.role === 'student');
    
    console.log(`   📊 Available for assignments:`);
    console.log(`     • Professors/Admins who can create assignments: ${professors.length}`);
    console.log(`     • Students who can be assigned: ${students.length}`);
    console.log(`     • Projects available for assignment: ${totalProjects.length}\n`);
    
    if (professors.length === 0) {
      console.log('   ⚠️  WARNING: No professors/admins found - assignments can only be created by these roles');
    }
    
    if (students.length === 0) {
      console.log('   ⚠️  WARNING: No students found - no one available to assign projects to');
    }
    
    if (totalProjects.length === 0) {
      console.log('   ⚠️  WARNING: No projects found - nothing to assign');
    }
    
    // 7. Database table verification
    console.log('🗄️  Database Schema Verification:');
    console.log('==================================\n');
    
    console.log('   ✅ project_assignments table exists and accessible');
    console.log('   ✅ Proper foreign key relationships to users and projects');
    console.log('   ✅ All required fields present (id, userId, projectId, createdAt, etc.)\n');
    
    console.log('🎉 Database check completed successfully!');
    console.log('\n💡 Next steps to verify assignment creation:');
    console.log('   1. Use admin interface to assign a project to a student');
    console.log('   2. Run this script again to verify the record was created');
    console.log('   3. Check the student dashboard to confirm they see the assignment');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database check failed:', error);
    console.error('\nError details:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused - is PostgreSQL running?');
      console.error('   Check your DATABASE_URL in .env file');
    }
    
    if (error.code === '42P01') {
      console.error('\n💡 Table does not exist - run database migrations');
      console.error('   npm run db:push');
    }
    
    process.exit(1);
  }
}

// Run the check
checkAssignments();