import { storage } from './storage';
import { notificationService } from './notifications';
import { WebSocketService } from './websocket';

export class ProgressMonitorService {
  private checkInterval: NodeJS.Timeout | null = null;
  private lastChecks: Map<string, Date> = new Map();

  start() {
    // Run monitoring every 5 minutes
    this.checkInterval = setInterval(() => {
      this.monitorProgress();
    }, 5 * 60 * 1000);
    
    console.log('🔍 Progress monitoring service started');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🔍 Progress monitoring service stopped');
  }

  async monitorProgress() {
    try {
      console.log('🔍 Running progress monitoring check...');
      
      const users = await storage.getUsersByRole('student');
      
      for (const user of users) {
        if (!user.isActive) continue;
        
        await this.checkUserProgress(user.id);
      }
      
      console.log('✅ Progress monitoring check completed');
    } catch (error) {
      console.error('❌ Progress monitoring error:', error);
    }
  }

  private async checkUserProgress(userId: string) {
    try {
      const [userTasks, userSchedules] = await Promise.all([
        storage.getUserTasks(userId),
        storage.getUserWorkSchedules(userId)
      ]);

      const currentTime = new Date();
      const lastCheck = this.lastChecks.get(userId) || new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
      
      // Check for new overdue tasks
      const newlyOverdueTasks = userTasks.filter(task => {
        if (!task.dueDate || task.isCompleted) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate < currentTime && dueDate > lastCheck;
      });

      // Check for task completions
      const recentlyCompletedTasks = userTasks.filter(task => {
        if (!task.isCompleted) return false;
        // This is simplified - in a real system, you'd track completion timestamps
        return true; // For now, assume all completed tasks are recent
      });

      // Check for schedule submissions
      const recentScheduleSubmissions = userSchedules.filter(schedule => {
        if (!schedule.createdAt) return false;
        return new Date(schedule.createdAt) > lastCheck;
      });

      // Send real-time updates via WebSocket
      const progressUpdate = {
        userId,
        timestamp: currentTime.toISOString(),
        metrics: {
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter(t => t.isCompleted).length,
          overdueTasks: userTasks.filter(t => t.dueDate && new Date(t.dueDate) < currentTime && !t.isCompleted).length,
          newlyOverdue: newlyOverdueTasks.length,
          recentCompletions: recentlyCompletedTasks.length,
          scheduleSubmissions: recentScheduleSubmissions.length
        },
        alerts: []
      };

      // Generate alerts based on changes
      if (newlyOverdueTasks.length > 0) {
        progressUpdate.alerts.push({
          type: 'overdue_tasks',
          severity: 'high',
          message: `${newlyOverdueTasks.length} task(s) became overdue`,
          tasks: newlyOverdueTasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate }))
        });

        // Send notifications for newly overdue tasks
        for (const task of newlyOverdueTasks) {
          await notificationService.notifyTaskOverdue(task.id);
        }
      }

      if (recentlyCompletedTasks.length > 0) {
        progressUpdate.alerts.push({
          type: 'task_completion',
          severity: 'low',
          message: `${recentlyCompletedTasks.length} task(s) completed`,
          tasks: recentlyCompletedTasks.map(t => ({ id: t.id, title: t.title }))
        });
      }

      if (recentScheduleSubmissions.length > 0) {
        progressUpdate.alerts.push({
          type: 'schedule_submission',
          severity: 'low',
          message: `${recentScheduleSubmissions.length} schedule(s) submitted`,
        });
      }

      // Broadcast progress update to connected administrators and professors
      WebSocketService.getInstance().broadcastToRole(['admin', 'professor'], 'progress_update', progressUpdate);

      // Update last check time
      this.lastChecks.set(userId, currentTime);

    } catch (error) {
      console.error(`Error checking progress for user ${userId}:`, error);
    }
  }

  async getRealtimeLabStats() {
    try {
      const users = await storage.getUsersByRole('student');
      const professors = await storage.getUsersByRole('professor');
      const allProjects = await storage.getAllProjects();
      
      let totalTasks = 0;
      let completedTasks = 0;
      let overdueTasks = 0;
      let activeStudents = 0;

      const currentTime = new Date();
      const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

      for (const user of users) {
        if (!user.isActive) continue;
        activeStudents++;

        const userTasks = await storage.getUserTasks(user.id);
        totalTasks += userTasks.length;
        completedTasks += userTasks.filter(t => t.isCompleted).length;
        overdueTasks += userTasks.filter(t => 
          t.dueDate && new Date(t.dueDate) < currentTime && !t.isCompleted
        ).length;
      }

      const stats = {
        timestamp: currentTime.toISOString(),
        overview: {
          activeStudents,
          totalProfessors: professors.length,
          activeProjects: allProjects.filter(p => p.status === 'active').length,
          totalTasks,
          completedTasks,
          overdueTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        alerts: {
          highPriorityAlerts: overdueTasks,
          mediumPriorityAlerts: 0,
          lowPriorityAlerts: 0
        }
      };

      return stats;
    } catch (error) {
      console.error('Error generating realtime lab stats:', error);
      return null;
    }
  }

  async broadcastLabStats() {
    const stats = await this.getRealtimeLabStats();
    if (stats) {
      WebSocketService.getInstance().broadcastToRole(['admin', 'professor'], 'lab_stats', stats);
    }
  }
}

export const progressMonitor = new ProgressMonitorService();