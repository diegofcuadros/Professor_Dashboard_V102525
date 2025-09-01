#!/usr/bin/env node

/**
 * Test script to create a user "carlos cuartas" and assign them to a project
 * This will help us test the assignment functionality end-to-end
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../server/db.js';
import { users, projects, projectAssignments } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAssignment() {
  console.log('🧪 Testing assignment functionality...');
  console.log('=====================================\n');
  
  try {
    // 1. Check if "carlos cuartas" exists, if not create him
    console.log('👤 Checking for "carlos cuartas" user...');
    
    let carlosUser = await db.select().from(users).where(eq(users.email, 'carlos.cuartas@lab.local'));
    
    if (carlosUser.length === 0) {
      console.log('❌ User "carlos cuartas" not found. Creating user...');
      
      const hashedPassword = await bcrypt.hash('student123', 10);
      
      carlosUser = await db.insert(users).values({
        email: 'carlos.cuartas@lab.local',
        passwordHash: hashedPassword,
        firstName: 'Carlos',
        lastName: 'Cuartas',
        role: 'student',
        department: 'Computer Science',
        yearLevel: '1st Year PhD',
        specialization: 'Machine Learning',
        isActive: true
      }).returning();
      
      console.log(`✅ Created user: Carlos Cuartas (${carlosUser[0].email}) - ID: ${carlosUser[0].id}`);
    } else {
      console.log(`✅ Found user: ${carlosUser[0].firstName} ${carlosUser[0].lastName} (${carlosUser[0].email}) - ID: ${carlosUser[0].id}`);
    }
    
    // 2. Get an existing project to assign
    console.log('\n📋 Getting available projects...');
    const availableProjects = await db.select().from(projects);
    
    if (availableProjects.length === 0) {
      console.log('❌ No projects available for assignment!');
      process.exit(1);
    }
    
    const testProject = availableProjects[0];
    console.log(`📊 Selected project: "${testProject.name}" (ID: ${testProject.id})`);
    
    // 3. Check if assignment already exists
    console.log('\n🔍 Checking for existing assignment...');
    const existingAssignment = await db.select().from(projectAssignments).where(
      and(
        eq(projectAssignments.userId, carlosUser[0].id),
        eq(projectAssignments.projectId, testProject.id)
      )
    );
    
    if (existingAssignment.length > 0) {
      console.log(`✅ Assignment already exists! Assignment ID: ${existingAssignment[0].id}`);
      console.log(`   - User: ${carlosUser[0].firstName} ${carlosUser[0].lastName}`);
      console.log(`   - Project: ${testProject.name}`);
      console.log(`   - Role: ${existingAssignment[0].role}`);
      console.log(`   - Active: ${existingAssignment[0].isActive}`);
      console.log(`   - Assigned at: ${existingAssignment[0].createdAt}`);
    } else {
      console.log('❌ No existing assignment found. Creating new assignment...');
      
      // 4. Create the assignment
      const newAssignment = await db.insert(projectAssignments).values({
        userId: carlosUser[0].id,
        projectId: testProject.id,
        role: 'assignee',
        isActive: true,
        startDate: new Date().toISOString().split('T')[0], // Today's date
      }).returning();
      
      console.log(`✅ Created assignment! Assignment ID: ${newAssignment[0].id}`);
      console.log(`   - User: ${carlosUser[0].firstName} ${carlosUser[0].lastName}`);
      console.log(`   - Project: ${testProject.name}`);
      console.log(`   - Role: ${newAssignment[0].role}`);
      console.log(`   - Active: ${newAssignment[0].isActive}`);
      console.log(`   - Assigned at: ${newAssignment[0].createdAt}`);
    }
    
    // 5. Verify assignment was created properly
    console.log('\n🔍 Verifying assignment records...');
    const userAssignments = await db
      .select({
        assignmentId: projectAssignments.id,
        projectName: projects.name,
        projectDescription: projects.description,
        role: projectAssignments.role,
        isActive: projectAssignments.isActive,
        assignedAt: projectAssignments.createdAt
      })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(eq(projectAssignments.userId, carlosUser[0].id));
    
    console.log(`📊 Carlos Cuartas has ${userAssignments.length} assignment(s):`);
    userAssignments.forEach((assignment, index) => {
      console.log(`   Assignment #${index + 1}:`);
      console.log(`     - Project: "${assignment.projectName}"`);
      console.log(`     - Role: ${assignment.role}`);
      console.log(`     - Active: ${assignment.isActive}`);
      console.log(`     - Assigned: ${assignment.assignedAt.toLocaleString()}`);
      console.log(`     - Description: ${assignment.projectDescription?.substring(0, 100)}...`);
      console.log('');
    });
    
    // 6. Test the API endpoint response (simulate what the student dashboard would get)
    console.log('🌐 Testing API endpoint response...');
    
    // This simulates what the `/api/assignments/user/${userId}` endpoint should return
    const apiResponse = await db
      .select({
        // Assignment fields
        id: projectAssignments.id,
        userId: projectAssignments.userId,
        projectId: projectAssignments.projectId,
        assignedAt: projectAssignments.createdAt,
        isActive: projectAssignments.isActive,
        // Project fields  
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(and(
        eq(projectAssignments.userId, carlosUser[0].id), 
        eq(projectAssignments.isActive, true)
      ));
    
    console.log(`✅ API response would return ${apiResponse.length} active project(s) for Carlos:`);
    apiResponse.forEach((project, index) => {
      console.log(`   Project #${index + 1}: "${project.name}" (Status: ${project.status})`);
    });
    
    console.log('\n🎉 Assignment test completed successfully!');
    
    console.log('\n💡 Summary:');
    console.log(`   • User created/found: Carlos Cuartas (${carlosUser[0].email})`);
    console.log(`   • User ID: ${carlosUser[0].id}`);
    console.log(`   • Total assignments: ${userAssignments.length}`);
    console.log(`   • Active assignments: ${apiResponse.length}`);
    
    if (apiResponse.length > 0) {
      console.log('\n✅ The student "carlos cuartas" should now see projects in their dashboard!');
      console.log('   Next steps:');
      console.log('   1. Log in as carlos.cuartas@lab.local / student123');
      console.log('   2. Check the student dashboard to see assigned projects');
    } else {
      console.log('\n❌ No active assignments found - carlos cuartas will still see an empty dashboard');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Assignment test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAssignment();