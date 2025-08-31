import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  date,
  time,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default('student'), // 'admin', 'professor', 'student', 'postdoc'
  department: varchar("department"),
  yearLevel: varchar("year_level"), // For students: "1st Year PhD", "2nd Year Master's", etc.
  specialization: varchar("specialization"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date"),
  targetEndDate: date("target_end_date"),
  status: varchar("status").notNull().default('active'), // 'active', 'completed', 'paused'
  projectType: varchar("project_type", { length: 50 }),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectAssignments = pgTable("project_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  role: varchar("role", { length: 50 }), // 'lead', 'contributor', 'mentor'
  allocationPercentage: integer("allocation_percentage"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progressUpdates = pgTable("progress_updates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: uuid("assignment_id").references(() => projectAssignments.id).notNull(),
  phase: varchar("phase", { length: 50 }),
  percentComplete: integer("percent_complete"),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  notes: text("notes"),
  blockers: text("blockers"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workSchedules = pgTable("work_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  totalScheduledHours: decimal("total_scheduled_hours", { precision: 5, scale: 2 }),
  approved: boolean("approved").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  status: varchar("status").notNull().default('draft'), // 'draft', 'submitted', 'approved', 'rejected'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  assignmentId: uuid("assignment_id").references(() => projectAssignments.id),
  date: date("date").notNull(),
  startTime: varchar("start_time"), // HH:MM format
  endTime: varchar("end_time"), // HH:MM format
  duration: decimal("duration", { precision: 5, scale: 2 }), // hours
  description: text("description"),
  taskType: varchar("task_type"), // 'research', 'development', 'analysis', 'meeting', 'other'
  billable: boolean("billable").default(true),
  approved: boolean("approved").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduleTemplates = pgTable("schedule_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  isDefault: boolean("is_default").default(false),
  workingDays: jsonb("working_days"), // ['monday', 'tuesday', ...]
  dailyHours: decimal("daily_hours", { precision: 3, scale: 1 }).default('8.0'),
  flexibleHours: boolean("flexible_hours").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduleBlocks = pgTable("schedule_blocks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: uuid("schedule_id").references(() => workSchedules.id).notNull(),
  dayOfWeek: varchar("day_of_week", { length: 10 }),
  startTime: time("start_time"),
  endTime: time("end_time"),
  location: varchar("location"), // 'lab', 'remote'
  plannedActivity: varchar("planned_activity", { length: 255 }),
  projectId: uuid("project_id").references(() => projects.id),
});

export const timeLogs = pgTable("time_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  verificationMethod: varchar("verification_method", { length: 50 }),
  hoursLogged: decimal("hours_logged", { precision: 5, scale: 2 }),
  scheduleBlockId: uuid("schedule_block_id").references(() => scheduleBlocks.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 50 }),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
  emailSent: boolean("email_sent").default(false),
});

export const projectTasks = pgTable("project_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: varchar("priority", { length: 20 }).default('medium'), // 'low', 'medium', 'high', 'urgent'
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  isRequired: boolean("is_required").default(true),
  orderIndex: integer("order_index").default(0),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskAssignments = pgTable("task_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => projectTasks.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const taskCompletions = pgTable("task_completions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").references(() => projectTasks.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  notes: text("notes"),
  hoursSpent: decimal("hours_spent", { precision: 5, scale: 2 }),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type CreateUserRequest = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  yearLevel?: string;
  specialization?: string;
};
export type LoginRequest = {
  email: string;
  password: string;
};
export type InsertProject = typeof projects.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProjectAssignment = typeof projectAssignments.$inferInsert;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProgressUpdate = typeof progressUpdates.$inferInsert;
export type ProgressUpdate = typeof progressUpdates.$inferSelect;
export type InsertWorkSchedule = typeof workSchedules.$inferInsert;
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertScheduleBlock = typeof scheduleBlocks.$inferInsert;
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect;
export type InsertTimeLog = typeof timeLogs.$inferInsert;
export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertProjectTask = typeof projectTasks.$inferInsert;
export type ProjectTask = typeof projectTasks.$inferSelect;
export type InsertTaskAssignment = typeof taskAssignments.$inferInsert;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskCompletion = typeof taskCompletions.$inferInsert;
export type TaskCompletion = typeof taskCompletions.$inferSelect;

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertProgressUpdateSchema = createInsertSchema(progressUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertTaskCompletionSchema = createInsertSchema(taskCompletions).omit({
  id: true,
  completedAt: true,
});

export const insertWorkScheduleSchema = createInsertSchema(workSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleBlockSchema = createInsertSchema(scheduleBlocks).omit({
  id: true,
});

export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({
  id: true,
  createdAt: true,
});

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['admin', 'professor', 'student', 'postdoc']).default('student'),
  department: z.string().optional(),
  yearLevel: z.string().optional(),
  specialization: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
