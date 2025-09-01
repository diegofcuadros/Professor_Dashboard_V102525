import { storage } from "./storage";
import { notificationService } from "./notificationService";
import type { Alert } from "@shared/schema";

export class AlertService {
  private isRunning = false;

  async generateAlerts(): Promise<Alert[]> {
    if (this.isRunning) {
      console.log("Alert generation already in progress, skipping...");
      return [];
    }

    this.isRunning = true;
    console.log("🚨 Starting automated alert generation...");

    try {
      const allGeneratedAlerts: Alert[] = [];

      // Check all alert types
      const alertChecks = [
        { name: "Overdue Tasks", check: () => storage.checkOverdueTasks() },
        { name: "Inactive Students", check: () => storage.checkInactiveStudents() },
        { name: "Project Risks", check: () => storage.checkProjectRisks() },
        { name: "Velocity Drops", check: () => storage.checkVelocityDrops() },
        { name: "Blocked Tasks", check: () => storage.checkTasksBlocked() },
      ];

      for (const { name, check } of alertChecks) {
        try {
          console.log(`🔍 Checking ${name}...`);
          const alerts = await check();
          
          if (alerts.length > 0) {
            console.log(`📢 Generated ${alerts.length} alerts for ${name}`);
            allGeneratedAlerts.push(...alerts);

            // Create notifications for professors/admins
            for (const alert of alerts) {
              await this.createNotificationsForAlert(alert);
            }
          } else {
            console.log(`✅ No alerts needed for ${name}`);
          }
        } catch (error) {
          console.error(`❌ Error checking ${name}:`, error);
        }
      }

      console.log(`🎯 Alert generation complete. Total alerts: ${allGeneratedAlerts.length}`);
      return allGeneratedAlerts;

    } catch (error) {
      console.error("❌ Critical error in alert generation:", error);
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  private async createNotificationsForAlert(alert: Alert): Promise<void> {
    try {
      // Get all professors and admins to notify
      const professors = await storage.getUsersByRole('professor');
      const admins = await storage.getUsersByRole('admin');
      const recipients = [...professors, ...admins];

      // Create notifications for each recipient
      for (const recipient of recipients) {
        try {
          await notificationService.createNotification({
            userId: recipient.id,
            title: alert.title,
            message: alert.message,
            type: 'alert',
            relatedEntityType: this.getEntityTypeFromAlert(alert),
            relatedEntityId: this.getEntityIdFromAlert(alert),
            metadata: {
              alertId: alert.id,
              alertType: alert.type,
              severity: alert.severity,
              originalData: alert.data,
            },
          });
          
          console.log(`📬 Created notification for ${recipient.firstName} ${recipient.lastName} about ${alert.type}`);
        } catch (error) {
          console.error(`❌ Failed to create notification for ${recipient.id}:`, error);
        }
      }
    } catch (error) {
      console.error("❌ Error creating notifications for alert:", error);
    }
  }

  private getEntityTypeFromAlert(alert: Alert): string {
    if (alert.taskId) return 'task';
    if (alert.projectId) return 'project';
    if (alert.userId) return 'user';
    return 'system';
  }

  private getEntityIdFromAlert(alert: Alert): string | null {
    return alert.taskId || alert.projectId || alert.userId || null;
  }

  async resolveAlert(alertId: string, resolvedBy: string, reason?: string): Promise<void> {
    try {
      await storage.resolveAlert(alertId, resolvedBy);
      
      // Optional: Create a follow-up notification that the alert was resolved
      console.log(`✅ Alert ${alertId} resolved by ${resolvedBy}${reason ? `: ${reason}` : ''}`);
    } catch (error) {
      console.error(`❌ Error resolving alert ${alertId}:`, error);
      throw error;
    }
  }

  async getActiveAlertsWithContext(): Promise<any[]> {
    try {
      const alerts = await storage.getActiveAlerts();
      
      // Enhance alerts with additional context
      const enhancedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          const enhanced: any = { ...alert };

          // Add student context if available
          if (alert.userId) {
            try {
              const student = await storage.getUser(alert.userId);
              enhanced.studentName = student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
              enhanced.studentEmail = student?.email;
            } catch (error) {
              console.error(`Error fetching student ${alert.userId}:`, error);
            }
          }

          // Add project context if available
          if (alert.projectId) {
            try {
              const project = await storage.getProject(alert.projectId);
              enhanced.projectName = project?.name || 'Unknown Project';
            } catch (error) {
              console.error(`Error fetching project ${alert.projectId}:`, error);
            }
          }

          // Add task context if available
          if (alert.taskId) {
            try {
              const task = await storage.getTask(alert.taskId);
              enhanced.taskTitle = task?.title || 'Unknown Task';
            } catch (error) {
              console.error(`Error fetching task ${alert.taskId}:`, error);
            }
          }

          return enhanced;
        })
      );

      return enhancedAlerts;
    } catch (error) {
      console.error("❌ Error getting active alerts with context:", error);
      return [];
    }
  }

  async initializeAlertSystem(): Promise<void> {
    try {
      console.log("🔧 Initializing alert system...");
      
      // Create default alert configurations if they don't exist
      await storage.createDefaultAlertConfigurations();
      
      console.log("✅ Alert system initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing alert system:", error);
      throw error;
    }
  }

  // Get alert statistics for dashboard
  async getAlertStatistics(): Promise<any> {
    try {
      const activeAlerts = await storage.getActiveAlerts();
      
      const stats = {
        total: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length,
        byType: {
          task_overdue: activeAlerts.filter(a => a.type === 'task_overdue').length,
          student_inactive: activeAlerts.filter(a => a.type === 'student_inactive').length,
          project_risk: activeAlerts.filter(a => a.type === 'project_risk').length,
          velocity_drop: activeAlerts.filter(a => a.type === 'velocity_drop').length,
          task_blocked: activeAlerts.filter(a => a.type === 'task_blocked').length,
        },
        recentTrend: {
          // Could calculate 24h vs previous 24h comparison
          direction: 'stable', // 'increasing' | 'decreasing' | 'stable'
          percentage: 0,
        }
      };

      return stats;
    } catch (error) {
      console.error("❌ Error getting alert statistics:", error);
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        byType: {},
        recentTrend: { direction: 'stable', percentage: 0 }
      };
    }
  }
}

export const alertService = new AlertService();
