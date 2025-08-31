import { sendEmail } from './email';
import { StudentEmailTemplates, ProfessorEmailTemplates, generateEmailFromTemplate } from './email-templates';
import { storage } from './storage';
import type { User, Project, ProjectTask, ProjectAssignment, WorkSchedule } from '../shared/schema';

export class NotificationService {
  async notifyTaskAssignment(taskId: string, assignedUserId: string, assignedByUserId: string) {
    try {
      const [task, assignedUser, assignedByUser, project] = await Promise.all([
        storage.getTask(taskId),
        storage.getUser(assignedUserId),
        storage.getUser(assignedByUserId),
        storage.getTaskProject(taskId)
      ]);

      if (!task || !assignedUser || !assignedByUser || !project) {
        console.error('Missing data for task assignment notification');
        return;
      }

      const studentTemplate = StudentEmailTemplates.TASK_ASSIGNED;
      const studentEmail = generateEmailFromTemplate(studentTemplate, {
        studentName: `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.email,
        taskName: task.title,
        projectName: project.name,
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set',
        priority: task.priority || 'medium',
        description: task.description || 'No description provided',
        assignedByName: `${assignedByUser.firstName || ''} ${assignedByUser.lastName || ''}`.trim() || assignedByUser.email,
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(assignedUser.email, studentEmail.subject, studentEmail.html);
      console.log(`✅ Task assignment notification sent to ${assignedUser.email}`);
    } catch (error) {
      console.error('Error sending task assignment notification:', error);
    }
  }

  async notifyTaskOverdue(taskId: string) {
    try {
      const [task, assignedUsers, project] = await Promise.all([
        storage.getTask(taskId),
        storage.getTaskAssignees(taskId),
        storage.getTaskProject(taskId)
      ]);

      if (!task || !assignedUsers.length || !project) {
        return;
      }

      for (const user of assignedUsers) {
        const template = StudentEmailTemplates.TASK_OVERDUE;
        const email = generateEmailFromTemplate(template, {
          studentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          taskName: task.title,
          projectName: project.name,
          dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
          overdueDays: task.dueDate ? Math.floor((Date.now() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
        });

        await sendEmail(user.email, email.subject, email.html);
      }

      console.log(`✅ Overdue task notifications sent for task: ${task.title}`);
    } catch (error) {
      console.error('Error sending overdue task notifications:', error);
    }
  }

  async notifyScheduleSubmitted(scheduleId: string, studentId: string) {
    try {
      const [schedule, student, professors] = await Promise.all([
        storage.getWorkSchedule(scheduleId),
        storage.getUser(studentId),
        storage.getUsersByRole('professor')
      ]);

      if (!schedule || !student || !professors.length) {
        return;
      }

      for (const professor of professors) {
        const template = ProfessorEmailTemplates.SCHEDULE_SUBMITTED;
        const email = generateEmailFromTemplate(template, {
          professorName: `${professor.firstName || ''} ${professor.lastName || ''}`.trim() || professor.email,
          studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
          weekStartDate: new Date(schedule.weekStartDate).toLocaleDateString(),
          totalHours: schedule.totalScheduledHours?.toString() || '0',
          status: schedule.status,
          dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
        });

        await sendEmail(professor.email, email.subject, email.html);
      }

      const studentTemplate = StudentEmailTemplates.SCHEDULE_SUBMITTED_CONFIRMATION;
      const studentEmail = generateEmailFromTemplate(studentTemplate, {
        studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
        weekStartDate: new Date(schedule.weekStartDate).toLocaleDateString(),
        totalHours: schedule.totalScheduledHours?.toString() || '0',
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(student.email, studentEmail.subject, studentEmail.html);
      console.log(`✅ Schedule submission notifications sent for week ${schedule.weekStartDate}`);
    } catch (error) {
      console.error('Error sending schedule submission notifications:', error);
    }
  }

  async notifyScheduleApproved(scheduleId: string, approvedBy: string) {
    try {
      const [schedule, student, approver] = await Promise.all([
        storage.getWorkSchedule(scheduleId),
        storage.getUser(schedule?.userId || ''),
        storage.getUser(approvedBy)
      ]);

      if (!schedule || !student || !approver) {
        return;
      }

      const template = StudentEmailTemplates.SCHEDULE_APPROVED;
      const email = generateEmailFromTemplate(template, {
        studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
        weekStartDate: new Date(schedule.weekStartDate).toLocaleDateString(),
        totalHours: schedule.totalScheduledHours?.toString() || '0',
        approverName: `${approver.firstName || ''} ${approver.lastName || ''}`.trim() || approver.email,
        approvalNotes: schedule.notes || '',
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(student.email, email.subject, email.html);
      console.log(`✅ Schedule approval notification sent to ${student.email}`);
    } catch (error) {
      console.error('Error sending schedule approval notification:', error);
    }
  }

  async notifyScheduleRejected(scheduleId: string, rejectedBy: string, rejectionReason: string) {
    try {
      const [schedule, student, rejector] = await Promise.all([
        storage.getWorkSchedule(scheduleId),
        storage.getUser(schedule?.userId || ''),
        storage.getUser(rejectedBy)
      ]);

      if (!schedule || !student || !rejector) {
        return;
      }

      const template = StudentEmailTemplates.SCHEDULE_REJECTED;
      const email = generateEmailFromTemplate(template, {
        studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
        weekStartDate: new Date(schedule.weekStartDate).toLocaleDateString(),
        rejectorName: `${rejector.firstName || ''} ${rejector.lastName || ''}`.trim() || rejector.email,
        rejectionReason: rejectionReason || 'No reason provided',
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(student.email, email.subject, email.html);
      console.log(`✅ Schedule rejection notification sent to ${student.email}`);
    } catch (error) {
      console.error('Error sending schedule rejection notification:', error);
    }
  }

  async notifyProjectAssignment(projectId: string, userId: string, assignedBy: string, role: string) {
    try {
      const [project, user, assigner] = await Promise.all([
        storage.getProject(projectId),
        storage.getUser(userId),
        storage.getUser(assignedBy)
      ]);

      if (!project || !user || !assigner) {
        return;
      }

      const template = StudentEmailTemplates.PROJECT_ASSIGNED;
      const email = generateEmailFromTemplate(template, {
        studentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        projectName: project.name,
        projectDescription: project.description || 'No description provided',
        role: role || 'team member',
        startDate: project.startDate ? new Date(project.startDate).toLocaleDateString() : 'To be determined',
        targetEndDate: project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : 'To be determined',
        assignedByName: `${assigner.firstName || ''} ${assigner.lastName || ''}`.trim() || assigner.email,
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(user.email, email.subject, email.html);
      console.log(`✅ Project assignment notification sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending project assignment notification:', error);
    }
  }

  async sendProductivityAlert(userId: string, alertType: string, metrics: any) {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;

      const template = StudentEmailTemplates.PRODUCTIVITY_ALERT;
      const email = generateEmailFromTemplate(template, {
        studentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        alertType: alertType,
        currentProductivity: metrics.currentScore || 0,
        targetProductivity: metrics.targetScore || 85,
        suggestions: metrics.suggestions || 'Stay focused on your goals and maintain consistent progress.',
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(user.email, email.subject, email.html);
      console.log(`✅ Productivity alert sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending productivity alert:', error);
    }
  }

  async sendWeeklyDigest(userId: string, digestData: any) {
    try {
      const user = await storage.getUser(userId);
      if (!user) return;

      const isStudent = user.role === 'student';
      const template = isStudent 
        ? StudentEmailTemplates.WEEKLY_DIGEST
        : ProfessorEmailTemplates.WEEKLY_DIGEST;

      const email = generateEmailFromTemplate(template, {
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        weekStartDate: digestData.weekStartDate,
        weekEndDate: digestData.weekEndDate,
        completedTasks: digestData.completedTasks || 0,
        pendingTasks: digestData.pendingTasks || 0,
        hoursWorked: digestData.hoursWorked || 0,
        productivityScore: digestData.productivityScore || 0,
        upcomingDeadlines: digestData.upcomingDeadlines || [],
        achievements: digestData.achievements || [],
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(user.email, email.subject, email.html);
      console.log(`✅ Weekly digest sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending weekly digest:', error);
    }
  }

  async sendDirectMessage(fromUserId: string, toUserId: string, subject: string, message: string) {
    try {
      const [fromUser, toUser] = await Promise.all([
        storage.getUser(fromUserId),
        storage.getUser(toUserId)
      ]);

      if (!fromUser || !toUser) return;

      const isFromProfessor = fromUser.role === 'professor' || fromUser.role === 'admin';
      const template = isFromProfessor
        ? ProfessorEmailTemplates.DIRECT_MESSAGE
        : StudentEmailTemplates.PROFESSOR_MESSAGE;

      const email = generateEmailFromTemplate(template, {
        recipientName: `${toUser.firstName || ''} ${toUser.lastName || ''}`.trim() || toUser.email,
        senderName: `${fromUser.firstName || ''} ${fromUser.lastName || ''}`.trim() || fromUser.email,
        senderRole: fromUser.role || 'team member',
        subject: subject,
        message: message,
        dashboardUrl: process.env.APP_URL || 'http://localhost:3000'
      });

      await sendEmail(toUser.email, email.subject, email.html);
      console.log(`✅ Direct message sent from ${fromUser.email} to ${toUser.email}`);
    } catch (error) {
      console.error('Error sending direct message:', error);
    }
  }
}

export const notificationService = new NotificationService();