#!/usr/bin/env node

// Database seeding script for initial lab setup
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from '../server/db.ts';
import { users, projects } from '../shared/schema.ts';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedDatabase() {
  console.log('🌱 Seeding LIA Lab database...');
  
  try {
    // Create admin user (professor)
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    console.log('👨‍🏫 Creating admin/professor user...');
    const adminUser = await db.insert(users).values({
      email: 'admin@lab.local',
      passwordHash: hashedPassword,
      firstName: 'Professor',
      lastName: 'Admin',
      role: 'admin',
      department: 'Computer Science',
      specialization: 'Data Science & Health Informatics',
      isActive: true
    }).returning();
    
    console.log(`✅ Created admin user: ${adminUser[0].email}`);
    
    // Create sample student users
    console.log('👩‍🎓 Creating sample student users...');
    
    const students = [
      {
        email: 'student1@lab.local',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: 'student',
        yearLevel: '2nd Year PhD',
        specialization: 'Health Data Analytics'
      },
      {
        email: 'student2@lab.local', 
        firstName: 'Bob',
        lastName: 'Smith',
        role: 'student',
        yearLevel: '1st Year PhD',
        specialization: 'Machine Learning'
      },
      {
        email: 'postdoc1@lab.local',
        firstName: 'Dr. Carol',
        lastName: 'Davis',
        role: 'postdoc',
        yearLevel: 'Postdoc',
        specialization: 'Epidemiology'
      }
    ];
    
    const defaultPassword = await bcrypt.hash('student123', 10);
    
    for (const student of students) {
      const createdStudent = await db.insert(users).values({
        ...student,
        passwordHash: defaultPassword,
        department: 'Computer Science',
        isActive: true
      }).returning();
      
      console.log(`✅ Created ${student.role}: ${createdStudent[0].email}`);
    }
    
    // Create sample projects
    console.log('📊 Creating sample research projects...');
    
    const sampleProjects = [
      {
        name: 'COVID-19 Health Disparities Analysis',
        description: 'Analyzing health disparities in COVID-19 outcomes across different demographic groups using machine learning techniques.',
        projectType: 'Research',
        status: 'active',
        createdBy: adminUser[0].id,
        startDate: new Date('2024-01-15'),
        targetEndDate: new Date('2024-12-15')
      },
      {
        name: 'Electronic Health Records NLP Pipeline',
        description: 'Development of natural language processing pipeline for extracting clinical insights from electronic health records.',
        projectType: 'Development',
        status: 'active', 
        createdBy: adminUser[0].id,
        startDate: new Date('2024-02-01'),
        targetEndDate: new Date('2024-11-30')
      },
      {
        name: 'Predictive Modeling for Diabetes Risk',
        description: 'Creating predictive models to identify patients at high risk for Type 2 diabetes using clinical and lifestyle data.',
        projectType: 'Research',
        status: 'active',
        createdBy: adminUser[0].id,
        startDate: new Date('2024-03-01'),
        targetEndDate: new Date('2025-02-28')
      }
    ];
    
    for (const project of sampleProjects) {
      const createdProject = await db.insert(projects).values(project).returning();
      console.log(`✅ Created project: ${createdProject[0].name}`);
    }
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Default Login Credentials:');
    console.log('Admin/Professor: admin@lab.local / admin123');
    console.log('Students: student1@lab.local / student123');
    console.log('          student2@lab.local / student123'); 
    console.log('Postdoc: postdoc1@lab.local / student123');
    console.log('\n⚠️  Remember to change passwords after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();