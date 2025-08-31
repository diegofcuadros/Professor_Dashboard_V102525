import { storage } from './storage';
import { notificationService } from './notifications';

export class AINotificationService {
  
  async analyzeStudentProductivity(userId: string): Promise<{
    score: number;
    trends: string[];
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const [userTasks, userSchedules, userMetrics] = await Promise.all([
        storage.getUserTasks(userId),
        storage.getUserWorkSchedules(userId),
        storage.getUserMetrics(userId)
      ]);

      const currentDate = new Date();
      const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Task completion analysis
      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter(t => t.isCompleted).length;
      const overdueTasks = userTasks.filter(t => t.dueDate && new Date(t.dueDate) < currentDate && !t.isCompleted).length;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100;

      // Schedule adherence analysis
      const recentSchedules = userSchedules.filter(s => 
        s.weekStartDate && new Date(s.weekStartDate) >= oneWeekAgo
      );
      const scheduleSubmissionRate = recentSchedules.length > 0 ? 
        (recentSchedules.filter(s => s.status === 'submitted' || s.status === 'approved').length / recentSchedules.length) * 100 : 0;

      // Calculate productivity score
      let productivityScore = 0;
      productivityScore += taskCompletionRate * 0.4; // 40% weight
      productivityScore += Math.max(0, 100 - (overdueTasks * 10)) * 0.3; // 30% weight (penalty for overdue)
      productivityScore += scheduleSubmissionRate * 0.3; // 30% weight

      productivityScore = Math.min(100, Math.max(0, productivityScore));

      // Generate trends
      const trends: string[] = [];
      if (taskCompletionRate > 80) trends.push("High task completion rate");
      if (taskCompletionRate < 50) trends.push("Low task completion rate");
      if (overdueTasks > 0) trends.push(`${overdueTasks} overdue tasks`);
      if (scheduleSubmissionRate > 80) trends.push("Consistent schedule submission");
      if (scheduleSubmissionRate < 50) trends.push("Irregular schedule submission");

      // Generate recommendations
      const recommendations: string[] = [];
      if (overdueTasks > 0) recommendations.push("Focus on completing overdue tasks first");
      if (taskCompletionRate < 70) recommendations.push("Break down large tasks into smaller, manageable pieces");
      if (scheduleSubmissionRate < 70) recommendations.push("Set reminders to submit weekly schedules on time");
      if (productivityScore > 80) recommendations.push("Great work! Consider mentoring other team members");

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (productivityScore < 50 || overdueTasks > 3) riskLevel = 'high';
      else if (productivityScore < 70 || overdueTasks > 1) riskLevel = 'medium';

      return {
        score: Math.round(productivityScore),
        trends,
        recommendations,
        riskLevel
      };
    } catch (error) {
      console.error('Error analyzing student productivity:', error);
      return {
        score: 0,
        trends: ['Unable to analyze data'],
        recommendations: ['Contact your supervisor for assistance'],
        riskLevel: 'medium'
      };
    }
  }

  async detectAnomalies(userId: string): Promise<{
    anomalies: string[];
    severity: 'low' | 'medium' | 'high';
    suggestedActions: string[];
  }> {
    try {
      const userTasks = await storage.getUserTasks(userId);
      const userSchedules = await storage.getUserWorkSchedules(userId);
      
      const anomalies: string[] = [];
      let severity: 'low' | 'medium' | 'high' = 'low';
      const suggestedActions: string[] = [];

      // Check for sudden drop in activity
      const currentWeekTasks = userTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const previousWeekTasks = userTasks.filter(t => 
        t.dueDate && 
        new Date(t.dueDate) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
        new Date(t.dueDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (previousWeekTasks.length > 0 && currentWeekTasks.length < previousWeekTasks.length * 0.5) {
        anomalies.push("Significant drop in task activity detected");
        severity = 'medium';
        suggestedActions.push("Check in with student about workload and challenges");
      }

      // Check for missing schedule submissions
      const recentSchedules = userSchedules.filter(s => 
        s.weekStartDate && new Date(s.weekStartDate) >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      );
      const missingSchedules = recentSchedules.filter(s => s.status === 'draft' || !s.status);
      
      if (missingSchedules.length > 1) {
        anomalies.push("Multiple schedule submissions missing");
        severity = severity === 'low' ? 'medium' : 'high';
        suggestedActions.push("Remind student to submit weekly schedules");
      }

      // Check for pattern of late submissions
      const completedTasks = userTasks.filter(t => t.isCompleted);
      const lateTasks = completedTasks.filter(t => {
        // This is a simplified check - in a real system you'd track completion dates
        return t.dueDate && new Date(t.dueDate) < new Date();
      });

      if (lateTasks.length > completedTasks.length * 0.3) {
        anomalies.push("Pattern of late task completions detected");
        severity = severity === 'low' ? 'medium' : 'high';
        suggestedActions.push("Discuss time management strategies with student");
      }

      return { anomalies, severity, suggestedActions };
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return {
        anomalies: ['Error analyzing patterns'],
        severity: 'low',
        suggestedActions: ['Manual review recommended']
      };
    }
  }

  async generateIntelligentAlerts(): Promise<void> {
    try {
      console.log('🤖 Running AI notification analysis...');
      
      const students = await storage.getUsersByRole('student');
      
      for (const student of students) {
        if (!student.email || !student.isActive) continue;

        const [productivity, anomalies] = await Promise.all([
          this.analyzeStudentProductivity(student.id),
          this.detectAnomalies(student.id)
        ]);

        // Send productivity alerts for at-risk students
        if (productivity.riskLevel === 'high') {
          await notificationService.sendProductivityAlert(student.id, 'high_risk', {
            currentScore: productivity.score,
            targetScore: 85,
            suggestions: productivity.recommendations.join(', ')
          });
          
          // Notify professors about high-risk students
          const professors = await storage.getUsersByRole('professor');
          for (const professor of professors) {
            if (professor.email) {
              const professorMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                  <h3 style="color: #d73027;">⚠️ Student Alert: High Risk</h3>
                  <p><strong>Student:</strong> ${student.firstName} ${student.lastName} (${student.email})</p>
                  <p><strong>Productivity Score:</strong> ${productivity.score}/100</p>
                  <p><strong>Risk Level:</strong> ${productivity.riskLevel.toUpperCase()}</p>
                  <p><strong>Key Issues:</strong></p>
                  <ul>
                    ${productivity.trends.map(trend => `<li>${trend}</li>`).join('')}
                  </ul>
                  <p><strong>Recommended Actions:</strong></p>
                  <ul>
                    ${productivity.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                  </ul>
                </div>
              `;
              
              await notificationService.sendDirectMessage(
                'system',
                professor.id,
                `🚨 Student Alert: ${student.firstName} ${student.lastName}`,
                professorMessage
              );
            }
          }
        }

        // Send anomaly alerts
        if (anomalies.severity === 'high' && anomalies.anomalies.length > 0) {
          const professors = await storage.getUsersByRole('professor');
          for (const professor of professors) {
            if (professor.email) {
              const anomalyMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                  <h3 style="color: #fd8d3c;">📊 Anomaly Detection Alert</h3>
                  <p><strong>Student:</strong> ${student.firstName} ${student.lastName} (${student.email})</p>
                  <p><strong>Detected Anomalies:</strong></p>
                  <ul>
                    ${anomalies.anomalies.map(anomaly => `<li>${anomaly}</li>`).join('')}
                  </ul>
                  <p><strong>Suggested Actions:</strong></p>
                  <ul>
                    ${anomalies.suggestedActions.map(action => `<li>${action}</li>`).join('')}
                  </ul>
                </div>
              `;
              
              await notificationService.sendDirectMessage(
                'system',
                professor.id,
                `📊 Anomaly Alert: ${student.firstName} ${student.lastName}`,
                anomalyMessage
              );
            }
          }
        }

        // Send encouraging messages to high-performing students
        if (productivity.score > 85 && productivity.riskLevel === 'low') {
          const encouragementMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h3 style="color: #2ca02c;">🌟 Excellent Performance!</h3>
              <p>Hello ${student.firstName},</p>
              <p>Your productivity score is <strong>${productivity.score}/100</strong> - excellent work!</p>
              <p>Keep up the great momentum. Your consistent performance is inspiring!</p>
              <p>Best regards,<br/>DataProfessor AI Assistant</p>
            </div>
          `;
          
          await notificationService.sendDirectMessage(
            'system',
            student.id,
            '🌟 Great Work - Keep It Up!',
            encouragementMessage
          );
        }
      }
      
      console.log('✅ AI notification analysis completed');
    } catch (error) {
      console.error('❌ AI notification analysis failed:', error);
    }
  }

  async generateLabInsights(): Promise<{
    overallHealth: number;
    topPerformers: string[];
    atRiskStudents: string[];
    recommendations: string[];
  }> {
    try {
      const students = await storage.getUsersByRole('student');
      const performances: Array<{ id: string; name: string; score: number; risk: string }> = [];
      
      for (const student of students) {
        if (!student.isActive) continue;
        
        const productivity = await this.analyzeStudentProductivity(student.id);
        performances.push({
          id: student.id,
          name: `${student.firstName} ${student.lastName}` || student.email,
          score: productivity.score,
          risk: productivity.riskLevel
        });
      }
      
      const averageScore = performances.length > 0 
        ? performances.reduce((sum, p) => sum + p.score, 0) / performances.length 
        : 0;
      
      const topPerformers = performances
        .filter(p => p.score > 85)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(p => p.name);
      
      const atRiskStudents = performances
        .filter(p => p.risk === 'high' || p.risk === 'medium')
        .sort((a, b) => a.score - b.score)
        .map(p => `${p.name} (${p.score}/100)`);
      
      const recommendations: string[] = [];
      
      if (averageScore < 60) {
        recommendations.push("Overall lab performance is below target - consider team meeting");
      }
      if (atRiskStudents.length > performances.length * 0.3) {
        recommendations.push("High percentage of at-risk students - review workload distribution");
      }
      if (topPerformers.length > 0) {
        recommendations.push("Leverage top performers as mentors for struggling students");
      }
      
      return {
        overallHealth: Math.round(averageScore),
        topPerformers,
        atRiskStudents,
        recommendations
      };
    } catch (error) {
      console.error('Error generating lab insights:', error);
      return {
        overallHealth: 0,
        topPerformers: [],
        atRiskStudents: [],
        recommendations: ['Error analyzing lab performance - manual review needed']
      };
    }
  }
}

export const aiNotificationService = new AINotificationService();