import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Users,
  Clock,
  Lightbulb,
  Zap,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface AIInsight {
  id: string;
  type: 'productivity' | 'risk' | 'opportunity' | 'prediction';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  createdAt: string;
}

interface ProductivityMetrics {
  overallScore: number;
  weeklyTrend: number;
  topPerformers: string[];
  bottlenecks: string[];
  recommendations: string[];
}

interface ProjectPrediction {
  projectId: string;
  projectName: string;
  currentProgress: number;
  predictedCompletion: string;
  riskLevel: 'low' | 'medium' | 'high';
  delayProbability: number;
  suggestedActions: string[];
}

// Mock AI-generated insights - In production, this would come from ML models
const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'productivity',
    priority: 'high',
    title: 'Team Productivity Spike Detected',
    description: 'Your team\'s productivity has increased by 23% over the past 2 weeks.',
    recommendation: 'Consider documenting current practices to maintain this momentum.',
    confidence: 87,
    impact: 'positive',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    type: 'risk',
    priority: 'medium',
    title: 'Project Timeline Risk',
    description: 'ML Health Analysis project is 15% behind schedule with increasing complexity.',
    recommendation: 'Allocate additional senior resources or extend deadline by 2 weeks.',
    confidence: 72,
    impact: 'negative',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    type: 'opportunity',
    priority: 'medium',
    title: 'Knowledge Sharing Opportunity',
    description: 'Sarah has expertise that could accelerate 2 other ongoing projects.',
    recommendation: 'Schedule cross-project knowledge sharing sessions.',
    confidence: 81,
    impact: 'positive',
    createdAt: new Date().toISOString()
  }
];

const mockProductivityMetrics: ProductivityMetrics = {
  overallScore: 78,
  weeklyTrend: 12,
  topPerformers: ['Sarah Chen', 'Alex Rodriguez'],
  bottlenecks: ['Data preprocessing', 'Model validation'],
  recommendations: [
    'Implement automated data preprocessing pipeline',
    'Establish peer review process for model validation',
    'Schedule weekly progress check-ins'
  ]
};

const mockPredictions: ProjectPrediction[] = [
  {
    projectId: '1',
    projectName: 'ML Health Data Analysis',
    currentProgress: 65,
    predictedCompletion: '2024-03-15',
    riskLevel: 'medium',
    delayProbability: 35,
    suggestedActions: [
      'Add senior ML engineer to team',
      'Simplify model complexity',
      'Extend deadline by 1 week'
    ]
  },
  {
    projectId: '2',
    projectName: 'Patient Data Pipeline',
    currentProgress: 85,
    predictedCompletion: '2024-02-28',
    riskLevel: 'low',
    delayProbability: 12,
    suggestedActions: [
      'Maintain current pace',
      'Prepare documentation early'
    ]
  }
];

export default function AIAnalytics() {
  const { user } = useAuth();
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');

  // In production, these would fetch real AI-generated insights
  const { data: labMetrics } = useQuery({
    queryKey: ["/api/analytics/lab"],
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'productivity': return <TrendingUp className="h-5 w-5" />;
      case 'risk': return <AlertTriangle className="h-5 w-5" />;
      case 'opportunity': return <Lightbulb className="h-5 w-5" />;
      case 'prediction': return <Brain className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    if (type === 'risk') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    if (impact === 'positive') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    if (impact === 'negative') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const filteredInsights = selectedInsightType === 'all' 
    ? mockInsights 
    : mockInsights.filter(insight => insight.type === selectedInsightType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Brain className="mr-3 h-8 w-8 text-primary" />
            AI Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Intelligent insights and predictions for your research lab
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Real-time AI Analysis</span>
        </div>
      </div>

      {/* Key AI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Productivity Score</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold">{mockProductivityMetrics.overallScore}%</p>
                  <Badge className="bg-green-100 text-green-800">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    +{mockProductivityMetrics.weeklyTrend}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">AI Insights</p>
                <p className="text-2xl font-bold">{mockInsights.length}</p>
                <p className="text-xs text-muted-foreground">Generated today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Risk Alerts</p>
                <p className="text-2xl font-bold">
                  {mockInsights.filter(i => i.type === 'risk').length}
                </p>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Prediction Accuracy</p>
                <p className="text-2xl font-bold">94%</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Smart Insights</h2>
            <div className="flex space-x-2">
              {['all', 'productivity', 'risk', 'opportunity', 'prediction'].map((type) => (
                <Button
                  key={type}
                  variant={selectedInsightType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInsightType(type)}
                  className="capitalize"
                  data-testid={`filter-${type}`}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInsights.map((insight) => (
              <Card key={insight.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getInsightColor(insight.type, insight.impact)}`}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority} priority
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {insight.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{insight.description}</p>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      AI Recommendation
                    </h4>
                    <p className="text-blue-800 dark:text-blue-300 text-sm">
                      {insight.recommendation}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      Generated {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                    <Button size="sm" variant="outline" data-testid={`action-${insight.id}`}>
                      Take Action
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Project Predictions</h2>
            <Badge variant="outline" className="text-green-600">
              <Zap className="h-3 w-3 mr-1" />
              ML-Powered
            </Badge>
          </div>

          <div className="space-y-4">
            {mockPredictions.map((prediction) => (
              <Card key={prediction.projectId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{prediction.projectName}</h3>
                        <Badge className={getRiskColor(prediction.riskLevel)}>
                          {prediction.riskLevel} risk
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Current Progress</p>
                          <div className="space-y-1">
                            <Progress value={prediction.currentProgress} />
                            <p className="text-sm font-medium">{prediction.currentProgress}%</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">Predicted Completion</p>
                          <p className="font-medium">{new Date(prediction.predictedCompletion).toLocaleDateString()}</p>
                          <p className="text-xs text-red-600">
                            {prediction.delayProbability}% delay probability
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">AI Suggestions</p>
                          <ul className="text-sm space-y-1">
                            {prediction.suggestedActions.slice(0, 2).map((action, index) => (
                              <li key={index} className="flex items-center">
                                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Productivity Analysis</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockProductivityMetrics.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">#{index + 1}</span>
                        </div>
                        <span className="font-medium">{performer}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        High
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Bottlenecks Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockProductivityMetrics.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{bottleneck}</span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Delays
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-5 w-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockProductivityMetrics.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <span className="text-blue-900 dark:text-blue-300">{rec}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Performance Trends</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Weekly Progress Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Trend visualization would go here</p>
                      <p className="text-xs text-muted-foreground">Chart.js or Recharts integration</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Time Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-32 bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/20 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <PieChart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Time distribution chart</p>
                      <p className="text-xs text-muted-foreground">Research vs Development vs Analysis</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}