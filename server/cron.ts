import cron from 'node-cron';
import { storage } from './storage';
import { sendEmail } from './email';
import { notificationService } from './notifications';
import { aiNotificationService } from './ai-notifications';
import { alertService } from './alertService';
import { WebSocketService } from './websocket';

export function setupWeeklyDigest() {
  const cronExpr = process.env.DIGEST_CRON || '0 8 * * MON';

  const job = async () => {
    try {
      const users = await storage.getAllUsers();

      for (const user of users) {
        if (!user.email || !user.isActive) continue;

        const tasks = await storage.getUserTasks(user.id);
        const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.isCompleted);
        const completed = tasks.filter(t => t.isCompleted);
        const pending = tasks.filter(t => !t.isCompleted);

        const schedules = await storage.getUserWorkSchedules(user.id);
        const userMetrics = await storage.getUserMetrics(user.id);

        const digestData = {
          weekStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          weekEndDate: new Date().toLocaleDateString(),
          completedTasks: completed.length,
          pendingTasks: pending.length,
          hoursWorked: userMetrics?.hoursThisWeek || 0,
          productivityScore: userMetrics?.productivityScore || 0,
          upcomingDeadlines: tasks
            .filter(t => t.dueDate && new Date(t.dueDate) > new Date() && !t.isCompleted)
            .map(t => ({ title: t.title, dueDate: t.dueDate }))
            .slice(0, 5),
          achievements: userMetrics?.achievements || []
        };

        await notificationService.sendWeeklyDigest(user.id, digestData);
      }
    } catch (err) {
      console.error('[cron] weekly digest failed:', err);
    }
  };

  cron.schedule(cronExpr, job, { timezone: 'UTC' });
}

export function setupOverdueTaskNotifications() {
  // Run daily at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running overdue task notification job...');
    
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        if (!user.email || !user.isActive) continue;
        
        const userTasks = await storage.getUserTasks(user.id);
        
        for (const task of userTasks) {
          if (task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted) {
            await notificationService.notifyTaskOverdue(task.id);
          }
        }
      }
      
      console.log('✅ Overdue task notifications completed');
    } catch (error) {
      console.error('❌ Overdue task notifications error:', error);
    }
  }, { timezone: 'UTC' });
}

export function setupProductivityAlerts() {
  // Run every weekday at 5 PM
  cron.schedule('0 17 * * 1-5', async () => {
    console.log('⏰ Running AI-powered productivity alerts job...');
    
    try {
      // Use AI service for intelligent analysis
      await aiNotificationService.generateIntelligentAlerts();
      
      console.log('✅ AI productivity alerts completed');
    } catch (error) {
      console.error('❌ AI productivity alerts error:', error);
    }
  }, { timezone: 'UTC' });
}

export function setupLabInsightsReport() {
  // Run every Friday at 4 PM to generate weekly lab insights
  cron.schedule('0 16 * * 5', async () => {
    console.log('⏰ Generating weekly lab insights report...');
    
    try {
      const insights = await aiNotificationService.generateLabInsights();
      const professors = await storage.getUsersByRole('professor');
      
      for (const professor of professors) {
        if (!professor.email || !professor.isActive) continue;
        
        const insightsHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
            <h2 style="color: #2c3e50;">🧠 Weekly Lab Intelligence Report</h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #27ae60;">📊 Overall Lab Health</h3>
              <div style="font-size: 24px; font-weight: bold; color: ${insights.overallHealth > 75 ? '#27ae60' : insights.overallHealth > 50 ? '#f39c12' : '#e74c3c'};">
                ${insights.overallHealth}/100
              </div>
            </div>
            
            ${insights.topPerformers.length > 0 ? `
              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #27ae60;">🌟 Top Performers</h3>
                <ul>
                  ${insights.topPerformers.map(name => `<li>${name}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            ${insights.atRiskStudents.length > 0 ? `
              <div style="background: #ffeaea; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #e74c3c;">⚠️ Students Needing Attention</h3>
                <ul>
                  ${insights.atRiskStudents.map(student => `<li>${student}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976d2;">💡 AI Recommendations</h3>
              <ul>
                ${insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="font-size: 12px; color: #666;">
                This report was generated automatically by the DataProfessor AI system.
                <br/>Report generated on ${new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        `;
        
        await sendEmail(
          professor.email,
          '🧠 Weekly Lab Intelligence Report',
          insightsHtml
        );
      }
      
      console.log('✅ Weekly lab insights report completed');
    } catch (error) {
      console.error('❌ Lab insights report error:', error);
    }
  }, { timezone: 'UTC' });
}

export function setupAlertGeneration() {
  console.log('🚨 Setting up automated alert generation...');
  
  // Alert generation - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('🚨 Running automated alert generation...');
    
    try {
      await alertService.generateAlerts();
    } catch (error) {
      console.error('❌ Error in automated alert generation:', error);
    }
  }, { timezone: 'UTC' });
}

// Phase 2: reminder dispatcher
export function setupTaskReminderDispatcher() {
  // Check every 2 minutes for due reminders
  cron.schedule('*/2 * * * *', async () => {
    try {
      const dueTasks = await storage.getTasksWithDueReminders(new Date());
      if (!dueTasks.length) return;

      const ws = WebSocketService.getInstance();

      for (const task of dueTasks) {
        // find assignees for the task
        const assignees = await storage.getTaskAssignees(task.id);
        for (const user of assignees) {
          // create in-app notification
          await notificationService.createNotification({
            userId: user.id,
            title: `Task reminder: ${task.title}`,
            message: `Reminder for task "${task.title}" due ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}`,
            type: 'reminder',
            relatedEntityType: 'task',
            relatedEntityId: task.id,
            metadata: { priority: 'medium' }
          });

          // broadcast realtime update
          ws.broadcastUpdate('task.reminder', { taskId: task.id, userId: user.id });
        }

        // clear reminder to avoid duplicate sends
        await storage.setTaskReminder(task.id, null as unknown as Date, 'system');
      }
    } catch (err) {
      console.error('❌ Task reminder dispatcher error:', err);
    }
  }, { timezone: 'UTC' });
}
