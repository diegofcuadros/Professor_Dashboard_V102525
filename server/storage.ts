import {
  users,
  projects,
  projectAssignments,
  progressUpdates,
  notifications,
  projectTasks,
  taskAssignments,
  taskCompletions,
  workSchedules,
  scheduleBlocks,
  timeEntries,
  timeLogs,
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
  type ProjectTask,
  type InsertProjectTask,
  type TaskAssignment,
  type InsertTaskAssignment,
  type TaskCompletion,
  type InsertTaskCompletion,
  type WorkSchedule,
  type InsertWorkSchedule,
  type ScheduleBlock,
  type InsertScheduleBlock,
  type TimeEntry,
  type InsertTimeEntry,
  type TimeLog,
  type InsertTimeLog,
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
  createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule>;
  getAllWorkSchedules(weekStart?: string): Promise<WorkSchedule[]>;
  getUserWorkSchedules(userId: string, weekStart?: string): Promise<WorkSchedule[]>;
  approveWorkSchedule(scheduleId: string, approverId: string): Promise<WorkSchedule | undefined>;
  
  // Schedule block operations
  createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock>;
  getScheduleBlocks(scheduleId: string): Promise<ScheduleBlock[]>;
  updateScheduleBlock(id: string, updates: Partial<InsertScheduleBlock>): Promise<ScheduleBlock | undefined>;
  deleteScheduleBlock(id: string): Promise<boolean>;
  
  // Schedule validation operations
  validateWeeklySchedule(userId: string, weekStart: string): Promise<{ isValid: boolean; totalHours: number; violations: string[] }>;
  getScheduleCompliance(userId?: string): Promise<any>;

  // Report operations
  createReport(reportData: any): Promise<any>;
  getUserReports(userId: string): Promise<any[]>;
  updateReportStatus(reportId: string, status: string): Promise<any>;
  getReportDownloadUrl(reportId: string): Promise<string>;
  getProductivityReports(dateRange: string): Promise<any[]>;
  getProjectReports(dateRange: string): Promise<any[]>;

  // Task operations
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  getProjectTasks(projectId: string): Promise<ProjectTask[]>;
  updateProjectTask(id: string, updates: Partial<InsertProjectTask>): Promise<ProjectTask | undefined>;
  deleteProjectTask(id: string): Promise<boolean>;
  
  // Task assignment operations
  assignTaskToUser(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  getUserTasks(userId: string): Promise<(ProjectTask & { projectName: string, isCompleted?: boolean })[]>;
  getUserTasksForProject(userId: string, projectId: string): Promise<(ProjectTask & { isCompleted?: boolean })[]>;
  
  // Task completion operations
  completeTask(completion: InsertTaskCompletion): Promise<TaskCompletion>;
  getTaskCompletions(taskId: string): Promise<TaskCompletion[]>;
  isTaskCompletedByUser(taskId: string, userId: string): Promise<boolean>;
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
  async createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [newSchedule] = await db.insert(workSchedules).values(schedule).returning();
    return newSchedule;
  }

  async getAllWorkSchedules(weekStart?: string): Promise<WorkSchedule[]> {
    let query = db.select().from(workSchedules).orderBy(desc(workSchedules.createdAt));
    
    if (weekStart) {
      query = query.where(eq(workSchedules.weekStartDate, weekStart));
    }
    
    return await query;
  }

  async getUserWorkSchedules(userId: string, weekStart?: string): Promise<WorkSchedule[]> {
    const whereConditions = [eq(workSchedules.userId, userId)];
    
    if (weekStart) {
      whereConditions.push(eq(workSchedules.weekStartDate, weekStart));
    }
    
    return await db.select()
      .from(workSchedules)
      .where(and(...whereConditions))
      .orderBy(desc(workSchedules.createdAt));
  }

  async approveWorkSchedule(scheduleId: string, approverId: string): Promise<WorkSchedule | undefined> {
    const [schedule] = await db
      .update(workSchedules)
      .set({ 
        approved: true, 
        approvedBy: approverId, 
        approvedAt: new Date(),
        status: 'approved',
        updatedAt: new Date()
      })
      .where(eq(workSchedules.id, scheduleId))
      .returning();
    return schedule;
  }
  
  // Schedule block operations
  async createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock> {
    const [newBlock] = await db.insert(scheduleBlocks).values(block).returning();
    return newBlock;
  }
  
  async getScheduleBlocks(scheduleId: string): Promise<ScheduleBlock[]> {
    return await db
      .select()
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.scheduleId, scheduleId))
      .orderBy(scheduleBlocks.dayOfWeek, scheduleBlocks.startTime);
  }
  
  async updateScheduleBlock(id: string, updates: Partial<InsertScheduleBlock>): Promise<ScheduleBlock | undefined> {
    const [block] = await db
      .update(scheduleBlocks)
      .set(updates)
      .where(eq(scheduleBlocks.id, id))
      .returning();
    return block;
  }
  
  async deleteScheduleBlock(id: string): Promise<boolean> {
    const result = await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    return (result.rowCount ?? 0) > 0;
  }
  
  // Schedule validation operations
  async validateWeeklySchedule(userId: string, weekStart: string): Promise<{ isValid: boolean; totalHours: number; violations: string[] }> {
    const schedules = await this.getUserWorkSchedules(userId, weekStart);
    const violations: string[] = [];
    let totalHours = 0;
    
    // Get minimum required hours from environment (default 20)
    const minWeeklyHours = parseInt(process.env.MINIMUM_WEEKLY_HOURS || '20');
    
    for (const schedule of schedules) {
      // Get schedule blocks for this schedule
      const blocks = await this.getScheduleBlocks(schedule.id);
      
      // Calculate total hours from actual blocks (more accurate than stored value)
      let scheduleHours = 0;
      for (const block of blocks) {
        if (block.startTime && block.endTime) {
          scheduleHours += this.calculateBlockDuration(block.startTime, block.endTime);
        }
      }
      totalHours += scheduleHours;
      
      // Validate schedule blocks don't overlap
      for (let i = 0; i < blocks.length; i++) {
        for (let j = i + 1; j < blocks.length; j++) {
          const block1 = blocks[i];
          const block2 = blocks[j];
          
          if (block1.dayOfWeek === block2.dayOfWeek) {
            const start1 = block1.startTime || '00:00';
            const end1 = block1.endTime || '00:00';
            const start2 = block2.startTime || '00:00';
            const end2 = block2.endTime || '00:00';
            
            if (this.timePeriodsOverlap(start1, end1, start2, end2)) {
              violations.push(`Overlapping time blocks on ${block1.dayOfWeek}`);
            }
          }
        }
      }
    }
    
    // Check minimum hours requirement
    if (totalHours < minWeeklyHours) {
      violations.push(`Weekly schedule must include at least ${minWeeklyHours} hours (current: ${totalHours.toFixed(1)})`);
    }
    
    return {
      isValid: violations.length === 0,
      totalHours: parseFloat(totalHours.toFixed(1)),
      violations
    };
  }
  
  private calculateBlockDuration(startTime: string, endTime: string): number {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    // Handle overnight shifts (end time next day)
    if (endMinutes <= startMinutes) {
      return ((24 * 60) + endMinutes - startMinutes) / 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  private timePeriodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const s1 = parseTime(start1);
    const e1 = parseTime(end1);
    const s2 = parseTime(start2);
    const e2 = parseTime(end2);
    
    return s1 < e2 && s2 < e1;
  }
  
  async getScheduleCompliance(userId?: string, weekStart?: string): Promise<any> {
    let query = db.select({
      userId: workSchedules.userId,
      weekStartDate: workSchedules.weekStartDate,
      totalScheduledHours: workSchedules.totalScheduledHours,
      approved: workSchedules.approved,
      status: workSchedules.status,
      firstName: users.firstName,
      lastName: users.lastName
    })
    .from(workSchedules)
    .innerJoin(users, eq(workSchedules.userId, users.id))
    .orderBy(desc(workSchedules.weekStartDate), users.firstName);
    
    if (userId) {
      query = query.where(eq(workSchedules.userId, userId));
    }
    if (weekStart) {
      // Apply week filter in addition to any user filter
      query = query.where(eq(workSchedules.weekStartDate, weekStart));
    }
    
    const schedules = await query;
    const minWeeklyHours = parseInt(process.env.MINIMUM_WEEKLY_HOURS || '20');
    
    return schedules.map(schedule => ({
      userId: schedule.userId,
      userName: `${schedule.firstName} ${schedule.lastName}`,
      weekStartDate: schedule.weekStartDate,
      totalHours: parseFloat(schedule.totalScheduledHours?.toString() || '0'),
      approved: schedule.approved,
      status: schedule.status,
      compliant: parseFloat(schedule.totalScheduledHours?.toString() || '0') >= minWeeklyHours,
      requiresAttention: schedule.status === 'submitted' || !schedule.approved
    }));
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
      projectName: project.name,
      status: project.status,
      progress: 60 + (index * 10),
      totalHours: 120 + (index * 20),
      teamSize: 3 + (index % 4),
      deadline: new Date(Date.now() + (30 + index * 10) * 86400000).toISOString(),
      riskLevel: ['low', 'medium', 'high'][index % 3] as 'low' | 'medium' | 'high'
    }));
  }

  // Task operations
  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [newTask] = await db.insert(projectTasks).values(task).returning();
    return newTask;
  }

  async getProjectTasks(projectId: string): Promise<ProjectTask[]> {
    return await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(projectTasks.orderIndex, projectTasks.createdAt);
  }

  async updateProjectTask(id: string, updates: Partial<InsertProjectTask>): Promise<ProjectTask | undefined> {
    const [task] = await db
      .update(projectTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();
    return task;
  }

  async deleteProjectTask(id: string): Promise<boolean> {
    // First delete all related assignments and completions
    await db.delete(taskAssignments).where(eq(taskAssignments.taskId, id));
    await db.delete(taskCompletions).where(eq(taskCompletions.taskId, id));
    
    // Then delete the task
    const result = await db.delete(projectTasks).where(eq(projectTasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Task assignment operations
  async assignTaskToUser(assignment: InsertTaskAssignment): Promise<TaskAssignment> {
    const [newAssignment] = await db.insert(taskAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getUserTasks(userId: string): Promise<(ProjectTask & { projectName: string, isCompleted?: boolean })[]> {
    const userTasks = await db
      .select({
        id: projectTasks.id,
        projectId: projectTasks.projectId,
        title: projectTasks.title,
        description: projectTasks.description,
        dueDate: projectTasks.dueDate,
        priority: projectTasks.priority,
        estimatedHours: projectTasks.estimatedHours,
        isRequired: projectTasks.isRequired,
        orderIndex: projectTasks.orderIndex,
        createdBy: projectTasks.createdBy,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
        projectName: projects.name,
      })
      .from(projectTasks)
      .innerJoin(taskAssignments, eq(projectTasks.id, taskAssignments.taskId))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(eq(taskAssignments.userId, userId), eq(taskAssignments.isActive, true)))
      .orderBy(projectTasks.dueDate, projectTasks.priority);

    // Check completion status for each task
    const tasksWithCompletionStatus = await Promise.all(
      userTasks.map(async (task) => {
        const isCompleted = await this.isTaskCompletedByUser(task.id, userId);
        return { ...task, isCompleted };
      })
    );

    return tasksWithCompletionStatus;
  }

  async getUserTasksForProject(userId: string, projectId: string): Promise<(ProjectTask & { isCompleted?: boolean })[]> {
    const userTasks = await db
      .select()
      .from(projectTasks)
      .innerJoin(taskAssignments, eq(projectTasks.id, taskAssignments.taskId))
      .where(and(
        eq(projectTasks.projectId, projectId),
        eq(taskAssignments.userId, userId),
        eq(taskAssignments.isActive, true)
      ))
      .orderBy(projectTasks.orderIndex, projectTasks.createdAt)
      .then(rows => rows.map(row => row.project_tasks));

    // Check completion status for each task
    const tasksWithCompletionStatus = await Promise.all(
      userTasks.map(async (task) => {
        const isCompleted = await this.isTaskCompletedByUser(task.id, userId);
        return { ...task, isCompleted };
      })
    );

    return tasksWithCompletionStatus;
  }

  // Task completion operations
  async completeTask(completion: InsertTaskCompletion): Promise<TaskCompletion> {
    const [newCompletion] = await db.insert(taskCompletions).values(completion).returning();
    return newCompletion;
  }

  async getTaskCompletions(taskId: string): Promise<TaskCompletion[]> {
    return await db
      .select()
      .from(taskCompletions)
      .where(eq(taskCompletions.taskId, taskId))
      .orderBy(desc(taskCompletions.completedAt));
  }

  async isTaskCompletedByUser(taskId: string, userId: string): Promise<boolean> {
    const [completion] = await db
      .select()
      .from(taskCompletions)
      .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.userId, userId)))
      .limit(1);
    
    return !!completion;
  }
}

export const storage = new DatabaseStorage();
