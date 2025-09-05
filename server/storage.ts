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
  projectMilestones,
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
  type InsertProjectMilestone,
  type ProjectMilestone,
  taskActivity,
  type InsertTaskActivity,
  type TaskActivity,
  alerts,
  alertConfigurations,
  type Alert,
  type InsertAlert,
  type AlertConfiguration,
  type InsertAlertConfiguration,
  scheduleComments,
  directMessages,
  type InsertNotification,
  type Notification,
  type InsertProject,
  type InsertProjectAssignment,
  type InsertProgressUpdate,
  type InsertProjectTask,
  type InsertTaskAssignment,
  type InsertTaskCompletion,
  type InsertWorkSchedule,
  type InsertScheduleBlock,
  type InsertTimeEntry,
  type InsertTimeLog,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import { format } from "date-fns";

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
  deactivateProjectAssignment(assignmentId: string): Promise<boolean>;
  
  // Progress tracking operations
  createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate>;
  getProjectProgress(projectId: string): Promise<ProgressUpdate[]>;
  getUserProgress(userId: string): Promise<ProgressUpdate[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification | undefined>;
  deleteNotification(id: string, userId: string): Promise<boolean>;

  // Direct messages
  createDirectMessage(data: { senderId: string; recipientId: string; subject: string; body: string }): Promise<{ id: string }>;
  getInbox(userId: string): Promise<any[]>;
  getSent(userId: string): Promise<any[]>;
  markMessageRead(messageId: string, userId: string): Promise<boolean>;
  softDeleteMessage(messageId: string, userId: string): Promise<boolean>;
  
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
  pruneOldSchedules(userId: string, keepFromMondayISO: string): Promise<number>;
  recalcScheduleTotalHours(scheduleId: string): Promise<number>;
  
  // Schedule block operations
  createScheduleBlock(block: InsertScheduleBlock): Promise<ScheduleBlock>;
  getScheduleBlocks(scheduleId: string): Promise<ScheduleBlock[]>;
  updateScheduleBlock(id: string, updates: Partial<InsertScheduleBlock>): Promise<ScheduleBlock | undefined>;
  deleteScheduleBlock(id: string): Promise<boolean>;
  // Phase 2: Schedule comments
  getScheduleComments(scheduleId: string): Promise<Array<{ id: string; scheduleId: string; authorId: string; body: string; createdAt: Date }>>;
  addScheduleComment(scheduleId: string, authorId: string, body: string): Promise<{ id: string; scheduleId: string; authorId: string; body: string; createdAt: Date }>;
  
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

  // Milestones
  createMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone>;
  getProjectMilestones(projectId: string): Promise<ProjectMilestone[]>;
  updateMilestone(id: string, updates: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined>;
  deleteMilestone(id: string): Promise<boolean>;

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
  
  // Collaboration tracking
  updateTaskStatus(taskId: string, status: string, userId: string, note?: string): Promise<ProjectTask | undefined>;
  updateTaskProgress(taskId: string, progressPct: number, userId: string, note?: string): Promise<ProjectTask | undefined>;
  addTaskComment(taskId: string, userId: string, message: string): Promise<void>;
  getTaskActivity(taskId: string): Promise<any[]>;
  updateTaskChecklist(taskId: string, checklist: any[], userId: string): Promise<ProjectTask | undefined>;
  setTaskReminder(taskId: string, reminderAt: Date, userId: string): Promise<ProjectTask | undefined>;
  reviewTask(taskId: string, action: 'submit' | 'approve' | 'reject', userId: string, note?: string): Promise<ProjectTask | undefined>;
  
  // Additional methods for notification service
  getTask(id: string): Promise<ProjectTask | undefined>;
  getTaskProject(taskId: string): Promise<Project | undefined>;
  getTaskAssignees(taskId: string): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getWorkSchedule(id: string): Promise<WorkSchedule | undefined>;
  
  // Sprint C: Team oversight methods
  getAllTeamTasks(filter?: any): Promise<any[]>;
  getStudentTaskSummaries(): Promise<any[]>;
  updateTasksBulk(taskIds: string[], updates: any, userId: string): Promise<void>;
  addBulkComment(taskIds: string[], message: string, userId: string): Promise<void>;
  // Sprint C Phase 2: Progress velocity tracking
  getProgressVelocityMetrics(studentId?: string, days?: number): Promise<any>;
  getLiveTeamActivity(): Promise<any[]>;
  
  // Sprint D: Alert System
  createAlert(alert: InsertAlert): Promise<Alert>;
  getActiveAlerts(userId?: string): Promise<Alert[]>;
  resolveAlert(alertId: string, resolvedBy: string): Promise<void>;
  getAlertConfigurations(): Promise<AlertConfiguration[]>;
  updateAlertConfiguration(id: string, config: Partial<AlertConfiguration>): Promise<void>;
  createDefaultAlertConfigurations(): Promise<void>;
  
  // Alert trigger methods
  checkOverdueTasks(): Promise<Alert[]>;
  checkInactiveStudents(): Promise<Alert[]>;
  checkProjectRisks(): Promise<Alert[]>;
  checkVelocityDrops(): Promise<Alert[]>;
  checkTasksBlocked(): Promise<Alert[]>;

  // Professor Dashboard
  getAttentionItems(): Promise<any[]>;
  getUpcomingDeadlines(): Promise<any[]>;
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

  // Milestone operations
  async createMilestone(milestone: InsertProjectMilestone): Promise<ProjectMilestone> {
    const [m] = await db.insert(projectMilestones).values(milestone).returning();
    return m;
  }

  async getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
    return await db
      .select()
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(projectMilestones.orderIndex, projectMilestones.dueDate);
  }

  async updateMilestone(id: string, updates: Partial<InsertProjectMilestone>): Promise<ProjectMilestone | undefined> {
    const [m] = await db
      .update(projectMilestones)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projectMilestones.id, id))
      .returning();
    return m;
  }

  async deleteMilestone(id: string): Promise<boolean> {
    const result = await db.delete(projectMilestones).where(eq(projectMilestones.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Project assignment operations
  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [newAssignment] = await db.insert(projectAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getUserAssignments(userId: string): Promise<any[]> {
    // Return assignments with project details for student dashboard
    return await db
      .select({
        // Assignment fields
        assignmentId: projectAssignments.id,
        userId: projectAssignments.userId,
        projectId: projectAssignments.projectId,
        assignedAt: projectAssignments.createdAt,
        isActive: projectAssignments.isActive,
        // Project fields
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        projectType: projects.projectType,
        createdBy: projects.createdBy,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id))
      .where(and(
        eq(projectAssignments.userId, userId), 
        eq(projectAssignments.isActive, true)
      ))
      .orderBy(desc(projectAssignments.createdAt));
  }

  async getProjectAssignments(projectId: string): Promise<ProjectAssignment[]> {
    return await db
      .select()
      .from(projectAssignments)
      .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.isActive, true)));
  }

  async deactivateProjectAssignment(assignmentId: string): Promise<boolean> {
    const result = await db
      .update(projectAssignments)
      .set({ isActive: false })
      .where(eq(projectAssignments.id, assignmentId));
    return (result.rowCount ?? 0) > 0;
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

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  // Direct messages
  async createDirectMessage(data: { senderId: string; recipientId: string; subject: string; body: string }): Promise<{ id: string }> {
    const [row] = await db.insert(directMessages).values({
      senderId: data.senderId,
      recipientId: data.recipientId,
      subject: data.subject,
      body: data.body,
    }).returning({ id: directMessages.id });
    return row;
  }

  async getInbox(userId: string): Promise<any[]> {
    return db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        recipientId: directMessages.recipientId,
        subject: directMessages.subject,
        body: directMessages.body,
        sentAt: directMessages.sentAt,
        readAt: directMessages.readAt,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
      })
      .from(directMessages)
      .innerJoin(users, eq(directMessages.senderId, users.id))
      .where(and(eq(directMessages.recipientId, userId), eq(directMessages.recipientDeleted, false)))
      .orderBy(desc(directMessages.sentAt));
  }

  async getSent(userId: string): Promise<any[]> {
    return db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        recipientId: directMessages.recipientId,
        subject: directMessages.subject,
        body: directMessages.body,
        sentAt: directMessages.sentAt,
        readAt: directMessages.readAt,
        recipientFirstName: users.firstName,
        recipientLastName: users.lastName,
      })
      .from(directMessages)
      .innerJoin(users, eq(directMessages.recipientId, users.id))
      .where(and(eq(directMessages.senderId, userId), eq(directMessages.senderDeleted, false)))
      .orderBy(desc(directMessages.sentAt));
  }

  async markMessageRead(messageId: string, userId: string): Promise<boolean> {
    // Only recipient can mark as read
    const [msg] = await db.select().from(directMessages).where(eq(directMessages.id, messageId));
    if (!msg || msg.recipientId !== userId) return false;
    await db.update(directMessages).set({ readAt: new Date() }).where(eq(directMessages.id, messageId));
    return true;
  }

  async softDeleteMessage(messageId: string, userId: string): Promise<boolean> {
    const [msg] = await db.select().from(directMessages).where(eq(directMessages.id, messageId));
    if (!msg) return false;
    if (msg.senderId === userId) {
      await db.update(directMessages).set({ senderDeleted: true }).where(eq(directMessages.id, messageId));
      return true;
    }
    if (msg.recipientId === userId) {
      await db.update(directMessages).set({ recipientDeleted: true }).where(eq(directMessages.id, messageId));
      return true;
    }
    return false;
  }

  // Analytics operations
  async getUserMetrics(userId: string): Promise<any> {
    // Get comprehensive user metrics for student dashboard
    const assignments = await this.getUserAssignments(userId);
    const progress = await this.getUserProgress(userId);
    const tasks = await this.getUserTasks(userId);
    
    // Calculate meaningful metrics
    const activeTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');
    
    // Calculate average progress across all tasks
    const totalProgress = tasks.reduce((sum, task) => sum + (task.progressPct || 0), 0);
    const averageProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;
    
    // Calculate productivity score based on completion rate and timeliness
    const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
    const overdueRate = tasks.length > 0 ? (overdueTasks.length / tasks.length) * 100 : 0;
    const productivityScore = Math.max(0, Math.round(completionRate - (overdueRate * 0.5)));
    
    // Recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentProgress = progress.filter(p => new Date(p.createdAt) > weekAgo);
    
    return {
      // Project metrics
      activeProjects: assignments.length,
      
      // Task metrics  
      totalTasks: tasks.length,
      activeTasks: activeTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      
      // Progress metrics
      totalUpdates: progress.length,
      recentUpdates: recentProgress.length,
      averageProgress,
      completionRate: Math.round(completionRate),
      
      // Performance metrics
      productivityScore,
      weeklyHours: Math.round(recentProgress.length * 2), // Estimate based on updates
      
      // Trend data
      isImproving: recentProgress.length > progress.length / 4, // More than 25% of updates in last week
      riskLevel: overdueRate > 30 ? 'high' : overdueRate > 10 ? 'medium' : 'low',
      
      // Additional metadata
      lastActiveDate: progress.length > 0 ? progress[0].createdAt : null,
      memberSince: assignments.length > 0 ? assignments[0].assignedAt : null,
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

  async pruneOldSchedules(userId: string, keepFromMondayISO: string): Promise<number> {
    // delete schedules older than the previous week Monday (keep only past week and current week)
    const result = await db
      .delete(workSchedules)
      .where(sql`${workSchedules}.user_id = ${userId} AND ${workSchedules}.week_start_date < ${keepFromMondayISO}`);
    // drizzle returns undefined rowCount for deletes sometimes; return 0 if unavailable
    // @ts-ignore
    return result?.rowCount ?? 0;
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

  async recalcScheduleTotalHours(scheduleId: string): Promise<number> {
    const blocks = await this.getScheduleBlocks(scheduleId);
    let totalHours = 0;
    for (const block of blocks) {
      if (block.startTime && block.endTime) {
        totalHours += this.calculateBlockDuration(block.startTime as any, block.endTime as any);
      }
    }
    const rounded = parseFloat(totalHours.toFixed(1));
    await db
      .update(workSchedules)
      .set({ totalScheduledHours: String(rounded), updatedAt: new Date() })
      .where(eq(workSchedules.id, scheduleId));
    return rounded;
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

  // Phase 2: Schedule comments
  async getScheduleComments(scheduleId: string): Promise<Array<{ id: string; scheduleId: string; authorId: string; body: string; createdAt: Date }>> {
    return await db
      .select()
      .from(scheduleComments)
      .where(eq(scheduleComments.scheduleId, scheduleId))
      .orderBy(desc(scheduleComments.createdAt));
  }

  async addScheduleComment(scheduleId: string, authorId: string, body: string): Promise<{ id: string; scheduleId: string; authorId: string; body: string; createdAt: Date }> {
    const [created] = await db
      .insert(scheduleComments)
      .values({ scheduleId, authorId, body })
      .returning();
    return created as any;
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
      scheduleId: workSchedules.id,
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
      scheduleId: schedule.scheduleId,
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
        // Sprint A fields
        status: projectTasks.status,
        progressPct: projectTasks.progressPct,
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
        // Sprint A fields
        status: projectTasks.status,
        progressPct: projectTasks.progressPct,
      })
      .from(projectTasks)
      .innerJoin(taskAssignments, eq(projectTasks.id, taskAssignments.taskId))
      .where(and(
        eq(projectTasks.projectId, projectId),
        eq(taskAssignments.userId, userId),
        eq(taskAssignments.isActive, true)
      ))
      .orderBy(projectTasks.orderIndex, projectTasks.createdAt);

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

  // Collaboration tracking
  async updateTaskStatus(taskId: string, status: string, userId: string, note?: string): Promise<ProjectTask | undefined> {
    const [task] = await db
      .update(projectTasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (task) {
      await db.insert(taskActivity).values({ taskId, userId, type: 'status', message: note || `Status changed to ${status}` });
    }
    return task as unknown as ProjectTask | undefined;
  }

  async updateTaskProgress(taskId: string, progressPct: number, userId: string, note?: string): Promise<ProjectTask | undefined> {
    const clamped = Math.max(0, Math.min(100, progressPct));
    const updates: any = { progressPct: clamped, updatedAt: new Date() };
    if (clamped >= 100) {
      updates.status = 'completed';
    }
    const [task] = await db
      .update(projectTasks)
      .set(updates)
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (task) {
      await db.insert(taskActivity).values({ taskId, userId, type: 'progress', message: note || `Progress updated to ${clamped}%` });
    }
    return task as unknown as ProjectTask | undefined;
  }

  async addTaskComment(taskId: string, userId: string, message: string): Promise<void> {
    await db.insert(taskActivity).values({ taskId, userId, type: 'comment', message });
  }

  async getTaskActivity(taskId: string): Promise<any[]> {
    return await db
      .select({
        ...taskActivity,
        authorFirstName: users.firstName,
        authorLastName: users.lastName,
      })
      .from(taskActivity)
      .leftJoin(users, eq(taskActivity.userId, users.id))
      .where(eq(taskActivity.taskId, taskId))
      .orderBy(desc(taskActivity.createdAt));
  }

  async updateTaskChecklist(taskId: string, checklist: any[], userId: string): Promise<ProjectTask | undefined> {
    const [task] = await db
      .update(projectTasks)
      .set({ checklist: checklist as any, updatedAt: new Date() })
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (task) {
      await db.insert(taskActivity).values({ taskId, userId, type: 'comment', message: 'Checklist updated' });
    }
    return task as unknown as ProjectTask | undefined;
  }

  async setTaskReminder(taskId: string, reminderAt: Date, userId: string): Promise<ProjectTask | undefined> {
    const [task] = await db
      .update(projectTasks)
      .set({ reminderAt, updatedAt: new Date() })
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (task) {
      await db.insert(taskActivity).values({ taskId, userId, type: 'comment', message: `Reminder set for ${reminderAt.toISOString()}` });
    }
    return task as unknown as ProjectTask | undefined;
  }

  async reviewTask(taskId: string, action: 'submit' | 'approve' | 'reject', userId: string, note?: string): Promise<ProjectTask | undefined> {
    let updates: any = { updatedAt: new Date() };
    if (action === 'submit') {
      updates.status = 'in-progress';
    } else if (action === 'approve') {
      updates.status = 'completed';
      updates.progressPct = 100;
    } else if (action === 'reject') {
      updates.status = 'pending';
    }

    const [task] = await db
      .update(projectTasks)
      .set(updates)
      .where(eq(projectTasks.id, taskId))
      .returning();

    if (task) {
      const message = note ? `${action.toUpperCase()}: ${note}` : `Task ${action}`;
      await db.insert(taskActivity).values({ taskId, userId, type: 'status', message });
    }
    return task as unknown as ProjectTask | undefined;
  }

  // Additional methods for notification service
  async getTask(id: string): Promise<ProjectTask | undefined> {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, id));
    return task;
  }

  async getTaskProject(taskId: string): Promise<Project | undefined> {
    const [result] = await db
      .select({ 
        id: projects.id,
        name: projects.name,
        description: projects.description,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        status: projects.status,
        projectType: projects.projectType,
        createdBy: projects.createdBy,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(eq(projectTasks.id, taskId));
    return result;
  }

  // Phase 2: fetch tasks that have reminders due
  async getTasksWithDueReminders(now: Date = new Date()): Promise<ProjectTask[]> {
    const results = await db
      .select()
      .from(projectTasks)
      .where(sql`${projectTasks}.reminder_at IS NOT NULL AND ${projectTasks}.reminder_at <= ${now}`)
      .orderBy(desc(projectTasks.reminderAt as any));
    return results as unknown as ProjectTask[];
  }

  async getTaskAssignees(taskId: string): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        department: users.department,
        yearLevel: users.yearLevel,
        specialization: users.specialization,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(taskAssignments)
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.isActive, true)));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, role), eq(users.isActive, true)));
  }

  async getWorkSchedule(id: string): Promise<WorkSchedule | undefined> {
    const [schedule] = await db.select().from(workSchedules).where(eq(workSchedules.id, id));
    return schedule;
  }

  // Sprint C: Team Oversight Implementation
  async getAllTeamTasks(filter?: any): Promise<any[]> {
    const query = await db
      .select({
        // Task fields
        id: projectTasks.id,
        title: projectTasks.title,
        description: projectTasks.description,
        status: projectTasks.status,
        progressPct: projectTasks.progressPct,
        priority: projectTasks.priority,
        dueDate: projectTasks.dueDate,
        isRequired: projectTasks.isRequired,
        estimatedHours: projectTasks.estimatedHours,
        createdAt: projectTasks.createdAt,
        updatedAt: projectTasks.updatedAt,
        // Project fields
        projectId: projects.id,
        projectName: projects.name,
        // Student fields
        studentId: users.id,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        studentEmail: users.email,
        studentDepartment: users.department,
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .innerJoin(taskAssignments, eq(projectTasks.id, taskAssignments.taskId))
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .where(and(
        eq(taskAssignments.isActive, true),
        eq(users.role, 'student')
      ))
      .orderBy(desc(projectTasks.updatedAt));

    // Calculate derived fields
    const enhancedTasks = query.map(task => {
      const now = new Date();
      const updatedAt = new Date(task.updatedAt);
      const daysSinceLastUpdate = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = task.dueDate ? new Date(task.dueDate) < now : false;
      const isCompleted = task.status === 'completed' || (task.progressPct || 0) >= 100;
      
      // Calculate risk level
      let riskScore = 0;
      if (isOverdue) riskScore += 40;
      if (task.status === 'blocked') riskScore += 30;
      if (daysSinceLastUpdate > 7) riskScore += 20;
      if ((task.progressPct || 0) < 25 && daysSinceLastUpdate > 3) riskScore += 10;
      
      const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status || 'pending',
        progressPct: task.progressPct || 0,
        priority: task.priority || 'medium',
        dueDate: task.dueDate,
        isRequired: task.isRequired,
        estimatedHours: task.estimatedHours,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        projectId: task.projectId,
        projectName: task.projectName,
        studentId: task.studentId,
        studentName: task.studentName,
        studentEmail: task.studentEmail,
        isCompleted,
        isOverdue,
        daysSinceLastUpdate,
        riskLevel,
      };
    });

    // Apply basic filters
    let filteredTasks = enhancedTasks;
    
    if (filter?.status) {
      filteredTasks = filteredTasks.filter(task => filter.status.includes(task.status));
    }
    
    if (filter?.riskLevel) {
      filteredTasks = filteredTasks.filter(task => filter.riskLevel.includes(task.riskLevel));
    }
    
    if (filter?.studentIds) {
      filteredTasks = filteredTasks.filter(task => filter.studentIds.includes(task.studentId));
    }
    
    if (filter?.projectIds) {
      filteredTasks = filteredTasks.filter(task => filter.projectIds.includes(task.projectId));
    }
    
    if (filter?.priorities) {
      filteredTasks = filteredTasks.filter(task => filter.priorities.includes(task.priority));
    }
    
    if (filter?.progressRange) {
      const { min, max } = filter.progressRange;
      filteredTasks = filteredTasks.filter(task => task.progressPct >= min && task.progressPct <= max);
    }
    
    if (filter?.needsAttention) {
      filteredTasks = filteredTasks.filter(task => 
        task.isOverdue || task.status === 'blocked' || task.daysSinceLastUpdate > 7
      );
    }
    
    if (filter?.recentlyActive) {
      filteredTasks = filteredTasks.filter(task => task.daysSinceLastUpdate <= 1);
    }

    return filteredTasks;
  }

  async getStudentTaskSummaries(): Promise<any[]> {
    const students = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        department: users.department,
      })
      .from(users)
      .where(eq(users.role, 'student'));

    const summaries = await Promise.all(
      students.map(async (student) => {
        const tasks = await this.getAllTeamTasks({ studentIds: [student.id] });
        
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.isCompleted).length;
        const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress').length;
        const overdueTasks = tasks.filter((t: any) => t.isOverdue && !t.isCompleted).length;
        const blockedTasks = tasks.filter((t: any) => t.status === 'blocked').length;
        
        const avgProgress = totalTasks > 0 
          ? Math.round(tasks.reduce((sum: number, t: any) => sum + t.progressPct, 0) / totalTasks)
          : 0;
        
        const completionRate = totalTasks > 0 
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0;

        // Calculate risk score
        let riskScore = 0;
        if (completionRate < 50) riskScore += 30;
        if (overdueTasks > 0) riskScore += 25;
        if (blockedTasks > 0) riskScore += 20;
        if (avgProgress < 40) riskScore += 15;
        if (tasks.some((t: any) => t.daysSinceLastUpdate > 7)) riskScore += 10;

        const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

        const lastActivity = tasks.length > 0 
          ? Math.max(...tasks.map((t: any) => new Date(t.updatedAt).getTime()))
          : undefined;

        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentEmail: student.email,
          department: student.department,
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          blockedTasks,
          avgProgress,
          completionRate,
          riskScore,
          riskLevel,
          lastActivity: lastActivity ? new Date(lastActivity).toISOString() : undefined,
          scheduleCompliance: 85, // TODO: Calculate from actual schedule data
        };
      })
    );

    return summaries.sort((a, b) => b.riskScore - a.riskScore);
  }

  async updateTasksBulk(taskIds: string[], updates: any, userId: string): Promise<void> {
    for (const taskId of taskIds) {
      const updateData: any = { updatedAt: new Date() };
      
      if (updates.status) {
        updateData.status = updates.status;
        // Log activity
        await db.insert(taskActivity).values({
          taskId,
          userId,
          type: 'status',
          message: `Bulk status change to ${updates.status}`,
        });
      }

      if (updates.priority) {
        updateData.priority = updates.priority;
        // Log activity
        await db.insert(taskActivity).values({
          taskId,
          userId,
          type: 'comment',
          message: `Bulk priority change to ${updates.priority}`,
        });
      }

      if (updates.dueDate) {
        updateData.dueDate = new Date(updates.dueDate);
        // Log activity
        await db.insert(taskActivity).values({
          taskId,
          userId,
          type: 'comment',
          message: `Bulk due date change to ${new Date(updates.dueDate).toLocaleDateString()}`,
        });
      }

      await db
        .update(projectTasks)
        .set(updateData)
        .where(eq(projectTasks.id, taskId));

      // Handle task reassignment
      if (updates.assigneeId) {
        // Deactivate current assignments
        await db
          .update(taskAssignments)
          .set({ isActive: false })
          .where(eq(taskAssignments.taskId, taskId));
        
        // Create new assignment
        await db.insert(taskAssignments).values({
          taskId,
          userId: updates.assigneeId,
          assignedBy: userId,
          isActive: true,
          assignedAt: new Date(),
        });

        // Log activity
        await db.insert(taskActivity).values({
          taskId,
          userId,
          type: 'comment',
          message: `Task reassigned to new team member`,
        });
      }
    }
  }

  async addBulkComment(taskIds: string[], message: string, userId: string): Promise<void> {
    for (const taskId of taskIds) {
      await db.insert(taskActivity).values({
        taskId,
        userId,
        type: 'comment',
        message: `[Bulk Comment] ${message}`,
      });
    }
  }

  // Sprint C Phase 2: Progress Velocity Tracking
  async getProgressVelocityMetrics(studentId?: string, days: number = 7): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get all task activity for velocity calculation
    let activityQuery = db
      .select({
        taskId: taskActivity.taskId,
        type: taskActivity.type,
        message: taskActivity.message,
        createdAt: taskActivity.createdAt,
        userId: taskActivity.userId,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        taskTitle: projectTasks.title,
        projectName: projects.name,
      })
      .from(taskActivity)
      .innerJoin(users, eq(taskActivity.userId, users.id))
      .innerJoin(projectTasks, eq(taskActivity.taskId, projectTasks.id))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(
        gte(taskActivity.createdAt, cutoffDate),
        eq(users.role, 'student')
      ))
      .orderBy(desc(taskActivity.createdAt));

    if (studentId) {
      activityQuery = activityQuery.where(eq(taskActivity.userId, studentId));
    }

    const activities = await activityQuery;

    // Calculate velocity metrics
    const velocityByStudent: { [key: string]: any } = {};
    
    activities.forEach(activity => {
      const studentKey = activity.userId;
      if (!velocityByStudent[studentKey]) {
        velocityByStudent[studentKey] = {
          studentId: activity.userId,
          studentName: activity.studentName,
          totalActivity: 0,
          progressUpdates: 0,
          statusChanges: 0,
          comments: 0,
          tasksWorkedOn: new Set(),
          projectsActive: new Set(),
          dailyActivity: {},
          velocityScore: 0,
        };
      }

      const student = velocityByStudent[studentKey];
      student.totalActivity++;
      student.tasksWorkedOn.add(activity.taskId);
      student.projectsActive.add(activity.projectName);

      // Count by type
      if (activity.type === 'progress') student.progressUpdates++;
      else if (activity.type === 'status') student.statusChanges++;
      else if (activity.type === 'comment') student.comments++;

      // Daily activity tracking
      const dayKey = activity.createdAt.toISOString().split('T')[0];
      student.dailyActivity[dayKey] = (student.dailyActivity[dayKey] || 0) + 1;
    });

    // Calculate velocity scores and finalize metrics
    Object.keys(velocityByStudent).forEach(studentKey => {
      const student = velocityByStudent[studentKey];
      
      // Convert sets to counts
      student.uniqueTasksWorkedOn = student.tasksWorkedOn.size;
      student.uniqueProjectsActive = student.projectsActive.size;
      delete student.tasksWorkedOn;
      delete student.projectsActive;

      // Calculate velocity score (activity frequency + task diversity)
      const avgDailyActivity = student.totalActivity / days;
      const taskDiversityBonus = Math.min(student.uniqueTasksWorkedOn * 2, 20);
      student.velocityScore = Math.round(avgDailyActivity * 10 + taskDiversityBonus);

      // Velocity trend (comparing first half vs second half of period)
      const midPoint = Math.floor(days / 2);
      const midDate = new Date();
      midDate.setDate(midDate.getDate() - midPoint);
      
      const recentActivity = activities.filter(a => 
        a.userId === studentKey && new Date(a.createdAt) >= midDate
      ).length;
      const olderActivity = student.totalActivity - recentActivity;
      
      if (olderActivity > 0) {
        student.velocityTrend = recentActivity > olderActivity ? 'increasing' : 
                              recentActivity < olderActivity ? 'decreasing' : 'stable';
      } else {
        student.velocityTrend = recentActivity > 0 ? 'new' : 'inactive';
      }
    });

    return studentId 
      ? velocityByStudent[studentId] || null
      : Object.values(velocityByStudent);
  }

  async getLiveTeamActivity(): Promise<any[]> {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const recentActivity = await db
      .select({
        id: taskActivity.id,
        type: taskActivity.type,
        message: taskActivity.message,
        createdAt: taskActivity.createdAt,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        taskTitle: projectTasks.title,
        projectName: projects.name,
        taskStatus: projectTasks.status,
        taskProgress: projectTasks.progressPct,
      })
      .from(taskActivity)
      .innerJoin(users, eq(taskActivity.userId, users.id))
      .innerJoin(projectTasks, eq(taskActivity.taskId, projectTasks.id))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(
        gte(taskActivity.createdAt, thirtyMinutesAgo),
        eq(users.role, 'student')
      ))
      .orderBy(desc(taskActivity.createdAt))
      .limit(50);

    return recentActivity.map(activity => ({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      createdAt: activity.createdAt.toISOString(),
      studentName: activity.studentName,
      taskTitle: activity.taskTitle,
      projectName: activity.projectName,
      taskStatus: activity.taskStatus,
      taskProgress: activity.taskProgress,
      timeAgo: this.calculateTimeAgo(activity.createdAt),
    }));
  }

  private calculateTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  // Sprint D: Alert System Implementation
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async getActiveAlerts(userId?: string): Promise<Alert[]> {
    let query = db
      .select({
        id: alerts.id,
        type: alerts.type,
        severity: alerts.severity,
        title: alerts.title,
        message: alerts.message,
        userId: alerts.userId,
        projectId: alerts.projectId,
        taskId: alerts.taskId,
        data: alerts.data,
        isResolved: alerts.isResolved,
        resolvedAt: alerts.resolvedAt,
        resolvedBy: alerts.resolvedBy,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
      })
      .from(alerts)
      .where(eq(alerts.isResolved, false))
      .orderBy(desc(alerts.createdAt));

    if (userId) {
      query = query.where(and(eq(alerts.isResolved, false), eq(alerts.userId, userId)));
    }

    return await query;
  }

  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    await db
      .update(alerts)
      .set({ 
        isResolved: true, 
        resolvedAt: new Date(), 
        resolvedBy,
        updatedAt: new Date()
      })
      .where(eq(alerts.id, alertId));
  }

  async getAlertConfigurations(): Promise<AlertConfiguration[]> {
    return await db.select().from(alertConfigurations);
  }

  async updateAlertConfiguration(id: string, config: Partial<AlertConfiguration>): Promise<void> {
    await db
      .update(alertConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(alertConfigurations.id, id));
  }

  async createDefaultAlertConfigurations(): Promise<void> {
    const defaultConfigs = [
      {
        alertType: 'task_overdue',
        isEnabled: true,
        thresholds: { days: 1, severity_escalation_days: 3 },
        inAppEnabled: true,
        emailEnabled: false,
        maxAlertsPerDay: 5,
        cooldownHours: 24,
      },
      {
        alertType: 'student_inactive',
        isEnabled: true,
        thresholds: { days: 7 },
        inAppEnabled: true,
        emailEnabled: true,
        maxAlertsPerDay: 2,
        cooldownHours: 48,
      },
      {
        alertType: 'project_risk',
        isEnabled: true,
        thresholds: { risk_percentage: 60 },
        inAppEnabled: true,
        emailEnabled: true,
        maxAlertsPerDay: 3,
        cooldownHours: 24,
      },
      {
        alertType: 'velocity_drop',
        isEnabled: true,
        thresholds: { percentage_drop: 30, comparison_days: 7 },
        inAppEnabled: true,
        emailEnabled: false,
        maxAlertsPerDay: 3,
        cooldownHours: 48,
      },
      {
        alertType: 'task_blocked',
        isEnabled: true,
        thresholds: { hours: 48 },
        inAppEnabled: true,
        emailEnabled: false,
        maxAlertsPerDay: 5,
        cooldownHours: 12,
      },
    ];

    for (const config of defaultConfigs) {
      await db.insert(alertConfigurations).values(config).onConflictDoNothing();
    }
  }

  // Alert Trigger Methods
  async checkOverdueTasks(): Promise<Alert[]> {
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 1); // 1 day overdue

    const overdueTasks = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        dueDate: projectTasks.dueDate,
        studentId: taskAssignments.userId,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        projectId: projectTasks.projectId,
        projectName: projects.name,
        status: projectTasks.status,
        progressPct: projectTasks.progressPct,
      })
      .from(projectTasks)
      .innerJoin(taskAssignments, and(
        eq(projectTasks.id, taskAssignments.taskId),
        eq(taskAssignments.isActive, true)
      ))
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(
        sql`${projectTasks.dueDate} < ${overdueThreshold}`,
        sql`${projectTasks.status} != 'completed'`,
        eq(users.role, 'student')
      ));

    const generatedAlerts: Alert[] = [];

    for (const task of overdueTasks) {
      // Check if we already have an unresolved alert for this task
      const existingAlert = await db
        .select()
        .from(alerts)
        .where(and(
          eq(alerts.taskId, task.id),
          eq(alerts.type, 'task_overdue'),
          eq(alerts.isResolved, false)
        ))
        .limit(1);

      if (existingAlert.length === 0) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
        );

        const severity = daysOverdue >= 7 ? 'critical' : 
                        daysOverdue >= 3 ? 'high' : 'medium';

        const alert = await this.createAlert({
          type: 'task_overdue',
          severity,
          title: `Task Overdue: ${task.title}`,
          message: `Task "${task.title}" in project "${task.projectName}" is ${daysOverdue} day(s) overdue. Assigned to ${task.studentName}.`,
          userId: task.studentId,
          projectId: task.projectId,
          taskId: task.id,
          data: {
            daysOverdue,
            originalDueDate: task.dueDate,
            currentProgress: task.progressPct,
            currentStatus: task.status,
          },
        });

        generatedAlerts.push(alert);
      }
    }

    return generatedAlerts;
  }

  async checkInactiveStudents(): Promise<Alert[]> {
    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(inactiveThreshold.getDate() - 7); // 7 days inactive

    const students = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, 'student'));

    const generatedAlerts: Alert[] = [];

    for (const student of students) {
      // Check for recent activity
      const recentActivity = await db
        .select()
        .from(taskActivity)
        .where(and(
          eq(taskActivity.userId, student.id),
          sql`${taskActivity.createdAt} > ${inactiveThreshold}`
        ))
        .limit(1);

      if (recentActivity.length === 0) {
        // Check if we already have an unresolved alert for this student
        const existingAlert = await db
          .select()
          .from(alerts)
          .where(and(
            eq(alerts.userId, student.id),
            eq(alerts.type, 'student_inactive'),
            eq(alerts.isResolved, false)
          ))
          .limit(1);

        if (existingAlert.length === 0) {
          const alert = await this.createAlert({
            type: 'student_inactive',
            severity: 'medium',
            title: `Inactive Student: ${student.firstName} ${student.lastName}`,
            message: `${student.firstName} ${student.lastName} (${student.email}) has not shown any task activity in the past 7 days.`,
            userId: student.id,
            data: {
              inactiveDays: 7,
              lastSeenThreshold: inactiveThreshold.toISOString(),
            },
          });

          generatedAlerts.push(alert);
        }
      }
    }

    return generatedAlerts;
  }

  async checkProjectRisks(): Promise<Alert[]> {
    const projects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projects)
      .where(eq(projects.status, 'active'));

    const generatedAlerts: Alert[] = [];

    for (const project of projects) {
      // Get all tasks for this project
      const tasks = await this.getAllTeamTasks({ projectIds: [project.id] });
      
      if (tasks.length === 0) continue;

      const highRiskTasks = tasks.filter((t: any) => t.riskLevel === 'high');
      const riskPercentage = (highRiskTasks.length / tasks.length) * 100;

      if (riskPercentage >= 60) { // 60% threshold
        // Check if we already have an unresolved alert for this project
        const existingAlert = await db
          .select()
          .from(alerts)
          .where(and(
            eq(alerts.projectId, project.id),
            eq(alerts.type, 'project_risk'),
            eq(alerts.isResolved, false)
          ))
          .limit(1);

        if (existingAlert.length === 0) {
          const severity = riskPercentage >= 80 ? 'critical' : 'high';

          const alert = await this.createAlert({
            type: 'project_risk',
            severity,
            title: `High Risk Project: ${project.name}`,
            message: `Project "${project.name}" has ${Math.round(riskPercentage)}% of tasks marked as high-risk. Immediate attention may be required.`,
            projectId: project.id,
            data: {
              riskPercentage: Math.round(riskPercentage),
              totalTasks: tasks.length,
              highRiskTasks: highRiskTasks.length,
              riskFactors: highRiskTasks.map((t: any) => ({
                taskId: t.id,
                title: t.title,
                studentName: t.studentName,
                reason: t.isOverdue ? 'overdue' : t.status === 'blocked' ? 'blocked' : 'stale'
              }))
            },
          });

          generatedAlerts.push(alert);
        }
      }
    }

    return generatedAlerts;
  }

  async checkVelocityDrops(): Promise<Alert[]> {
    const velocityMetrics = await this.getProgressVelocityMetrics();
    const generatedAlerts: Alert[] = [];

    if (Array.isArray(velocityMetrics)) {
      for (const metric of velocityMetrics) {
        if (metric.velocityTrend === 'decreasing' && metric.velocityScore < 30) {
          // Check if we already have an unresolved alert for this student
          const existingAlert = await db
            .select()
            .from(alerts)
            .where(and(
              eq(alerts.userId, metric.studentId),
              eq(alerts.type, 'velocity_drop'),
              eq(alerts.isResolved, false)
            ))
            .limit(1);

          if (existingAlert.length === 0) {
            const alert = await this.createAlert({
              type: 'velocity_drop',
              severity: 'medium',
              title: `Velocity Drop: ${metric.studentName}`,
              message: `${metric.studentName}'s productivity has been declining. Velocity score is ${metric.velocityScore} with a decreasing trend.`,
              userId: metric.studentId,
              data: {
                velocityScore: metric.velocityScore,
                trend: metric.velocityTrend,
                totalActivity: metric.totalActivity,
                uniqueTasksWorkedOn: metric.uniqueTasksWorkedOn,
              },
            });

            generatedAlerts.push(alert);
          }
        }
      }
    }

    return generatedAlerts;
  }

  async checkTasksBlocked(): Promise<Alert[]> {
    const blockedThreshold = new Date();
    blockedThreshold.setHours(blockedThreshold.getHours() - 48); // 48 hours blocked

    const blockedTasks = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        updatedAt: projectTasks.updatedAt,
        studentId: taskAssignments.userId,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        projectId: projectTasks.projectId,
        projectName: projects.name,
      })
      .from(projectTasks)
      .innerJoin(taskAssignments, and(
        eq(projectTasks.id, taskAssignments.taskId),
        eq(taskAssignments.isActive, true)
      ))
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(
        eq(projectTasks.status, 'blocked'),
        sql`${projectTasks.updatedAt} < ${blockedThreshold}`,
        eq(users.role, 'student')
      ));

    const generatedAlerts: Alert[] = [];

    for (const task of blockedTasks) {
      // Check if we already have an unresolved alert for this task
      const existingAlert = await db
        .select()
        .from(alerts)
        .where(and(
          eq(alerts.taskId, task.id),
          eq(alerts.type, 'task_blocked'),
          eq(alerts.isResolved, false)
        ))
        .limit(1);

      if (existingAlert.length === 0) {
        const hoursBlocked = Math.floor(
          (new Date().getTime() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60)
        );

        const alert = await this.createAlert({
          type: 'task_blocked',
          severity: 'high',
          title: `Task Blocked: ${task.title}`,
          message: `Task "${task.title}" in project "${task.projectName}" has been blocked for ${hoursBlocked} hours. Student: ${task.studentName}.`,
          userId: task.studentId,
          projectId: task.projectId,
          taskId: task.id,
          data: {
            hoursBlocked,
            blockedSince: task.updatedAt,
          },
        });

        generatedAlerts.push(alert);
      }
    }

    return generatedAlerts;
  }

  // Professor Dashboard
  async getAttentionItems(): Promise<any[]> {
    const attentionItems: any[] = [];

    // 1. Schedules needing approval
    const schedulesForApproval = await db
      .select({
        id: workSchedules.id,
        weekStartDate: workSchedules.weekStartDate,
        status: workSchedules.status,
        studentId: users.id,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(workSchedules)
      .innerJoin(users, eq(workSchedules.userId, users.id))
      .where(eq(workSchedules.status, 'submitted'));

    schedulesForApproval.forEach(schedule => {
      attentionItems.push({
        type: 'schedule_approval',
        id: `schedule-${schedule.id}`,
        title: `Schedule for ${schedule.studentName}`,
        subtitle: `Week of ${format(new Date(schedule.weekStartDate), 'MMM d, yyyy')}`,
        link: `/admin/compliance`, // Or a more specific link if available
        studentId: schedule.studentId,
      });
    });

    // 2. Overdue tasks
    const now = new Date();
    const overdueTasks = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        dueDate: projectTasks.dueDate,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        projectName: projects.name,
        studentId: users.id,
      })
      .from(projectTasks)
      .innerJoin(taskAssignments, and(eq(projectTasks.id, taskAssignments.taskId), eq(taskAssignments.isActive, true)))
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(
        sql`${projectTasks.dueDate} < ${now}`,
        sql`${projectTasks.status} != 'completed'`
      ));
      
    overdueTasks.forEach(task => {
      attentionItems.push({
        type: 'task_overdue',
        id: `task-${task.id}`,
        title: `Overdue: ${task.title}`,
        subtitle: `Assigned to ${task.studentName} in project ${task.projectName}`,
        link: `/admin/tasks`, // Or project-specific page
        studentId: task.studentId,
      });
    });

    // 3. Inactive students (no activity in last 3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const activeStudents = await db
      .selectDistinct({ id: users.id })
      .from(users)
      .innerJoin(taskActivity, eq(users.id, taskActivity.userId))
      .where(sql`${taskActivity.createdAt} >= ${threeDaysAgo}`);
      
    const activeStudentIds = activeStudents.map(s => s.id);

    const allStudents = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.role, 'student'));
      
    const inactiveStudents = allStudents.filter(student => !activeStudentIds.includes(student.id));

    inactiveStudents.forEach(student => {
      attentionItems.push({
        type: 'student_inactive',
        id: `student-${student.id}`,
        title: `Inactive: ${student.firstName} ${student.lastName}`,
        subtitle: 'No task activity in the last 3 days',
        link: `/admin/students/${student.id}`,
        studentId: student.id,
      });
    });
    
    return attentionItems;
  }

  async getUpcomingDeadlines(): Promise<any[]> {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const tasks = await db
      .select({
        id: projectTasks.id,
        title: projectTasks.title,
        dueDate: projectTasks.dueDate,
        type: sql<string>`'task'`,
        studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        projectName: projects.name,
      })
      .from(projectTasks)
      .innerJoin(taskAssignments, and(eq(projectTasks.id, taskAssignments.taskId), eq(taskAssignments.isActive, true)))
      .innerJoin(users, eq(taskAssignments.userId, users.id))
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(and(
        sql`${projectTasks.dueDate} >= ${now}`,
        sql`${projectTasks.dueDate} <= ${sevenDaysFromNow}`,
        sql`${projectTasks.status} != 'completed'`
      ));

    const milestones = await db
      .select({
        id: projectMilestones.id,
        title: projectMilestones.title,
        dueDate: projectMilestones.dueDate,
        type: sql<string>`'milestone'`,
        studentName: sql<string>`'Team'`, // Milestones are project-level
        projectName: projects.name,
      })
      .from(projectMilestones)
      .innerJoin(projects, eq(projectMilestones.projectId, projects.id))
      .where(and(
        sql`${projectMilestones.dueDate} >= ${now}`,
        sql`${projectMilestones.dueDate} <= ${sevenDaysFromNow}`,
        sql`${projectMilestones.status} != 'completed'`
      ));

    const combined = [...tasks, ...milestones];
    
    // @ts-ignore
    return combined.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }
}

export const storage = new DatabaseStorage();
