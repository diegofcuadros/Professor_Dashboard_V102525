// Ollama Client for AI Integration
// Handles communication with local Llama model via Ollama API

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  system?: string;
  temperature?: number;
  max_tokens?: number;
}

interface OllamaResponse {
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private enabled: boolean;

  constructor() {
    this.baseUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.enabled = process.env.AI_ANALYSIS_ENABLED === 'true';
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.warn('Ollama service not available:', error);
      return false;
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(prompt: string, systemPrompt?: string, options?: {
    temperature?: number;
    max_tokens?: number;
    model?: string;
  }): Promise<string> {
    if (!this.enabled) {
      throw new Error('AI analysis is disabled');
    }

    try {
      const requestBody: OllamaRequest = {
        model: options?.model || this.defaultModel,
        prompt: prompt,
        stream: false,
        system: systemPrompt,
        temperature: options?.temperature || 0.7
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Increase timeout for AI requests
        signal: AbortSignal.timeout(120000) // 2 minutes
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaResponse = await response.json();
      return data.response.trim();

    } catch (error) {
      console.error('Ollama generation error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  /**
   * Analyze productivity data using AI
   */
  async analyzeProductivity(data: {
    userId: string;
    userName: string;
    weeklyHours: number;
    completedTasks: number;
    activeProjects: number;
    recentProgress: string[];
    scheduleCompliance: boolean;
  }): Promise<{
    overallScore: number;
    strengths: string[];
    improvements: string[];
    predictions: string[];
  }> {
    const systemPrompt = `You are an AI research lab productivity analyst. Analyze the provided data and return insights in JSON format with these exact fields:
- overallScore: number (0-100)
- strengths: array of 2-3 specific strengths
- improvements: array of 2-3 actionable improvements
- predictions: array of 2-3 future predictions

Be specific, actionable, and data-driven. Focus on research productivity patterns.`;

    const prompt = `Analyze this researcher's productivity data:
- Name: ${data.userName}
- Weekly hours: ${data.weeklyHours}
- Completed tasks: ${data.completedTasks}
- Active projects: ${data.activeProjects}
- Schedule compliance: ${data.scheduleCompliance ? 'Yes' : 'No'}
- Recent progress: ${data.recentProgress.join('; ')}

Provide productivity analysis in JSON format.`;

    try {
      const response = await this.generate(prompt, systemPrompt, { temperature: 0.3 });
      
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Validate required fields and provide defaults if needed
        return {
          overallScore: Math.min(Math.max(result.overallScore || 75, 0), 100),
          strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 3) : ['Consistent work pattern', 'Good task completion rate'],
          improvements: Array.isArray(result.improvements) ? result.improvements.slice(0, 3) : ['Consider time blocking', 'Regular progress updates'],
          predictions: Array.isArray(result.predictions) ? result.predictions.slice(0, 3) : ['Steady productivity expected', 'May benefit from schedule optimization']
        };
      }
      
      // Fallback if JSON parsing fails
      return this.parseProductivityText(response, data);
      
    } catch (error) {
      console.error('AI productivity analysis failed:', error);
      // Return sensible defaults based on data
      return this.generateFallbackProductivity(data);
    }
  }

  /**
   * Analyze project risks using AI
   */
  async analyzeProjectRisk(data: {
    projectName: string;
    startDate: string;
    targetEndDate?: string;
    teamSize: number;
    completedTasks: number;
    totalTasks: number;
    recentActivity: string[];
    complexity: string;
  }): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    delayProbability: number;
    riskFactors: string[];
    mitigationStrategies: string[];
    completionPrediction: string;
  }> {
    const systemPrompt = `You are an AI project risk analyst for research projects. Analyze project data and return risk assessment in JSON format with:
- riskLevel: "low", "medium", or "high"
- delayProbability: number (0-100)
- riskFactors: array of 2-4 specific risk factors
- mitigationStrategies: array of 2-4 actionable strategies
- completionPrediction: estimated completion date as string

Be objective and focus on research project challenges.`;

    const daysSinceStart = Math.floor((Date.now() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const completionRate = data.totalTasks > 0 ? (data.completedTasks / data.totalTasks * 100).toFixed(1) : 0;

    const prompt = `Analyze this research project's risk profile:
- Project: ${data.projectName}
- Running for: ${daysSinceStart} days
- Team size: ${data.teamSize}
- Task completion: ${completionRate}% (${data.completedTasks}/${data.totalTasks})
- Target end: ${data.targetEndDate || 'Not set'}
- Complexity: ${data.complexity}
- Recent activity: ${data.recentActivity.join('; ')}

Provide risk assessment in JSON format.`;

    try {
      const response = await this.generate(prompt, systemPrompt, { temperature: 0.3 });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        return {
          riskLevel: ['low', 'medium', 'high'].includes(result.riskLevel) ? result.riskLevel : 'medium',
          delayProbability: Math.min(Math.max(result.delayProbability || 30, 0), 100),
          riskFactors: Array.isArray(result.riskFactors) ? result.riskFactors.slice(0, 4) : ['Project complexity', 'Resource constraints'],
          mitigationStrategies: Array.isArray(result.mitigationStrategies) ? result.mitigationStrategies.slice(0, 4) : ['Regular progress reviews', 'Risk monitoring'],
          completionPrediction: result.completionPrediction || 'Within next 60 days'
        };
      }
      
      return this.generateFallbackRisk(data);
      
    } catch (error) {
      console.error('AI risk analysis failed:', error);
      return this.generateFallbackRisk(data);
    }
  }

  /**
   * Generate schedule optimization recommendations
   */
  async optimizeSchedule(data: {
    userName: string;
    currentSchedule: Array<{
      day: string;
      startTime: string;
      endTime: string;
      activity: string;
      location: string;
    }>;
    productivityPatterns: {
      peakHours: string[];
      preferredLocation: string;
      taskTypes: string[];
    };
    totalHours: number;
    compliance: boolean;
  }): Promise<{
    recommendations: string[];
    optimizedBlocks: Array<{
      day: string;
      suggestion: string;
      reason: string;
    }>;
    efficiencyGains: string[];
  }> {
    const systemPrompt = `You are an AI schedule optimization expert for research students. Analyze schedule data and provide optimization recommendations in JSON format with:
- recommendations: array of 3-5 actionable schedule improvements
- optimizedBlocks: array of day-specific suggestions with reasons
- efficiencyGains: array of 2-3 expected efficiency improvements

Focus on research productivity, work-life balance, and peak performance hours.`;

    const scheduleText = data.currentSchedule.map(block => 
      `${block.day}: ${block.startTime}-${block.endTime} ${block.activity} (${block.location})`
    ).join('\n');

    const prompt = `Optimize ${data.userName}'s research schedule:

Current Schedule (${data.totalHours} hours/week):
${scheduleText}

Productivity Patterns:
- Peak hours: ${data.productivityPatterns.peakHours.join(', ')}
- Preferred location: ${data.productivityPatterns.preferredLocation}
- Task types: ${data.productivityPatterns.taskTypes.join(', ')}
- Schedule compliant: ${data.compliance ? 'Yes' : 'No'}

Provide optimization recommendations in JSON format.`;

    try {
      const response = await this.generate(prompt, systemPrompt, { temperature: 0.4 });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        return {
          recommendations: Array.isArray(result.recommendations) ? result.recommendations.slice(0, 5) : ['Align tasks with peak hours', 'Balance deep work and meetings'],
          optimizedBlocks: Array.isArray(result.optimizedBlocks) ? result.optimizedBlocks.slice(0, 7) : [],
          efficiencyGains: Array.isArray(result.efficiencyGains) ? result.efficiencyGains.slice(0, 3) : ['Better focus periods', 'Reduced context switching']
        };
      }
      
      return this.generateFallbackScheduleOptimization(data);
      
    } catch (error) {
      console.error('AI schedule optimization failed:', error);
      return this.generateFallbackScheduleOptimization(data);
    }
  }

  // Fallback methods for when AI is unavailable
  private parseProductivityText(text: string, data: any) {
    const score = data.weeklyHours >= 20 ? Math.min(75 + data.completedTasks * 2, 95) : 60;
    
    return {
      overallScore: score,
      strengths: ['Maintains consistent schedule', 'Active project engagement'],
      improvements: ['Consider task prioritization', 'Regular progress tracking'],
      predictions: ['Steady improvement expected', 'Schedule compliance trending positive']
    };
  }

  private generateFallbackProductivity(data: any) {
    const baseScore = data.weeklyHours >= 20 ? 75 : 60;
    const score = Math.min(baseScore + (data.completedTasks * 3), 95);
    
    return {
      overallScore: score,
      strengths: [
        data.scheduleCompliance ? 'Good schedule compliance' : 'Consistent work pattern',
        data.completedTasks > 5 ? 'High task completion rate' : 'Active task engagement'
      ],
      improvements: [
        data.weeklyHours < 20 ? 'Increase weekly hours to meet requirements' : 'Optimize time allocation',
        'Regular progress updates recommended'
      ],
      predictions: [
        'Productivity likely to improve with consistent patterns',
        data.scheduleCompliance ? 'Schedule compliance will support better outcomes' : 'Focus on schedule adherence'
      ]
    };
  }

  private generateFallbackRisk(data: any) {
    const completionRate = data.totalTasks > 0 ? data.completedTasks / data.totalTasks : 0;
    const daysSinceStart = Math.floor((Date.now() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    let delayProbability = 30;
    
    if (completionRate > 0.7 && daysSinceStart < 60) {
      riskLevel = 'low';
      delayProbability = 15;
    } else if (completionRate < 0.3 || daysSinceStart > 90) {
      riskLevel = 'high';
      delayProbability = 60;
    }
    
    return {
      riskLevel,
      delayProbability,
      riskFactors: [
        daysSinceStart > 90 ? 'Extended project timeline' : 'Normal project progression',
        data.teamSize < 2 ? 'Limited team resources' : 'Team resource availability',
        completionRate < 0.3 ? 'Low task completion rate' : 'Task completion challenges'
      ],
      mitigationStrategies: [
        'Regular progress monitoring',
        'Milestone-based tracking',
        data.teamSize < 2 ? 'Consider additional resources' : 'Optimize team coordination',
        'Risk assessment reviews'
      ],
      completionPrediction: new Date(Date.now() + (60 + delayProbability) * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
  }

  private generateFallbackScheduleOptimization(data: any) {
    return {
      recommendations: [
        'Align demanding tasks with peak productivity hours',
        'Schedule regular breaks between intensive work sessions',
        'Group similar activities to reduce context switching',
        data.totalHours < 20 ? 'Add additional productive hours to meet requirements' : 'Optimize current time allocation'
      ],
      optimizedBlocks: data.currentSchedule.slice(0, 3).map((block: any) => ({
        day: block.day,
        suggestion: `Consider ${block.activity.toLowerCase()} during peak hours`,
        reason: 'Better alignment with productivity patterns'
      })),
      efficiencyGains: [
        'Improved focus through better time alignment',
        'Reduced fatigue with optimized work patterns',
        'Higher quality output during peak hours'
      ]
    };
  }
}

export const ollamaClient = new OllamaClient();