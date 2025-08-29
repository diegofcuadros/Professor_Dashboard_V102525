import {
  users,
  projects,
  projectAssignments,
  progressUpdates,
  notifications,
  type User,
  type InsertUser,
  type CreateUserInput,
  type Project,
  type InsertProject,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type ProgressUpdate,
  type InsertProgressUpdate,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations for email/password authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: CreateUserInput): Promise<User>;
  validateUserPassword(email: string, password: string): Promise<User | null>;
  
  // User management operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  deactivateUser(id: string): Promise<User | undefined>;
  
  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getUserProjects(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined>;
  
  // Project assignment operations
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  getUserAssignments(userId: string): Promise<ProjectAssignment[]>;
  getProjectAssignments(projectId: string): Promise<ProjectAssignment[]>;
  
  // Progress tracking operations
  createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate>;
  getProjectProgress(projectId: string): Promise<ProgressUpdate[]>;
  getUserProgress(userId: string): Promise<ProgressUpdate[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  
  // Analytics operations
  getUserMetrics(userId: string): Promise<any>;
  getLabMetrics(): Promise<any>;

  // Time tracking operations
  createTimeEntry(entry: any): Promise<any>;
  getAllTimeEntries(weekStart?: string): Promise<any[]>;
  getUserTimeEntries(userId: string, weekStart?: string): Promise<any[]>;
  approveTimeEntry(entryId: string, approverId: string): Promise<any>;

  // Work schedule operations
  createWorkSchedule(schedule: any): Promise<any>;
  getAllWorkSchedules(weekStart?: string): Promise<any[]>;
  getUserWorkSchedules(userId: string, weekStart?: string): Promise<any[]>;
  approveWorkSchedule(scheduleId: string, approverId: string): Promise<any>;

  // Report operations
  createReport(reportData: any): Promise<any>;
  getUserReports(userId: string): Promise<any[]>;
  updateReportStatus(reportId: string, status: string): Promise<any>;
  getReportDownloadUrl(reportId: string): Promise<string>;
  getProductivityReports(dateRange: string): Promise<any[]>;
  getProjectReports(dateRange: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations for email/password authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
    
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'student',
        department: userData.department,
        yearLevel: userData.yearLevel,
        specialization: userData.specialization,
        isActive: true,
      })
      .returning();
    return user;
  }

  async validateUserPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return null;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    return isValidPassword ? user : null;
  }

  // User management operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName);
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deactivateUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.userId, userId))
      .then(rows => rows.map(row => row.projects));
  }

  async updateProject(id: string, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  // Project assignment operations
  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [newAssignment] = await db.insert(projectAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getUserAssignments(userId: string): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(and(eq(projectAssignments.userId, userId), eq(projectAssignments.isActive, true)));
  }

  async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.isActive, true)));
  }

  // Progress tracking operations
  async createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate> {
    const [newUpdate] = await db.insert(progressUpdates).values(update).returning();
    return newUpdate;
  }

  async getProjectProgress(projectId: string): Promise<ProgressUpdate[]> {
    return await db
      .select()
      .from(progressUpdates)
      .innerJoin(projectAssignments, eq(progressUpdates.assignmentId, projectAssignments.id))
      .where(eq(projectAssignments.projectId, projectId))
      .orderBy(desc(progressUpdates.createdAt))
      .then(rows => rows.map(row => row.progress_updates));
  }

  async getUserProgress(userId: string): Promise<ProgressUpdate[]> {
    return await db
      .select()
      .from(progressUpdates)
      .innerJoin(projectAssignments, eq(progressUpdates.assignmentId, projectAssignments.id))
      .where(eq(projectAssignments.userId, userId))
      .orderBy(desc(progressUpdates.createdAt))
      .then(rows => rows.map(row => row.progress_updates));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.sentAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification | undefined> {
    const [notification] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  // Analytics operations
  async getUserMetrics(userId: string): Promise<any> {
    // This would contain complex queries for user analytics
    // For Phase 1, we'll return basic metrics
    const assignments = await this.getUserAssignments(userId);
    const progress = await this.getUserProgress(userId);
    
    return {
      activeProjects: assignments.length,
      totalUpdates: progress.length,
      weeklyHours: 0, // Will be calculated from time logs
      productivityScore: 85, // Placeholder for Phase 1
    };
  }

  async getLabMetrics(): Promise<any> {
    // Lab-wide analytics for admin/professor view
    const allUsers = await this.getAllUsers();
    const allProjects = await this.getAllProjects();
    
    return {
      totalUsers: allUsers.length,
      activeStudents: allUsers.filter(u => u.role === 'student' && u.isActive).length,
      activeProjects: allProjects.filter(p => p.status === 'active').length,
      totalProjects: allProjects.length,
    };
  }

  // Time tracking methods
  async createTimeEntry(entry: any): Promise<any> {
    // For Phase 4 implementation - stub for now
    return { id: "temp-id", ...entry };
  }

  async getAllTimeEntries(weekStart?: string): Promise<any[]> {
    // For Phase 4 implementation - return empty array for now
    return [];
  }

  async getUserTimeEntries(userId: string, weekStart?: string): Promise<any[]> {
    // For Phase 4 implementation - return empty array for now
    return [];
  }

  async approveTimeEntry(entryId: string, approverId: string): Promise<any> {
    // For Phase 4 implementation - stub for now
    return { id: entryId, approved: true, approvedBy: approverId };
  }

  // Work schedule methods
  async createWorkSchedule(schedule: any): Promise<any> {
    // For Phase 4 implementation - stub for now
    return { id: "temp-id", ...schedule };
  }

  async getAllWorkSchedules(weekStart?: string): Promise<any[]> {
    // For Phase 4 implementation - return empty array for now
    return [];
  }

  async getUserWorkSchedules(userId: string, weekStart?: string): Promise<any[]> {
    // For Phase 4 implementation - return empty array for now
    return [];
  }

  async approveWorkSchedule(scheduleId: string, approverId: string): Promise<any> {
    // For Phase 4 implementation - stub for now
    return { id: scheduleId, approved: true, approvedBy: approverId };
  }

  // Report methods
  async createReport(reportData: any): Promise<any> {
    // For Phase 4 implementation - create a stub report
    return {
      id: `report-${Date.now()}`,
      ...reportData,
      status: 'generating',
      generatedAt: new Date().toISOString(),
      fileSize: null
    };
  }

  async getUserReports(userId: string): Promise<any[]> {
    // For Phase 4 implementation - return sample reports
    return [
      {
        id: 'report-1',
        title: 'Weekly Productivity Report',
        type: 'productivity',
        generatedAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: userId,
        status: 'completed',
        fileSize: '2.3 MB'
      },
      {
        id: 'report-2', 
        title: 'Project Status Summary',
        type: 'projects',
        generatedAt: new Date(Date.now() - 172800000).toISOString(),
        createdBy: userId,
        status: 'completed',
        fileSize: '1.8 MB'
      }
    ];
  }

  async updateReportStatus(reportId: string, status: string): Promise<any> {
    // For Phase 4 implementation - stub for now
    return { id: reportId, status };
  }

  async getReportDownloadUrl(reportId: string): Promise<string> {
    // For Phase 4 implementation - return a mock download URL
    return `https://example.com/reports/${reportId}/download`;
  }

  async getProductivityReports(dateRange: string): Promise<any[]> {
    // For Phase 4 implementation - return sample productivity data
    const users = await this.getAllUsers();
    return users.map((user, index) => ({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      totalHours: 32 + (index * 4),
      completedTasks: 8 + index,
      activeProjects: 2 + (index % 3),
      productivityScore: 75 + (index * 5),
      weeklyTrend: [85, 88, 92, 87]
    }));
  }

  async getProjectReports(dateRange: string): Promise<any[]> {
    // For Phase 4 implementation - return sample project data
    const projects = await this.getAllProjects();
    return projects.map((project, index) => ({
      projectId: project.id,
      projectName: project.title,
      status: project.status,
      progress: 60 + (index * 10),
      totalHours: 120 + (index * 20),
      teamSize: 3 + (index % 4),
      deadline: new Date(Date.now() + (30 + index * 10) * 86400000).toISOString(),
      riskLevel: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high'
    }));
  }
}

export const storage = new DatabaseStorage();
