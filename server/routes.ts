import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./auth";
import { 
  insertProjectSchema, 
  insertProjectAssignmentSchema, 
  insertProgressUpdateSchema, 
  insertNotificationSchema,
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

  const httpServer = createServer(app);
  return httpServer;
}
