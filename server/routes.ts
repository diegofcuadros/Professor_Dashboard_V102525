import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { 
  insertProjectSchema, 
  insertProjectAssignmentSchema, 
  insertProgressUpdateSchema, 
  insertNotificationSchema,
  insertProjectTaskSchema,
  insertTaskAssignmentSchema,
  insertTaskCompletionSchema,
  createUserSchema,
  loginSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      const user = await storage.createUser(validatedData);
      
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

  // Assignment Routes
  app.post('/api/assignments', isAuthenticated, requireRole(['admin', 'professor']), async (req, res) => {
    try {

      const validatedData = insertProjectAssignmentSchema.parse(req.body);
      const assignment = await storage.createProjectAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid assignment data", errors: error.errors });
      }
      console.error("Error creating assignment:", error);
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.get('/api/assignments/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;

      // Users can only see their own assignments unless they're admin/professor
      if (req.params.userId !== currentUser.id && 
          currentUser.role !== 'admin' && 
          currentUser.role !== 'professor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const assignments = await storage.getUserAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
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
  app.get('/api/notifications/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const currentUser = req.user!;

      // Users can only see their own notifications
      if (req.params.userId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const notifications = await storage.getUserNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

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
      const scheduleData = {
        ...req.body,
        userId: currentUser.id
      };
      
      const schedule = await storage.createWorkSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
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
      
      const validatedData = insertProjectTaskSchema.parse({
        ...req.body,
        projectId,
        createdBy: currentUser.id,
      });
      
      const task = await storage.createProjectTask(validatedData);
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
      const validatedData = insertProjectTaskSchema.partial().parse(req.body);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
