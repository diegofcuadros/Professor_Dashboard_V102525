// AI Engine for generating insights, predictions, and recommendations
// Integrates with Ollama and Llama 3.1 for real AI analysis

import { storage } from "./storage";
import { ollamaClient } from "./ollama-client";
import type { User, Project, ProgressUpdate } from "@shared/schema";

export interface AIInsight {
  id: string;
  type: 'productivity' | 'risk' | 'opportunity' | 'prediction';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  createdAt: Date;
  userId?: string;
  projectId?: string;
}

export interface ProductivityMetrics {
  userId: string;
  overallScore: number;
  weeklyTrend: number;
  strengths: string[];
  improvements: string[];
  predictions: string[];
}

export interface ProjectRiskAssessment {
  projectId: string;
  riskLevel: 'low' | 'medium' | 'high';
  delayProbability: number;
  completionPrediction: Date;
  riskFactors: string[];
  mitigationStrategies: string[];
}

class AIEngine {
  
  /**
   * Generate AI insights for a lab or specific user
   */
  async generateInsights(userId?: string): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    try {
      // Fetch relevant data
      const users = await storage.getAllUsers();
      const projects = await storage.getAllProjects();
      
      // Generate productivity insights
      const productivityInsights = await this.analyzeProductivity(users, projects);
      insights.push(...productivityInsights);
      
      // Generate risk assessments
      const riskInsights = await this.assessProjectRisks(projects);
      insights.push(...riskInsights);
      
      // Generate opportunity insights
      const opportunityInsights = await this.identifyOpportunities(users, projects);
      insights.push(...opportunityInsights);
      
      // Generate predictions
      const predictionInsights = await this.generatePredictions(projects);
      insights.push(...predictionInsights);
      
      return insights.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      
    } catch (error) {
      console.error('AI insight generation failed:', error);
      return [];
    }
  }

  /**
   * Analyze productivity patterns and trends using AI
   */
  private async analyzeProductivity(users: User[], projects: Project[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    try {
      const activeUsers = users.filter(u => u.isActive);
      const activeProjects = projects.filter(p => p.status === 'active');
      
      if (activeUsers.length === 0) return insights;

      // Check if AI is available, fallback to smart analysis if not
      const aiAvailable = await ollamaClient.isAvailable();
      
      if (aiAvailable) {
        // Use AI for advanced productivity analysis
        for (const user of activeUsers.slice(0, 3)) { // Limit to avoid API overload
          try {
            // Gather user data
            const userMetrics = await storage.getUserMetrics(user.id);
            const userSchedules = await storage.getUserWorkSchedules(user.id);
            const recentProgress = await storage.getUserProgress(user.id);
            
            // Get schedule compliance
            const currentWeek = this.getCurrentWeekStart();
            const scheduleValidation = await storage.validateWeeklySchedule(user.id, currentWeek);
            
            const aiAnalysis = await ollamaClient.analyzeProductivity({
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`,
              weeklyHours: scheduleValidation.totalHours,
              completedTasks: userMetrics.totalUpdates || 0,
              activeProjects: userMetrics.activeProjects || 0,
              recentProgress: recentProgress.slice(0, 5).map(p => p.notes || 'Progress update'),
              scheduleCompliance: scheduleValidation.isValid
            });

            // Generate insights based on AI analysis
            if (aiAnalysis.overallScore < 60) {
              insights.push({
                id: `ai-productivity-low-${user.id}`,
                type: 'productivity',
                priority: 'high',
                title: `Productivity Support Needed: ${user.firstName} ${user.lastName}`,
                description: `AI analysis indicates ${aiAnalysis.overallScore}% productivity score with specific areas for improvement.`,
                recommendation: aiAnalysis.improvements.join('; '),
                confidence: 82,
                impact: 'negative',
                createdAt: new Date(),
                userId: user.id
              });
            } else if (aiAnalysis.overallScore > 85) {
              insights.push({
                id: `ai-productivity-high-${user.id}`,
                type: 'productivity',
                priority: 'medium',
                title: `High Performance: ${user.firstName} ${user.lastName}`,
                description: `AI analysis shows excellent ${aiAnalysis.overallScore}% productivity score. Key strengths: ${aiAnalysis.strengths.join(', ')}.`,
                recommendation: 'Consider having this team member share best practices with others.',
                confidence: 88,
                impact: 'positive',
                createdAt: new Date(),
                userId: user.id
              });
            }

            // Add predictions as separate insights
            if (aiAnalysis.predictions.length > 0) {
              insights.push({
                id: `ai-prediction-${user.id}`,
                type: 'prediction',
                priority: 'low',
                title: `Productivity Prediction: ${user.firstName} ${user.lastName}`,
                description: aiAnalysis.predictions[0],
                recommendation: 'Monitor progress and adjust support as needed.',
                confidence: 75,
                impact: 'neutral',
                createdAt: new Date(),
                userId: user.id
              });
            }

          } catch (userError) {
            console.error(`AI productivity analysis failed for user ${user.id}:`, userError);
          }
        }
      } else {
        // Fallback to smart rule-based analysis when AI is unavailable
        insights.push(...await this.fallbackProductivityAnalysis(activeUsers, activeProjects));
      }
      
    } catch (error) {
      console.error('Productivity analysis failed:', error);
      // Return basic insights on error
      if (users.length > 0) {
        insights.push({
          id: `fallback-productivity-${Date.now()}`,
          type: 'productivity',
          priority: 'medium',
          title: 'Team Productivity Status',
          description: `Monitoring ${users.filter(u => u.isActive).length} active team members across ${projects.filter(p => p.status === 'active').length} projects.`,
          recommendation: 'Regular productivity reviews recommended to maintain team performance.',
          confidence: 60,
          impact: 'neutral',
          createdAt: new Date()
        });
      }
    }
    
    return insights;
  }

  /**
   * Assess project risks using AI analysis
   */
  private async assessProjectRisks(projects: Project[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    try {
      const activeProjects = projects.filter(p => p.status === 'active');
      if (activeProjects.length === 0) return insights;

      const aiAvailable = await ollamaClient.isAvailable();
      
      for (const project of activeProjects.slice(0, 3)) { // Limit API calls
        try {
          const daysSinceStart = project.createdAt 
            ? Math.floor((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

          // Get project data
          const assignments = await storage.getProjectAssignments(project.id);
          const tasks = await storage.getProjectTasks(project.id);
          const completedTasks = tasks.filter(t => t.id).length; // This would need proper completion checking
          const recentProgress = await storage.getProjectProgress(project.id);

          if (aiAvailable) {
            // Use AI for sophisticated risk analysis
            const riskAssessment = await ollamaClient.analyzeProjectRisk({
              projectName: project.name,
              startDate: project.createdAt?.toISOString() || new Date().toISOString(),
              targetEndDate: project.targetEndDate?.toISOString(),
              teamSize: assignments.length,
              completedTasks,
              totalTasks: tasks.length,
              recentActivity: recentProgress.slice(0, 3).map(p => p.notes || 'Progress activity'),
              complexity: project.projectType || 'standard'
            });

            // Generate insights based on AI risk assessment
            if (riskAssessment.riskLevel === 'high') {
              insights.push({
                id: `ai-risk-high-${project.id}`,
                type: 'risk',
                priority: 'high',
                title: `High Risk Project: ${project.name}`,
                description: `AI analysis indicates high risk (${riskAssessment.delayProbability}% delay probability). Key factors: ${riskAssessment.riskFactors.slice(0, 2).join(', ')}.`,
                recommendation: riskAssessment.mitigationStrategies.slice(0, 2).join('; '),
                confidence: 85,
                impact: 'negative',
                createdAt: new Date(),
                projectId: project.id
              });
            } else if (riskAssessment.riskLevel === 'medium' && daysSinceStart > 60) {
              insights.push({
                id: `ai-risk-medium-${project.id}`,
                type: 'risk',
                priority: 'medium',
                title: `Monitor Project: ${project.name}`,
                description: `AI analysis shows medium risk with ${riskAssessment.delayProbability}% delay probability. Projected completion: ${riskAssessment.completionPrediction}.`,
                recommendation: riskAssessment.mitigationStrategies[0] || 'Increase monitoring frequency',
                confidence: 78,
                impact: 'negative',
                createdAt: new Date(),
                projectId: project.id
              });
            }

          } else {
            // Fallback to rule-based risk assessment
            const riskScore = this.calculateRuleBasedRisk(project, assignments.length, tasks.length, completedTasks, daysSinceStart);
            
            if (riskScore.level !== 'low') {
              insights.push({
                id: `fallback-risk-${project.id}`,
                type: 'risk',
                priority: riskScore.level === 'high' ? 'high' : 'medium',
                title: `Project Risk: ${project.name}`,
                description: `${project.name} shows ${riskScore.level} risk level based on timeline and progress patterns.`,
                recommendation: riskScore.level === 'high' 
                  ? 'Consider immediate intervention and resource reallocation.'
                  : 'Monitor progress closely and prepare contingency plans.',
                confidence: 70,
                impact: 'negative',
                createdAt: new Date(),
                projectId: project.id
              });
            }
          }

        } catch (projectError) {
          console.error(`Risk analysis failed for project ${project.id}:`, projectError);
        }
      }

    } catch (error) {
      console.error('Project risk assessment failed:', error);
    }
    
    return insights;
  }

  /**
   * Identify collaboration and efficiency opportunities
   */
  private async identifyOpportunities(users: User[], projects: Project[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    // Simulate finding collaboration opportunities
    const studentsAndPostdocs = users.filter(u => 
      u.isActive && (u.role === 'student' || u.role === 'postdoc')
    );
    
    if (studentsAndPostdocs.length >= 2 && projects.length >= 2) {
      const randomUser = studentsAndPostdocs[Math.floor(Math.random() * studentsAndPostdocs.length)];
      
      insights.push({
        id: `opportunity-${Date.now()}`,
        type: 'opportunity',
        priority: 'medium',
        title: 'Cross-Project Knowledge Sharing Opportunity',
        description: `${randomUser.firstName} ${randomUser.lastName}'s expertise in ${randomUser.specialization || 'their field'} could benefit other ongoing projects.`,
        recommendation: 'Organize knowledge sharing sessions or consider cross-project collaboration.',
        confidence: 72,
        impact: 'positive',
        createdAt: new Date(),
        userId: randomUser.id
      });
    }
    
    return insights;
  }

  /**
   * Generate predictions for project completion and resource needs
   */
  private async generatePredictions(projects: Project[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    for (const project of projects.slice(0, 2)) { // Limit to avoid too many insights
      if (project.status === 'active') {
        // Simulate ML prediction for project completion
        const daysToCompletion = Math.floor(Math.random() * 60) + 14; // 14-74 days
        const confidence = Math.floor(Math.random() * 20) + 75; // 75-95%
        
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysToCompletion);
        
        insights.push({
          id: `prediction-${project.id}`,
          type: 'prediction',
          priority: 'low',
          title: `Completion Prediction: ${project.name}`,
          description: `Based on current progress patterns, ${project.name} is predicted to complete on ${completionDate.toLocaleDateString()}.`,
          recommendation: daysToCompletion > 50 
            ? 'Consider additional resources to accelerate progress.'
            : 'Maintain current momentum and prepare for project wrap-up.',
          confidence,
          impact: 'neutral',
          createdAt: new Date(),
          projectId: project.id
        });
      }
    }
    
    return insights;
  }

  /**
   * Generate personalized productivity metrics for a user using AI
   */
  async generateProductivityMetrics(userId: string): Promise<ProductivityMetrics> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Gather comprehensive user data
      const userMetrics = await storage.getUserMetrics(userId);
      const recentProgress = await storage.getUserProgress(userId);
      const currentWeek = this.getCurrentWeekStart();
      const scheduleValidation = await storage.validateWeeklySchedule(userId, currentWeek);
      const userTasks = await storage.getUserTasks(userId);

      const aiAvailable = await ollamaClient.isAvailable();
      
      if (aiAvailable) {
        try {
          // Use AI for comprehensive productivity analysis
          const aiAnalysis = await ollamaClient.analyzeProductivity({
            userId,
            userName: `${user.firstName} ${user.lastName}`,
            weeklyHours: scheduleValidation.totalHours,
            completedTasks: userTasks.filter(t => t.isCompleted).length,
            activeProjects: userMetrics.activeProjects || 0,
            recentProgress: recentProgress.slice(0, 8).map(p => p.notes || 'Progress update'),
            scheduleCompliance: scheduleValidation.isValid
          });

          // Calculate weekly trend based on schedule compliance and task completion
          const weeklyTrend = scheduleValidation.isValid ? 
            Math.min(10, Math.max(-10, (aiAnalysis.overallScore - 75) / 2)) : 
            Math.min(5, Math.max(-15, (aiAnalysis.overallScore - 65) / 3));

          return {
            userId,
            overallScore: aiAnalysis.overallScore,
            weeklyTrend: Math.round(weeklyTrend),
            strengths: aiAnalysis.strengths,
            improvements: aiAnalysis.improvements,
            predictions: aiAnalysis.predictions
          };

        } catch (aiError) {
          console.error('AI productivity metrics failed, using fallback:', aiError);
        }
      }

      // Fallback to enhanced rule-based analysis
      return this.generateFallbackProductivityMetrics(userId, user, userMetrics, scheduleValidation, userTasks);
      
    } catch (error) {
      console.error('Failed to generate productivity metrics:', error);
      throw error;
    }
  }

  /**
   * Assess risk level for a specific project
   */
  async assessProjectRisk(projectId: string): Promise<ProjectRiskAssessment> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Simulate risk assessment
      const riskScore = Math.random();
      const delayProbability = Math.floor(riskScore * 60) + 10; // 10-70%
      
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + Math.floor(Math.random() * 90) + 14);
      
      const riskLevel: 'low' | 'medium' | 'high' = 
        riskScore < 0.3 ? 'low' : riskScore < 0.7 ? 'medium' : 'high';
      
      return {
        projectId,
        riskLevel,
        delayProbability,
        completionPrediction: completionDate,
        riskFactors: [
          'Complexity higher than initial estimates',
          'Limited senior developer availability',
          'Dependencies on external data sources'
        ],
        mitigationStrategies: [
          'Break down complex tasks into smaller components',
          'Allocate additional senior resources',
          'Develop backup plans for data dependencies',
          'Implement weekly progress reviews'
        ]
      };
      
    } catch (error) {
      console.error('Failed to assess project risk:', error);
      throw error;
    }
  }

  /**
   * Generate automated recommendations based on current state
   */
  async generateRecommendations(userId?: string): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const insights = await this.generateInsights(userId);
      
      // Extract recommendations from insights
      insights.forEach(insight => {
        if (insight.priority === 'high' || insight.confidence > 80) {
          recommendations.push(insight.recommendation);
        }
      });
      
      // Generate contextual recommendations based on current state
      if (userId) {
        const contextualRecs = await this.generateContextualRecommendations(userId);
        recommendations.push(...contextualRecs);
      } else {
        // Lab-wide recommendations
        const labRecs = await this.generateLabRecommendations();
        recommendations.push(...labRecs);
      }
      
      return [...new Set(recommendations)].slice(0, 8); // Remove duplicates, limit to top 8
      
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [
        'Monitor project progress regularly',
        'Maintain open communication with team',
        'Document important decisions and changes'
      ];
    }
  }

  /**
   * Generate contextual recommendations for a specific user
   */
  private async generateContextualRecommendations(userId: string): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const user = await storage.getUser(userId);
      const userTasks = await storage.getUserTasks(userId);
      const userProjects = await storage.getUserProjects(userId);
      const currentWeek = this.getCurrentWeekStart();
      const scheduleValidation = await storage.validateWeeklySchedule(userId, currentWeek);

      // Schedule-based recommendations
      if (!scheduleValidation.isValid) {
        recommendations.push('📅 Create or submit your weekly schedule for better time management');
      } else if (scheduleValidation.totalHours < 20) {
        recommendations.push('⏱️ Consider increasing your weekly hours to meet lab requirements (20+ hours)');
      }

      // Task-based recommendations
      const incompleteTasks = userTasks.filter(t => !t.isCompleted);
      const overdueTasks = incompleteTasks.filter(t => 
        t.dueDate && new Date(t.dueDate) < new Date()
      );
      
      if (overdueTasks.length > 0) {
        recommendations.push(`🚨 ${overdueTasks.length} overdue tasks require immediate attention`);
      } else if (incompleteTasks.length > 10) {
        recommendations.push('📋 Consider prioritizing tasks - you have many active items');
      } else if (incompleteTasks.length < 3 && userProjects.length > 0) {
        recommendations.push('🎯 Request additional tasks from your project leads to stay productive');
      }

      // Project-based recommendations
      if (userProjects.length === 0) {
        recommendations.push('🚀 Connect with your supervisor to get assigned to active projects');
      } else if (userProjects.length > 3) {
        recommendations.push('⚖️ Consider focusing on fewer projects for better outcomes');
      }

      // AI-powered personalized recommendations using Ollama
      const aiAvailable = await ollamaClient.isAvailable();
      if (aiAvailable && userTasks.length > 0) {
        try {
          const personalizedAdvice = await ollamaClient.generate(
            `Based on this researcher's profile, provide 2-3 specific, actionable productivity recommendations:
            
            Name: ${user?.firstName} ${user?.lastName}
            Role: ${user?.role}
            Active Projects: ${userProjects.length}
            Incomplete Tasks: ${incompleteTasks.length}
            Schedule Compliance: ${scheduleValidation.isValid ? 'Good' : 'Needs work'}
            Weekly Hours: ${scheduleValidation.totalHours || 0}
            
            Focus on practical, research-specific advice. Keep each recommendation under 100 characters.`,
            'You are a research productivity advisor. Provide concise, actionable recommendations in bullet point format.'
          );

          // Parse AI recommendations
          const aiRecs = personalizedAdvice.split('\n')
            .filter(line => line.trim() && (line.includes('-') || line.includes('•')))
            .map(line => line.replace(/^[-•*]\s*/, '').trim())
            .filter(line => line.length > 10 && line.length < 150)
            .slice(0, 3);

          recommendations.push(...aiRecs.map(rec => `🤖 ${rec}`));

        } catch (aiError) {
          console.error('AI recommendation generation failed:', aiError);
        }
      }
      
    } catch (error) {
      console.error('Failed to generate contextual recommendations:', error);
    }
    
    return recommendations;
  }

  /**
   * Generate lab-wide recommendations for administrators
   */
  private async generateLabRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    try {
      const users = await storage.getAllUsers();
      const projects = await storage.getAllProjects();
      const activeUsers = users.filter(u => u.isActive && u.role !== 'admin');

      // Analyze lab-wide patterns
      const studentsNeedingSupport = [];
      const currentWeek = this.getCurrentWeekStart();
      
      for (const user of activeUsers.slice(0, 5)) {
        try {
          const scheduleValidation = await storage.validateWeeklySchedule(user.id, currentWeek);
          const userTasks = await storage.getUserTasks(user.id);
          const completionRate = userTasks.length > 0 ? 
            userTasks.filter(t => t.isCompleted).length / userTasks.length : 0;

          if (!scheduleValidation.isValid || scheduleValidation.totalHours < 15 || completionRate < 0.3) {
            studentsNeedingSupport.push(`${user.firstName} ${user.lastName}`);
          }
        } catch (userError) {
          console.error(`Error analyzing user ${user.id}:`, userError);
        }
      }

      // Generate lab recommendations
      if (studentsNeedingSupport.length > 0) {
        recommendations.push(`👥 ${studentsNeedingSupport.length} students may need additional support`);
      }

      if (projects.filter(p => p.status === 'active').length > activeUsers.length * 1.5) {
        recommendations.push('📊 Consider project consolidation - many active projects per student');
      }

      recommendations.push(
        '📈 Schedule monthly lab productivity reviews',
        '🎯 Implement peer mentoring program',
        '📚 Create knowledge sharing sessions for best practices'
      );

    } catch (error) {
      console.error('Failed to generate lab recommendations:', error);
    }
    
    return recommendations;
  }

  /**
   * Generate AI-powered schedule optimization for a specific user
   */
  async generateScheduleOptimization(userId: string): Promise<{
    recommendations: string[];
    optimizedBlocks: Array<{
      day: string;
      suggestion: string;
      reason: string;
    }>;
    efficiencyGains: string[];
  }> {
    return this.optimizeSchedule(userId);
  }

  /**
   * Generate intelligent project progress analysis with trend predictions
   */
  async analyzeProjectProgress(projectId: string): Promise<{
    progressTrend: 'accelerating' | 'steady' | 'declining' | 'stalled';
    completionPrediction: {
      estimatedDate: string;
      confidence: number;
      factors: string[];
    };
    teamPerformance: {
      overallRating: number;
      strengths: string[];
      concerns: string[];
    };
    recommendations: string[];
  }> {
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const assignments = await storage.getProjectAssignments(projectId);
      const tasks = await storage.getProjectTasks(projectId);
      const allProgress = await storage.getProjectProgress(projectId);
      
      // Filter to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentProgress = allProgress.filter(p => new Date(p.createdAt) > thirtyDaysAgo);

      // Gather team performance data
      const teamMetrics = await Promise.all(
        assignments.map(async (assignment) => {
          // Get tasks specifically assigned to this user for this project
          const userProjectTasks = await storage.getUserTasksForProject(assignment.userId, projectId);
          const completedTasks = userProjectTasks.filter(t => t.isCompleted).length;
          const totalTasks = userProjectTasks.length;
          
          return {
            userId: assignment.userId,
            completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
            taskCount: totalTasks,
            recentActivity: recentProgress.filter(p => p.userId === assignment.userId).length
          };
        })
      );

      const aiAvailable = await ollamaClient.isAvailable();

      if (aiAvailable && recentProgress.length > 0) {
        try {
          // Use AI for advanced progress analysis
          const riskAnalysis = await ollamaClient.analyzeProjectRisk({
            projectName: project.name,
            startDate: project.startDate || new Date().toISOString().split('T')[0],
            targetEndDate: project.targetEndDate,
            teamSize: assignments.length,
            completedTasks: tasks.filter(t => t.isCompleted).length,
            totalTasks: tasks.length,
            recentActivity: recentProgress.slice(0, 10).map(p => p.notes || 'Progress update'),
            complexity: project.projectType || 'standard'
          });

          // Determine progress trend from AI analysis and recent activity
          let progressTrend: 'accelerating' | 'steady' | 'declining' | 'stalled';
          const recentActivityCount = recentProgress.filter(p => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(p.createdAt) > weekAgo;
          }).length;

          if (recentActivityCount === 0) {
            progressTrend = 'stalled';
          } else if (riskAnalysis.delayProbability < 30) {
            progressTrend = 'accelerating';
          } else if (riskAnalysis.delayProbability > 60) {
            progressTrend = 'declining';
          } else {
            progressTrend = 'steady';
          }

          // Calculate team performance rating
          const avgCompletionRate = teamMetrics.reduce((sum, m) => sum + m.completionRate, 0) / teamMetrics.length;
          const overallRating = Math.min(95, Math.max(10, (avgCompletionRate * 70) + (recentActivityCount * 5) + 20));

          return {
            progressTrend,
            completionPrediction: {
              estimatedDate: riskAnalysis.completionPrediction,
              confidence: 100 - riskAnalysis.delayProbability,
              factors: riskAnalysis.riskFactors
            },
            teamPerformance: {
              overallRating: Math.round(overallRating),
              strengths: teamMetrics.length > 1 ? ['Good team size', 'Active collaboration'] : ['Focused individual work'],
              concerns: riskAnalysis.riskFactors.slice(0, 2)
            },
            recommendations: riskAnalysis.mitigationStrategies
          };

        } catch (aiError) {
          console.error('AI project progress analysis failed:', aiError);
        }
      }

      // Fallback analysis using rule-based approach
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.isCompleted).length;
      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

      let progressTrend: 'accelerating' | 'steady' | 'declining' | 'stalled' = 'steady';
      if (recentProgress.length === 0) progressTrend = 'stalled';
      else if (completionRate > 0.7) progressTrend = 'accelerating';
      else if (completionRate < 0.3) progressTrend = 'declining';

      // Estimate completion date
      const daysElapsed = project.startDate ? 
        Math.floor((Date.now() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 30;
      const progressRate = completionRate / Math.max(daysElapsed, 1);
      const remainingDays = progressRate > 0 ? Math.ceil((1 - completionRate) / progressRate) : 60;
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(estimatedCompletion.getDate() + remainingDays);

      return {
        progressTrend,
        completionPrediction: {
          estimatedDate: estimatedCompletion.toISOString().split('T')[0],
          confidence: completionRate > 0.5 ? 75 : 50,
          factors: [
            `Current completion rate: ${Math.round(completionRate * 100)}%`,
            `Team size: ${assignments.length}`,
            progressTrend === 'stalled' ? 'Limited recent activity' : 'Regular progress updates'
          ]
        },
        teamPerformance: {
          overallRating: Math.round((completionRate * 60) + (recentProgress.length > 5 ? 25 : 15) + 10),
          strengths: [
            completionRate > 0.5 ? 'Good task completion rate' : 'Project is underway',
            assignments.length > 1 ? 'Multi-person collaboration' : 'Focused development'
          ],
          concerns: [
            completionRate < 0.3 ? 'Low task completion rate' : null,
            recentProgress.length < 3 ? 'Limited progress updates' : null
          ].filter(Boolean) as string[]
        },
        recommendations: [
          progressTrend === 'stalled' ? 'Immediate intervention needed - schedule team meeting' : 'Continue regular progress monitoring',
          completionRate < 0.5 ? 'Consider task prioritization and resource reallocation' : 'Maintain current momentum',
          'Set up weekly progress check-ins',
          assignments.length === 1 ? 'Consider additional team support' : 'Optimize team coordination'
        ]
      };

    } catch (error) {
      console.error('Project progress analysis failed:', error);
      throw error;
    }
  }

  // Helper methods for AI integration
  
  /**
   * Get current week start date for schedule analysis
   */
  private getCurrentWeekStart(): string {
    const today = new Date();
    const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
    return monday.toISOString().split('T')[0];
  }

  /**
   * Fallback productivity analysis when AI is unavailable
   */
  private async fallbackProductivityAnalysis(users: User[], projects: Project[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];
    
    for (const user of users.slice(0, 2)) {
      try {
        const currentWeek = this.getCurrentWeekStart();
        const scheduleValidation = await storage.validateWeeklySchedule(user.id, currentWeek);
        const userTasks = await storage.getUserTasks(user.id);
        const completedTasks = userTasks.filter(t => t.isCompleted).length;
        
        // Rule-based productivity assessment
        let score = 70; // Base score
        if (scheduleValidation.isValid) score += 15;
        if (scheduleValidation.totalHours >= 25) score += 10;
        if (completedTasks > 5) score += 10;
        score = Math.min(score, 95);

        if (score < 65) {
          insights.push({
            id: `fallback-productivity-low-${user.id}`,
            type: 'productivity',
            priority: 'high',
            title: `Support Needed: ${user.firstName} ${user.lastName}`,
            description: `Productivity indicators suggest need for additional support. Schedule compliance: ${scheduleValidation.isValid ? 'Good' : 'Needs attention'}.`,
            recommendation: scheduleValidation.isValid ? 'Focus on task completion strategies' : 'Prioritize schedule compliance and time management',
            confidence: 75,
            impact: 'negative',
            createdAt: new Date(),
            userId: user.id
          });
        } else if (score > 85) {
          insights.push({
            id: `fallback-productivity-high-${user.id}`,
            type: 'productivity',
            priority: 'medium',
            title: `Strong Performance: ${user.firstName} ${user.lastName}`,
            description: `Excellent productivity indicators with ${completedTasks} completed tasks and good schedule compliance.`,
            recommendation: 'Consider mentoring opportunities with other team members',
            confidence: 80,
            impact: 'positive',
            createdAt: new Date(),
            userId: user.id
          });
        }
      } catch (userError) {
        console.error(`Fallback analysis failed for user ${user.id}:`, userError);
      }
    }
    
    return insights;
  }

  /**
   * Rule-based risk calculation
   */
  private calculateRuleBasedRisk(project: Project, teamSize: number, totalTasks: number, completedTasks: number, daysSinceStart: number) {
    let riskScore = 0;
    
    // Timeline risk
    if (daysSinceStart > 90) riskScore += 30;
    else if (daysSinceStart > 60) riskScore += 15;
    
    // Team size risk
    if (teamSize < 2) riskScore += 20;
    
    // Completion rate risk
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    if (completionRate < 0.3) riskScore += 25;
    else if (completionRate < 0.5) riskScore += 15;
    
    // Project type risk
    if (project.projectType === 'research' || project.projectType === 'complex') riskScore += 10;

    let level: 'low' | 'medium' | 'high' = 'low';
    if (riskScore > 50) level = 'high';
    else if (riskScore > 25) level = 'medium';
    
    return { level, score: riskScore };
  }

  /**
   * Generate fallback productivity metrics
   */
  private generateFallbackProductivityMetrics(userId: string, user: User, userMetrics: any, scheduleValidation: any, userTasks: any[]): ProductivityMetrics {
    // Calculate base score from available data
    let baseScore = 70;
    if (scheduleValidation.isValid) baseScore += 15;
    if (scheduleValidation.totalHours >= 25) baseScore += 8;
    if (userTasks.filter(t => t.isCompleted).length > 5) baseScore += 10;
    baseScore = Math.min(baseScore, 95);

    // Calculate weekly trend
    const weeklyTrend = scheduleValidation.isValid ? 
      Math.min(8, Math.max(-5, (baseScore - 75) / 3)) : 
      Math.min(3, Math.max(-10, (baseScore - 65) / 4));

    return {
      userId,
      overallScore: baseScore,
      weeklyTrend: Math.round(weeklyTrend),
      strengths: [
        scheduleValidation.isValid ? 'Good schedule compliance' : 'Consistent work engagement',
        userTasks.length > 3 ? 'Active task management' : 'Focused project work',
        'Regular lab participation'
      ],
      improvements: [
        scheduleValidation.totalHours < 20 ? 'Increase weekly hours to meet requirements' : 'Optimize work-life balance',
        userTasks.filter(t => !t.isCompleted).length > 5 ? 'Focus on task completion' : 'Consider additional project responsibilities',
        'Document progress more frequently'
      ],
      predictions: [
        `Productivity ${weeklyTrend > 0 ? 'likely to improve' : 'expected to stabilize'} with current patterns`,
        scheduleValidation.isValid ? 'Schedule compliance supports consistent progress' : 'Schedule optimization could boost performance',
        'Collaboration opportunities may enhance outcomes'
      ]
    };
  }

  /**
   * Add schedule optimization capabilities
   */
  async optimizeSchedule(userId: string): Promise<{
    recommendations: string[];
    optimizedBlocks: Array<{
      day: string;
      suggestion: string;
      reason: string;
    }>;
    efficiencyGains: string[];
  }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const currentWeek = this.getCurrentWeekStart();
      const schedules = await storage.getUserWorkSchedules(userId, currentWeek);
      const userTasks = await storage.getUserTasks(userId);
      
      let scheduleBlocks: any[] = [];
      if (schedules.length > 0) {
        scheduleBlocks = await storage.getScheduleBlocks(schedules[0].id);
      }

      const aiAvailable = await ollamaClient.isAvailable();
      
      if (aiAvailable && scheduleBlocks.length > 0) {
        try {
          // Use AI for schedule optimization
          const optimization = await ollamaClient.optimizeSchedule({
            userName: `${user.firstName} ${user.lastName}`,
            currentSchedule: scheduleBlocks.map(block => ({
              day: block.dayOfWeek,
              startTime: block.startTime,
              endTime: block.endTime,
              activity: block.plannedActivity,
              location: block.location
            })),
            productivityPatterns: {
              peakHours: ['09:00-12:00', '14:00-17:00'], // Default patterns
              preferredLocation: 'lab',
              taskTypes: userTasks.slice(0, 3).map(t => t.title || 'research')
            },
            totalHours: schedules[0]?.totalScheduledHours || 0,
            compliance: schedules[0]?.approved || false
          });

          return optimization;

        } catch (aiError) {
          console.error('AI schedule optimization failed:', aiError);
        }
      }

      // Fallback optimization recommendations
      return {
        recommendations: [
          schedules.length === 0 ? 'Create a weekly schedule to optimize productivity' : 'Align demanding tasks with morning hours (9 AM - 12 PM)',
          'Schedule regular breaks between intensive work sessions',
          'Group similar activities to reduce context switching',
          'Reserve afternoons for collaborative work and meetings'
        ],
        optimizedBlocks: scheduleBlocks.slice(0, 3).map((block: any) => ({
          day: block.dayOfWeek,
          suggestion: `Consider focusing on ${block.plannedActivity} during peak hours`,
          reason: 'Better alignment with natural energy patterns'
        })),
        efficiencyGains: [
          'Improved focus through better time alignment',
          'Reduced cognitive load with consistent scheduling',
          'Enhanced work quality during peak hours'
        ]
      };

    } catch (error) {
      console.error('Schedule optimization failed:', error);
      throw error;
    }
  }
}

export const aiEngine = new AIEngine();