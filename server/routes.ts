import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { workSchedules } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertProjectSchema, 
  insertProjectAssignmentSchema, 
  insertProgressUpdateSchema, 
  insertNotificationSchema,
  insertProjectTaskSchema,
  insertTaskAssignmentSchema,
  insertTaskCompletionSchema,
  insertWorkScheduleSchema,
  insertScheduleBlockSchema,
  insertProjectMilestoneSchema,
  updateTaskChecklistSchema,
  taskReviewActionSchema,
  setTaskReminderSchema,
  createUserSchema,
  loginSchema,
  updateTaskStatusSchema,
  updateTaskProgressSchema,
  addTaskCommentSchema
} from "@shared/schema";
import { z } from "zod";
import { sendEmail } from './email';
import { notificationService } from './notifications';
import { alertService } from './alertService';
import { aiNotificationService } from './ai-notifications';
import { progressMonitor } from './progress-monitor';

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Docker
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = createUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }
      
      // Enforce student-only registration (professor/admin created via admin panel only)
      const user = await storage.createUser({
        ...validatedData,
        role: 'student',
      });
      
      // Set up session
      (req.session as any).userId = user.id;
      
      // Don't send password hash to client
      const { passwordHash, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.validateUserPassword(validatedData.email, validatedData.password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }
      
      // Set up session
      (req.session as any).userId = user.id;
      
      // Don't send password hash to client
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid', { 
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
      });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password hash to client
      const { passwordHash, ...userWithoutPassword } = req.user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User Management Routes
  app.get('/api/users', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id/role', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      
      const { role } = req.body;
      if (!['student', 'postdoc', 'professor', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const user = await storage.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      
      const user = await storage.deactivateUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deactivated successfully" });
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // Project Management Routes
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;

      let projects;
      if (currentUser.role === 'admin' || currentUser.role === 'professor') {
        projects = await storage.getAllProjects();
      } else {
        projects = await storage.getUserProjects(currentUser.id);
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;

      const validatedData = insertProjectSchema.parse({
        ...req.body,
        createdBy: currentUser.id,
      });

      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Update a project's overview fields
  app.patch('/api/projects/:id', isAuthenticated, requireRole(['admin','professor']), async (req, res) => {
    try {
      const updates = insertProjectSchema.partial().parse(req.body);
      const updated = await storage.updateProject(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: 'Project not found' });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid project data', errors: error.errors });
      }
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Failed to update project' });
    }
  });

  // Milestone Routes
  app.get('/api/projects/:projectId/milestones', isAuthenticated, async (req, res) => {
    try {
      const milestones = await storage.getProjectMilestones(req.params.projectId);
      res.json(milestones);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      res.status(500).json({ message: 'Failed to fetch milestones' });
    }
  });

  app.post('/api/projects/:projectId/milestones', isAuthenticated, requireRole(['admin','professor']), async (req: any, res) => {
    try {
      const validated = insertProjectMilestoneSchema.parse({ ...req.body, projectId: req.params.projectId });
      const milestone = await storage.createMilestone(validated);
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid milestone data', errors: error.errors });
      }
      console.error('Error creating milestone:', error);
      res.status(500).json({ message: 'Failed to create milestone' });
    }
  });

  app.patch('/api/milestones/:id', isAuthenticated, requireRole(['admin','professor']), async (req: any, res) => {
    try {
      const milestone = await storage.updateMilestone(req.params.id, req.body);
      res.json(milestone);
    } catch (error) {
      console.error('Error updating milestone:', error);
      res.status(500).json({ message: 'Failed to update milestone' });
    }
  });

  app.delete('/api/milestones/:id', isAuthenticated, requireRole(['admin','professor']), async (req, res) => {
    try {
      const ok = await storage.deleteMilestone(req.params.id);
      res.json({ success: ok });
    } catch (error) {
      console.error('Error deleting milestone:', error);
      res.status(500).json({ message: 'Failed to delete milestone' });
    }
  });

  // Assignment Routes
  // List active assignments for a project
  app.get('/api/projects/:projectId/assignments', isAuthenticated, requireRole(['admin','professor']), async (req, res) => {
    try {
      const items = await storage.getProjectAssignments(req.params.projectId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching project assignments:', error);
      res.status(500).json({ message: 'Failed to fetch project assignments' });
    }
  });
  app.post('/api/assignments', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const validatedData = insertProjectAssignmentSchema.parse(req.body);
      const assignment = await storage.createProjectAssignment(validatedData);

      // Best-effort notification (must not break main flow)
      try {
        if (typeof (notificationService as any)?.notifyProjectAssignment === 'function') {
          await (notificationService as any).notifyProjectAssignment(
            validatedData.projectId,
            validatedData.userId,
            currentUser.id,
            validatedData.role || 'team member'
          );
        }
      } catch (notifyErr) {
        console.error('Project assignment notification failed:', notifyErr);
      }

      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  // Deactivate an assignment (remove student from project)
  app.delete('/api/assignments/:assignmentId', isAuthenticated, requireRole(['admin','professor']), async (req, res) => {
    try {
      const ok = await storage.deactivateProjectAssignment(req.params.assignmentId);
      if (!ok) return res.status(404).json({ message: 'Assignment not found' });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deactivating assignment:', error);
      res.status(500).json({ message: 'Failed to deactivate assignment' });
    }
  });

  // Progress Routes
  app.post('/api/progress', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProgressUpdateSchema.parse(req.body);
      const update = await storage.createProgressUpdate(validatedData);
      res.status(201).json(update);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid progress data", errors: error.errors });
      }
      console.error("Error creating progress update:", error);
      res.status(500).json({ message: "Failed to create progress update" });
    }
  });

  app.get('/api/progress/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;

      // Users can only see their own progress unless they're admin/professor
      if (req.params.userId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const progress = await storage.getUserProgress(req.params.userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Notification Routes
  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notification = await storage.markNotificationAsRead(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Analytics Routes
  app.get('/api/analytics/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;

      // Users can only see their own analytics unless they're admin/professor
      if (req.params.userId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const metrics = await storage.getUserMetrics(req.params.userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching user metrics:", error);
      res.status(500).json({ message: "Failed to fetch user metrics" });
    }
  });

  app.get('/api/analytics/lab', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {

      const metrics = await storage.getLabMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching lab metrics:", error);
      res.status(500).json({ message: "Failed to fetch lab metrics" });
    }
  });

  // Student Data API Endpoints
  
  // Phase 1: Professor access to specific student's overview
  app.get('/api/students/:id/overview', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: 'Student not found' });
      const { passwordHash, ...safe } = user as any;
      res.json(safe);
    } catch (error) {
      console.error('Error fetching student overview:', error);
      res.status(500).json({ message: 'Failed to fetch student overview' });
    }
  });

  // Phase 1: Professor access to a student's schedules for a given week
  app.get('/api/students/:id/schedules', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { id } = req.params;
      const weekStart = req.query.weekStart as string | undefined;
      const schedules = await storage.getUserWorkSchedules(id, weekStart);
      res.json(schedules);
    } catch (error) {
      console.error('Error fetching student schedules:', error);
      res.status(500).json({ message: 'Failed to fetch student schedules' });
    }
  });

  // Phase 1: Professor access to all tasks assigned to a specific student
  app.get('/api/students/:id/tasks', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { id } = req.params;
      const tasks = await storage.getUserTasks(id);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching student tasks:', error);
      res.status(500).json({ message: 'Failed to fetch student tasks' });
    }
  });

  // Phase 2: Schedule feedback comments
  app.get('/api/schedules/:scheduleId/comments', isAuthenticated, requireRole(['admin','professor']), async (req, res) => {
    try {
      const comments = await storage.getScheduleComments(req.params.scheduleId);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching schedule comments:', error);
      res.status(500).json({ message: 'Failed to fetch schedule comments' });
    }
  });

  app.post('/api/schedules/:scheduleId/comment', isAuthenticated, requireRole(['admin','professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { scheduleId } = req.params;
      const { comment } = req.body || {};
      if (!comment || typeof comment !== 'string' || !comment.trim()) {
        return res.status(400).json({ message: 'Comment text is required' });
      }
      const created = await storage.addScheduleComment(scheduleId, currentUser.id, comment.trim());
      res.status(201).json(created);
    } catch (error) {
      console.error('Error creating schedule comment:', error);
      res.status(500).json({ message: 'Failed to create schedule comment' });
    }
  });

  // Get user assignments (for student projects)
  app.get('/api/assignments/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { userId } = req.params;
      
      // Students can only see their own assignments, professors/admins can see any
      if (userId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const assignments = await storage.getUserAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Get user notifications
  app.get('/api/notifications/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { userId } = req.params;
      
      // Users can only see their own notifications unless they're admin/professor
      if (userId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Delete a notification (owner only, or admin/professor)
  app.delete('/api/notifications/:id', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const notificationId = req.params.id;

      // For non-admin/professor, ensure the notification belongs to the user
      if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
        const usersNotifications = await storage.getUserNotifications(currentUser.id);
        const exists = usersNotifications.some(n => n.id === notificationId);
        if (!exists) return res.status(403).json({ message: 'Access denied' });
      }

      const ok = await storage.deleteNotification(notificationId, currentUser.id);
      if (!ok) return res.status(404).json({ message: 'Notification not found' });
      res.json({ ok: true });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  // AI Analytics Routes
  app.get('/api/ai/insights', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { aiEngine } = await import("./ai-engine");
      const insights = await aiEngine.generateInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  app.get('/api/ai/insights/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const targetUserId = req.params.userId;

      if (targetUserId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { aiEngine } = await import("./ai-engine");
      const insights = await aiEngine.generateInsights(targetUserId);
      res.json(insights);
    } catch (error) {
      console.error("Error generating user insights:", error);
      res.status(500).json({ message: "Failed to generate user insights" });
    }
  });

  app.get('/api/ai/productivity/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const targetUserId = req.params.userId;

      if (targetUserId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { aiEngine } = await import("./ai-engine");
      const metrics = await aiEngine.generateProductivityMetrics(targetUserId);
      res.json(metrics);
    } catch (error) {
      console.error("Error generating productivity metrics:", error);
      res.status(500).json({ message: "Failed to generate productivity metrics" });
    }
  });

  app.get('/api/ai/recommendations', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const userId = currentUser.role === 'admin' || currentUser.role === 'professor' 
        ? undefined 
        : currentUser.id;
      
      const { aiEngine } = await import("./ai-engine");
      const recommendations = await aiEngine.generateRecommendations(userId);
      res.json({ recommendations });
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  app.get('/api/ai/schedule-optimization/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const targetUserId = req.params.userId;

      if (targetUserId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { aiEngine } = await import("./ai-engine");
      const optimization = await aiEngine.generateScheduleOptimization(targetUserId);
      res.json(optimization);
    } catch (error) {
      console.error("Error generating schedule optimization:", error);
      res.status(500).json({ message: "Failed to generate schedule optimization" });
    }
  });

  app.get('/api/ai/project-progress/:projectId', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.projectId;
      
      // Check if user has access to this project
      const currentUser = req.user!;
      if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
        const userProjects = await storage.getUserProjects(currentUser.id);
        const hasAccess = userProjects.some(p => p.id === projectId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const { aiEngine } = await import("./ai-engine");
      const analysis = await aiEngine.analyzeProjectProgress(projectId);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing project progress:", error);
      res.status(500).json({ message: "Failed to analyze project progress" });
    }
  });

  // Time Tracking Routes
  app.get('/api/time-entries', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const weekStart = req.query.weekStart as string;
      
      // Users can only see their own entries unless they're admin/professor
      let timeEntries;
      if (currentUser.role === 'admin' || currentUser.role === 'professor') {
        timeEntries = await storage.getAllTimeEntries(weekStart);
      } else {
        timeEntries = await storage.getUserTimeEntries(currentUser.id, weekStart);
      }
      
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post('/api/time-entries', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const entryData = {
        ...req.body,
        userId: currentUser.id // Ensure user can only create entries for themselves
      };
      
      const timeEntry = await storage.createTimeEntry(entryData);
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: "Failed to create time entry" });
    }
  });

  app.put('/api/time-entries/:id/approve', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const entryId = req.params.id;
      
      const approvedEntry = await storage.approveTimeEntry(entryId, currentUser.id);
      res.json(approvedEntry);
    } catch (error) {
      console.error("Error approving time entry:", error);
      res.status(500).json({ message: "Failed to approve time entry" });
    }
  });

  // Work Schedule Routes
  app.get('/api/work-schedules', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const weekStart = req.query.weekStart as string;
      
      // Users can only see their own schedules unless they're admin/professor
      let schedules;
      if (currentUser.role === 'admin' || currentUser.role === 'professor') {
        schedules = await storage.getAllWorkSchedules(weekStart);
      } else {
        schedules = await storage.getUserWorkSchedules(currentUser.id, weekStart);
      }
      
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching work schedules:", error);
      res.status(500).json({ message: "Failed to fetch work schedules" });
    }
  });

  app.post('/api/work-schedules', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      
      // Coerce incoming values to match schema expectations
      const payload = {
        userId: currentUser.id,
        weekStartDate: req.body.weekStartDate,
        // decimal values are often strings in zod generated schemas
        totalScheduledHours: req.body.totalScheduledHours !== undefined && req.body.totalScheduledHours !== null
          ? String(req.body.totalScheduledHours)
          : undefined,
        status: req.body.status || 'draft',
        notes: req.body.notes || undefined,
      };

      // Enforce only current week creation
      const now = new Date();
      const monday = new Date(now.setDate(now.getDate() - now.getDay() + 1));
      const currentMondayISO = monday.toISOString().split('T')[0];
      if (payload.weekStartDate !== currentMondayISO) {
        return res.status(400).json({ message: 'Can only create a schedule for the current week.' });
      }

      // Validate the schedule data
      const validatedData = insertWorkScheduleSchema.parse(payload);
      
      // If schedule for current week already exists, return it (idempotent)
      const existing = await storage.getUserWorkSchedules(currentUser.id, currentMondayISO);
      if (existing && existing.length > 0) {
        return res.status(200).json(existing[0]);
      }

      // Create the schedule (validation will be done when schedule blocks are added)
      const schedule = await storage.createWorkSchedule(validatedData);

      // Prune older schedules: keep only past week and current week
      const lastWeek = new Date(monday);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekMondayISO = lastWeek.toISOString().split('T')[0];
      await storage.pruneOldSchedules(currentUser.id, lastWeekMondayISO);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      }
      console.error("Error creating work schedule:", error);
      res.status(500).json({ message: "Failed to create work schedule" });
    }
  });

  app.put('/api/work-schedules/:id/approve', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.id;
      
      const approvedSchedule = await storage.approveWorkSchedule(scheduleId, currentUser.id);
      res.json(approvedSchedule);
    } catch (error) {
      console.error("Error approving work schedule:", error);
      res.status(500).json({ message: "Failed to approve work schedule" });
    }
  });

  // Schedule submission route (validates before submission)
  app.put('/api/work-schedules/:id/submit', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.id;
      
      // Verify the schedule belongs to the current user
      const schedules = await storage.getUserWorkSchedules(currentUser.id);
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.userId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate schedule before submission
      const validation = await storage.validateWeeklySchedule(currentUser.id, schedule.weekStartDate);
      if (!validation.isValid) {
        return res.status(400).json({ 
          message: "Schedule validation failed", 
          violations: validation.violations 
        });
      }
      
      // Update schedule status to submitted
      const [updatedSchedule] = await db
        .update(workSchedules)
        .set({ 
          status: 'submitted',
          totalScheduledHours: validation.totalHours,
          updatedAt: new Date()
        })
        .where(eq(workSchedules.id, scheduleId))
        .returning();

      // Notify admins/professors that a schedule was submitted
      await notificationService.notifyScheduleSubmitted(scheduleId, currentUser.id);
      
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Error submitting schedule:", error);
      res.status(500).json({ message: "Failed to submit schedule" });
    }
  });

  // Approve schedule
  app.put('/api/work-schedules/:id/approve', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.id;
      
      const approvedSchedule = await storage.approveWorkSchedule(scheduleId, currentUser.id);

      // Notify the schedule owner
      if (approvedSchedule) {
        await notificationService.notifyScheduleApproved(scheduleId, currentUser.id);
      }
      res.json(approvedSchedule);
    } catch (error) {
      console.error("Error approving work schedule:", error);
      res.status(500).json({ message: "Failed to approve work schedule" });
    }
  });

  app.put('/api/work-schedules/:id/reject', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.id;
      const rejectionReason = req.body.reason || 'No reason provided';
      
      // Update schedule status to rejected
      const [rejectedSchedule] = await db
        .update(workSchedules)
        .set({
          status: 'rejected',
          notes: rejectionReason,
          updatedAt: new Date()
        })
        .where(eq(workSchedules.id, scheduleId))
        .returning();

      // Notify the schedule owner
      if (rejectedSchedule) {
        await notificationService.notifyScheduleRejected(scheduleId, currentUser.id, rejectionReason);
      }
      
      res.json(rejectedSchedule);
    } catch (error) {
      console.error("Error rejecting work schedule:", error);
      res.status(500).json({ message: "Failed to reject work schedule" });
    }
  });

  // Schedule Block Routes
  app.post('/api/work-schedules/:scheduleId/blocks', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.scheduleId;
      
      // Validate the block data
      const validatedData = insertScheduleBlockSchema.parse({
        ...req.body,
        scheduleId
      });
      
      // Verify the schedule belongs to the current user (unless admin/professor)
      if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
        const schedules = await storage.getUserWorkSchedules(currentUser.id);
        const ownsSchedule = schedules.some(s => s.id === scheduleId);
        if (!ownsSchedule) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const block = await storage.createScheduleBlock(validatedData);
      // Recalculate schedule total hours
      await storage.recalcScheduleTotalHours(scheduleId);

      // Notify schedule owner about update
      try {
        const schedule = await storage.getWorkSchedule(scheduleId);
        if (schedule?.userId) {
          await notificationService.createNotification({
            userId: schedule.userId,
            title: 'Schedule updated',
            message: `Added ${validatedData.dayOfWeek} ${validatedData.startTime}–${validatedData.endTime} (${validatedData.location || 'location'})`,
            type: 'schedule_update',
            relatedEntityType: 'schedule',
            relatedEntityId: scheduleId,
            metadata: { action: 'added', dayOfWeek: validatedData.dayOfWeek, startTime: validatedData.startTime, endTime: validatedData.endTime }
          });
        }
      } catch (e) {
        console.error('Failed to send schedule update notification (add):', e);
      }

      res.status(201).json(block);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid schedule block data", errors: error.errors });
      }
      console.error("Error creating schedule block:", error);
      res.status(500).json({ message: "Failed to create schedule block" });
    }
  });

  app.get('/api/work-schedules/:scheduleId/blocks', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.scheduleId;
      
      // Verify access to schedule
      if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
        const schedules = await storage.getUserWorkSchedules(currentUser.id);
        const ownsSchedule = schedules.some(s => s.id === scheduleId);
        if (!ownsSchedule) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const blocks = await storage.getScheduleBlocks(scheduleId);
      res.json(blocks);
    } catch (error) {
      console.error("Error fetching schedule blocks:", error);
      res.status(500).json({ message: "Failed to fetch schedule blocks" });
    }
  });

  // Update a schedule block (professor/admin or owner)
  app.put('/api/work-schedules/:scheduleId/blocks/:blockId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.scheduleId;
      const blockId = req.params.blockId;

      // Verify access to schedule (owner or professor/admin)
      if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
        const schedules = await storage.getUserWorkSchedules(currentUser.id);
        const ownsSchedule = schedules.some(s => s.id === scheduleId);
        if (!ownsSchedule) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Only allow updating known fields
      const updates: any = {};
      const allowed = ['dayOfWeek','startTime','endTime','location','plannedActivity','projectId'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const updated = await storage.updateScheduleBlock(blockId, updates);
      if (!updated) return res.status(404).json({ message: 'Block not found' });
      // Recalculate schedule total hours
      await storage.recalcScheduleTotalHours(scheduleId);

      // Notify schedule owner about update
      try {
        const schedule = await storage.getWorkSchedule(scheduleId);
        if (schedule?.userId) {
          await notificationService.createNotification({
            userId: schedule.userId,
            title: 'Schedule updated',
            message: `Updated block to ${updates.dayOfWeek || 'same day'} ${updates.startTime || updated.startTime}–${updates.endTime || updated.endTime}`,
            type: 'schedule_update',
            relatedEntityType: 'schedule',
            relatedEntityId: scheduleId,
            metadata: { action: 'updated', ...updates }
          });
        }
      } catch (e) {
        console.error('Failed to send schedule update notification (edit):', e);
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error updating schedule block:", error);
      res.status(500).json({ message: "Failed to update schedule block" });
    }
  });

  // Delete a schedule block (professor/admin or owner)
  app.delete('/api/work-schedules/:scheduleId/blocks/:blockId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const scheduleId = req.params.scheduleId;
      const blockId = req.params.blockId;

      // Verify access to schedule (owner or professor/admin)
      if (currentUser.role !== 'admin' && currentUser.role !== 'professor') {
        const schedules = await storage.getUserWorkSchedules(currentUser.id);
        const ownsSchedule = schedules.some(s => s.id === scheduleId);
        if (!ownsSchedule) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const ok = await storage.deleteScheduleBlock(blockId);
      if (!ok) return res.status(404).json({ message: 'Block not found' });
      // Recalculate schedule total hours
      await storage.recalcScheduleTotalHours(scheduleId);

      // Notify schedule owner about update
      try {
        const schedule = await storage.getWorkSchedule(scheduleId);
        if (schedule?.userId) {
          await notificationService.createNotification({
            userId: schedule.userId,
            title: 'Schedule updated',
            message: 'Removed a schedule block.',
            type: 'schedule_update',
            relatedEntityType: 'schedule',
            relatedEntityId: scheduleId,
            metadata: { action: 'deleted', blockId }
          });
        }
      } catch (e) {
        console.error('Failed to send schedule update notification (delete):', e);
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting schedule block:", error);
      res.status(500).json({ message: "Failed to delete schedule block" });
    }
  });

  // Schedule Compliance Routes
  app.get('/api/schedule-compliance', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const weekStart = req.query.weekStart as string | undefined;
      const compliance = await storage.getScheduleCompliance(userId, weekStart);
      res.json(compliance);
    } catch (error) {
      console.error("Error fetching schedule compliance:", error);
      res.status(500).json({ message: "Failed to fetch schedule compliance" });
    }
  });

  app.get('/api/schedule-validation/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const targetUserId = req.params.userId;
      const weekStart = req.query.weekStart as string;
      
      // Users can only validate their own schedules unless they're admin/professor
      if (targetUserId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!weekStart) {
        return res.status(400).json({ message: "Week start date is required" });
      }
      
      const validation = await storage.validateWeeklySchedule(targetUserId, weekStart);
      res.json(validation);
    } catch (error) {
      console.error("Error validating schedule:", error);
      res.status(500).json({ message: "Failed to validate schedule" });
    }
  });

  // Reports and Analytics Routes
  app.get('/api/reports', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const reports = await storage.getUserReports(currentUser.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/reports/productivity/:dateRange', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const dateRange = req.params.dateRange;
      const productivityData = await storage.getProductivityReports(dateRange);
      res.json(productivityData);
    } catch (error) {
      console.error("Error fetching productivity reports:", error);
      res.status(500).json({ message: "Failed to fetch productivity reports" });
    }
  });

  app.get('/api/reports/projects/:dateRange', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const dateRange = req.params.dateRange;
      const projectData = await storage.getProjectReports(dateRange);
      res.json(projectData);
    } catch (error) {
      console.error("Error fetching project reports:", error);
      res.status(500).json({ message: "Failed to fetch project reports" });
    }
  });

  app.post('/api/reports/generate', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const reportData = {
        ...req.body,
        createdBy: currentUser.id,
        status: 'generating'
      };
      
      const report = await storage.createReport(reportData);
      
      // In a real implementation, this would queue a background job
      // For Phase 4, we'll simulate the generation process
      setTimeout(async () => {
        await storage.updateReportStatus(report.id, 'completed');
      }, 3000);
      
      res.status(201).json(report);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  app.get('/api/reports/:id/download', isAuthenticated, async (req, res) => {
    try {
      const reportId = req.params.id;
      const downloadUrl = await storage.getReportDownloadUrl(reportId);
      res.json({ downloadUrl });
    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  // Task Management Routes
  
  // Create a new task for a project (professors/admin only)
  app.post('/api/projects/:projectId/tasks', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const projectId = req.params.projectId;
      
      // Coerce dueDate if sent as yyyy-mm-dd or ISO string
      const payload = {
        ...req.body,
        projectId,
        createdBy: currentUser.id,
        dueDate: req.body?.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      const validatedData = insertProjectTaskSchema.parse(payload);
      
      const task = await storage.createProjectTask(validatedData);

      // Email assigned users (if provided via subsequent assignment endpoint, they'll also get emails there)
      const assigneeId = (req.body as any).assigneeId as string | undefined;
      if (assigneeId) {
        await notificationService.notifyTaskAssignment(task.id, assigneeId, currentUser.id);
      }
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Get all tasks for a project
  app.get('/api/projects/:projectId/tasks', isAuthenticated, async (req, res) => {
    try {
      const projectId = req.params.projectId;
      const tasks = await storage.getProjectTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  // Update a task (professors/admin only)
  app.put('/api/tasks/:taskId', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const payload = {
        ...req.body,
        dueDate: req.body?.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      const validatedData = insertProjectTaskSchema.partial().parse(payload);
      
      const task = await storage.updateProjectTask(taskId, validatedData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Task status/progress/comments/activity APIs
  app.patch('/api/tasks/:taskId/status', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const validatedData = updateTaskStatusSchema.parse(req.body);
      const task = await storage.updateTaskStatus(req.params.taskId, validatedData.status, currentUser.id, validatedData.note);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Failed to update task status' });
    }
  });

  app.patch('/api/tasks/:taskId/progress', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const validatedData = updateTaskProgressSchema.parse(req.body);
      const task = await storage.updateTaskProgress(req.params.taskId, validatedData.progressPct, currentUser.id, validatedData.note);
      if (!task) return res.status(404).json({ message: 'Task not found' });
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error updating task progress:', error);
      res.status(500).json({ message: 'Failed to update task progress' });
    }
  });

  // Task checklist update
  app.patch('/api/tasks/:taskId/checklist', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const validated = updateTaskChecklistSchema.parse(req.body);
      const task = await storage.updateTaskChecklist(req.params.taskId, validated.checklist, currentUser.id);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid checklist data', errors: error.errors });
      }
      console.error('Error updating checklist:', error);
      res.status(500).json({ message: 'Failed to update checklist' });
    }
  });

  app.post('/api/tasks/:taskId/comment', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const validatedData = addTaskCommentSchema.parse(req.body);
      await storage.addTaskComment(req.params.taskId, currentUser.id, validatedData.message);
      res.status(201).json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error adding task comment:', error);
      res.status(500).json({ message: 'Failed to add task comment' });
    }
  });

  app.get('/api/tasks/:taskId/activity', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getTaskActivity(req.params.taskId);
      res.json(items);
    } catch (error) {
      console.error('Error fetching task activity:', error);
      res.status(500).json({ message: 'Failed to fetch task activity' });
    }
  });

  // Task review actions: submit / approve / reject
  app.patch('/api/tasks/:taskId/review', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const validated = taskReviewActionSchema.parse(req.body);
      const task = await storage.reviewTask(req.params.taskId, validated.action, currentUser.id, validated.note);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid review action', errors: error.errors });
      }
      console.error('Error reviewing task:', error);
      res.status(500).json({ message: 'Failed to review task' });
    }
  });

  // Delete a task (professors/admin only)
  app.delete('/api/tasks/:taskId', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const success = await storage.deleteProjectTask(taskId);
      
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Task reminder
  app.patch('/api/tasks/:taskId/reminder', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user!;
      const validated = setTaskReminderSchema.parse(req.body);
      const reminderAt = new Date(validated.reminderAt);
      const task = await storage.setTaskReminder(req.params.taskId, reminderAt, currentUser.id);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid reminder data', errors: error.errors });
      }
      console.error('Error setting reminder:', error);
      res.status(500).json({ message: 'Failed to set reminder' });
    }
  });

  // Assign task to a user (professors/admin only)
  app.post('/api/tasks/:taskId/assign', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const taskId = req.params.taskId;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      const validatedData = insertTaskAssignmentSchema.parse({
        taskId,
        userId,
        assignedBy: currentUser.id,
      });
      
      const assignment = await storage.assignTaskToUser(validatedData);

      // Notify the assignee
      await notificationService.notifyTaskAssignment(taskId, userId, currentUser.id);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error("Error assigning task:", error);
      res.status(500).json({ message: "Failed to assign task" });
    }
  });

  // Get all tasks assigned to current user
  app.get('/api/user/tasks', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const tasks = await storage.getUserTasks(currentUser.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Failed to fetch user tasks" });
    }
  });

  // Get user tasks for a specific project
  app.get('/api/user/projects/:projectId/tasks', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const projectId = req.params.projectId;
      const tasks = await storage.getUserTasksForProject(currentUser.id, projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching user project tasks:", error);
      res.status(500).json({ message: "Failed to fetch user project tasks" });
    }
  });

  // Complete a task
  app.post('/api/tasks/:taskId/complete', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const taskId = req.params.taskId;
      
      // Check if already completed
      const alreadyCompleted = await storage.isTaskCompletedByUser(taskId, currentUser.id);
      if (alreadyCompleted) {
        return res.status(400).json({ message: "Task already completed" });
      }
      
      const validatedData = insertTaskCompletionSchema.parse({
        taskId,
        userId: currentUser.id,
        notes: req.body.notes || null,
        hoursSpent: req.body.hoursSpent || null,
      });
      
      const completion = await storage.completeTask(validatedData);
      res.status(201).json(completion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid completion data", errors: error.errors });
      }
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  // Get task completions (for professors/admin to review)
  app.get('/api/tasks/:taskId/completions', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const taskId = req.params.taskId;
      const completions = await storage.getTaskCompletions(taskId);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching task completions:", error);
      res.status(500).json({ message: "Failed to fetch task completions" });
    }
  });

  // Simple KPIs for dashboard
  app.get('/api/analytics/kpis', isAuthenticated, async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const projects = await storage.getAllProjects();
      const tasks = await storage.getUserTasks(req.user!.id);
      const schedules = await storage.getUserWorkSchedules(req.user!.id);

      res.json({
        totalUsers: allUsers.length,
        totalProjects: projects.length,
        myOpenTasks: tasks.filter(t => !t.isCompleted).length,
        mySchedules: schedules.length,
      });
    } catch (e) {
      console.error('Error computing KPIs:', e);
      res.status(500).json({ message: 'Failed to compute KPIs' });
    }
  });

  // CSV export helpers
  const toCsv = (rows: any[]) => {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))].join('\n');
  };

  app.get('/api/export/tasks.csv', isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getUserTasks(req.user!.id);
      const csv = toCsv(data.map(t => ({ id: t.id, title: t.title, projectId: t.projectId, dueDate: t.dueDate, isCompleted: t.isCompleted })));
      res.header('Content-Type', 'text/csv');
      res.attachment('tasks.csv');
      res.send(csv);
    } catch (e) {
      console.error('Export tasks failed:', e);
      res.status(500).json({ message: 'Failed to export tasks' });
    }
  });

  app.get('/api/export/schedules.csv', isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getUserWorkSchedules(req.user!.id);
      const csv = toCsv(data.map(s => ({ id: s.id, weekStartDate: s.weekStartDate, status: s.status, totalScheduledHours: s.totalScheduledHours })));
      res.header('Content-Type', 'text/csv');
      res.attachment('schedules.csv');
      res.send(csv);
    } catch (e) {
      console.error('Export schedules failed:', e);
      res.status(500).json({ message: 'Failed to export schedules' });
    }
  });

  // Direct messaging routes
  app.post('/api/messages/send', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const { recipientId, subject, message } = req.body;
      
      if (!recipientId || !subject || !message) {
        return res.status(400).json({ message: "Missing required fields: recipientId, subject, message" });
      }
      
      // Verify recipient exists and is active
      const recipient = await storage.getUser(recipientId);
      if (!recipient || !recipient.isActive) {
        return res.status(404).json({ message: "Recipient not found or inactive" });
      }
      
      // Send the direct message with in-app notification (email disabled by default)
      await notificationService.sendDirectMessageWithNotification(currentUser.id, recipientId, subject, message, false);
      
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending direct message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Get all users for messaging (professors can message students, students can message professors)
  app.get('/api/users/messageable', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;
      const allUsers = await storage.getAllUsers();
      
      let messageableUsers;
      if (currentUser.role === 'admin' || currentUser.role === 'professor') {
        // Professors and admins can message anyone except themselves
        messageableUsers = allUsers.filter(u => u.id !== currentUser.id && u.isActive);
      } else {
        // Students can only message professors and admins
        messageableUsers = allUsers.filter(u => 
          u.id !== currentUser.id && 
          u.isActive && 
          (u.role === 'professor' || u.role === 'admin')
        );
      }
      
      // Return only necessary fields for privacy
      const safeUsers = messageableUsers.map(u => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        department: u.department
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching messageable users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // AI Lab Insights Route
  app.get('/api/ai/lab-insights', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const insights = await aiNotificationService.generateLabInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error generating lab insights:", error);
      res.status(500).json({ message: "Failed to generate lab insights" });
    }
  });

  // AI Productivity Analysis Route
  app.get('/api/ai/productivity/:userId', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const userId = req.params.userId;
      const analysis = await aiNotificationService.analyzeStudentProductivity(userId);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing student productivity:", error);
      res.status(500).json({ message: "Failed to analyze student productivity" });
    }
  });

  // Real-time Lab Statistics Route
  app.get('/api/realtime/lab-stats', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const stats = await progressMonitor.getRealtimeLabStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting realtime lab stats:", error);
      res.status(500).json({ message: "Failed to get realtime statistics" });
    }
  });

  // Student Dashboard Metrics for Professors
  app.get('/api/users/:userId/dashboard-metrics', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { userId } = req.params;
      
      const [
        user,
        assignments,
        tasks,
        workSchedules,
        progressUpdates,
        notifications,
        productivity
      ] = await Promise.all([
        storage.getUser(userId),
        storage.getUserAssignments(userId),
        storage.getUserTasks(userId),
        storage.getUserWorkSchedules(userId),
        storage.getUserProgressUpdates(userId),
        storage.getUserNotifications(userId),
        aiNotificationService.analyzeStudentProductivity(userId)
      ]);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate additional metrics
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const pendingTasks = tasks.filter(task => task.status === 'pending').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
      
      const totalHoursScheduled = workSchedules.reduce((sum, schedule) => 
        sum + (schedule.totalScheduledHours || 0), 0
      );

      const recentProgressUpdates = progressUpdates
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const unreadNotifications = notifications.filter(n => !n.isRead).length;

      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        },
        metrics: {
          totalProjects: assignments.length,
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          inProgressTasks,
          totalHoursScheduled,
          unreadNotifications,
          productivityScore: productivity.currentScore,
          riskLevel: productivity.riskLevel
        },
        recentActivity: {
          progressUpdates: recentProgressUpdates,
          recentTasks: tasks
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, 5)
        },
        productivity
      });
    } catch (error) {
      console.error("Error getting student dashboard metrics:", error);
      res.status(500).json({ message: "Failed to get student dashboard metrics" });
    }
  });

  // Sprint C: Team Oversight API Endpoints
  
  // Get all team tasks with filtering
  app.get('/api/admin/tasks/overview', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const filters = req.query;
      
      // Convert query params to filter object
      const taskFilter: any = {};
      
      if (filters.status) {
        taskFilter.status = Array.isArray(filters.status) ? filters.status : [filters.status];
      }
      
      if (filters.riskLevel) {
        taskFilter.riskLevel = Array.isArray(filters.riskLevel) ? filters.riskLevel : [filters.riskLevel];
      }
      
      if (filters.studentIds) {
        taskFilter.studentIds = Array.isArray(filters.studentIds) ? filters.studentIds : [filters.studentIds];
      }
      
      if (filters.projectIds) {
        taskFilter.projectIds = Array.isArray(filters.projectIds) ? filters.projectIds : [filters.projectIds];
      }
      
      if (filters.priorities) {
        taskFilter.priorities = Array.isArray(filters.priorities) ? filters.priorities : [filters.priorities];
      }
      
      if (filters.progressMin || filters.progressMax) {
        taskFilter.progressRange = {
          min: parseInt(filters.progressMin as string) || 0,
          max: parseInt(filters.progressMax as string) || 100
        };
      }
      
      if (filters.needsAttention === 'true') {
        taskFilter.needsAttention = true;
      }
      
      if (filters.recentlyActive === 'true') {
        taskFilter.recentlyActive = true;
      }
      
      const tasks = await storage.getAllTeamTasks(taskFilter);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching team tasks overview:", error);
      res.status(500).json({ message: "Failed to fetch team tasks overview" });
    }
  });

  // Get student task summaries
  app.get('/api/admin/tasks/students', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const summaries = await storage.getStudentTaskSummaries();
      res.json(summaries);
    } catch (error) {
      console.error("Error fetching student task summaries:", error);
      res.status(500).json({ message: "Failed to fetch student task summaries" });
    }
  });

  // Bulk update tasks
  app.patch('/api/admin/tasks/bulk', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { taskIds, updates } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "taskIds array is required" });
      }
      
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ message: "updates object is required" });
      }
      
      await storage.updateTasksBulk(taskIds, updates, currentUser.id);
      
      res.json({ 
        message: `Successfully updated ${taskIds.length} tasks`,
        affectedTasks: taskIds.length
      });
    } catch (error) {
      console.error("Error in bulk task update:", error);
      res.status(500).json({ message: "Failed to update tasks" });
    }
  });

  // Add bulk comment to tasks
  app.post('/api/admin/tasks/bulk-comment', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const currentUser = req.user!;
      const { taskIds, message } = req.body;
      
      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ message: "taskIds array is required" });
      }
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "message is required" });
      }
      
      await storage.addBulkComment(taskIds, message.trim(), currentUser.id);
      
      res.json({ 
        message: `Successfully added comment to ${taskIds.length} tasks`,
        affectedTasks: taskIds.length
      });
    } catch (error) {
      console.error("Error adding bulk comment:", error);
      res.status(500).json({ message: "Failed to add bulk comment" });
    }
  });

  // Sprint C Phase 2: Enhanced Analytics & Live Monitoring

  // Get progress velocity metrics
  app.get('/api/admin/velocity-metrics', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { studentId, days } = req.query;
      const metrics = await storage.getProgressVelocityMetrics(
        studentId as string, 
        days ? parseInt(days as string) : 7
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching velocity metrics:", error);
      res.status(500).json({ message: "Failed to fetch velocity metrics" });
    }
  });

  // Get live team activity feed
  app.get('/api/admin/live-activity', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const activity = await storage.getLiveTeamActivity();
      res.json(activity);
    } catch (error) {
      console.error("Error fetching live activity:", error);
      res.status(500).json({ message: "Failed to fetch live activity" });
    }
  });

  // Sprint D: Alert System API Endpoints

  // Get active alerts
  app.get('/api/admin/alerts', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { userId } = req.query;
      const alerts = await alertService.getActiveAlertsWithContext();
      
      // Filter by user if specified
      const filteredAlerts = userId 
        ? alerts.filter(alert => alert.userId === userId)
        : alerts;
      
      res.json(filteredAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Get alert statistics
  app.get('/api/admin/alerts/stats', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const stats = await alertService.getAlertStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching alert statistics:", error);
      res.status(500).json({ message: "Failed to fetch alert statistics" });
    }
  });

  // Resolve an alert
  app.patch('/api/admin/alerts/:alertId/resolve', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { alertId } = req.params;
      const { reason } = req.body;
      const currentUser = req.user!;
      
      await alertService.resolveAlert(alertId, currentUser.id, reason);
      
      res.json({ 
        message: "Alert resolved successfully",
        alertId,
        resolvedBy: currentUser.id 
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Get alert configurations
  app.get('/api/admin/alert-configs', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const configs = await storage.getAlertConfigurations();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching alert configurations:", error);
      res.status(500).json({ message: "Failed to fetch alert configurations" });
    }
  });

  // Update alert configuration
  app.patch('/api/admin/alert-configs/:configId', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const { configId } = req.params;
      const updates = req.body;
      
      await storage.updateAlertConfiguration(configId, updates);
      
      res.json({ 
        message: "Alert configuration updated successfully",
        configId 
      });
    } catch (error) {
      console.error("Error updating alert configuration:", error);
      res.status(500).json({ message: "Failed to update alert configuration" });
    }
  });

  // Manual alert generation (for testing/immediate checks)
  app.post('/api/admin/alerts/generate', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {
      const alerts = await alertService.generateAlerts();
      
      res.json({ 
        message: "Alert generation completed",
        generatedAlerts: alerts.length,
        alerts: alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title
        }))
      });
    } catch (error) {
      console.error("Error generating alerts manually:", error);
      res.status(500).json({ message: "Failed to generate alerts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
