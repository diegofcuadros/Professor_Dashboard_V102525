import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from "lucide-react";

interface RealtimeStats {
  timestamp: string;
  overview: {
    activeStudents: number;
    totalProfessors: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  alerts: {
    highPriorityAlerts: number;
    mediumPriorityAlerts: number;
    lowPriorityAlerts: number;
  };
}

interface ProgressUpdate {
  userId: string;
  timestamp: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    newlyOverdue: number;
    recentCompletions: number;
    scheduleSubmissions: number;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    tasks?: Array<{ id: string; title: string; dueDate?: string }>;
  }>;
}

export default function RealtimeMonitoring() {
  const [recentUpdates, setRecentUpdates] = useState<ProgressUpdate[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch initial stats
  const { data: stats, isLoading, refetch } = useQuery<RealtimeStats>({
    queryKey: ["/api/realtime/lab-stats"],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for monitoring');
      setWsConnected(true);
      
      // Authenticate and subscribe to progress updates
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: 'current-user', // In real app, get from auth context
        role: 'professor', // In real app, get from auth context
        token: 'auth-token' // In real app, get actual token
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'notification' && message.data.eventType === 'progress_update') {
          const update = message.data.data as ProgressUpdate;
          setRecentUpdates(prev => [update, ...prev].slice(0, 10)); // Keep last 10 updates
        }
        
        if (message.type === 'notification' && message.data.eventType === 'lab_stats') {
          // Trigger refetch when new stats are available
          refetch();
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [refetch]);

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < threshold) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading real-time statistics...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Real-time Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load real-time statistics. Please check your connection and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Real-time Lab Monitoring</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
            <div className="flex items-center gap-1 ml-4">
              <div className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lab Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold">{stats.overview.activeStudents}</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{stats.overview.activeProjects}</p>
              </div>
              <Activity className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Task Completion</p>
                <p className="text-2xl font-bold">{stats.overview.completionRate}%</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div className="mt-2">
              <Progress value={stats.overview.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
                <p className="text-2xl font-bold text-red-600">{stats.overview.overdueTasks}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Task Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.overview.totalTasks}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.overview.completedTasks}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overview.overdueTasks}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUpdates.length > 0 ? (
            <div className="space-y-4">
              {recentUpdates.slice(0, 5).map((update, index) => (
                <div key={`${update.userId}-${update.timestamp}-${index}`} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Student Activity Update</span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </Badge>
                    </div>
                    
                    {update.alerts.length > 0 && (
                      <div className="space-y-2">
                        {update.alerts.map((alert, alertIndex) => (
                          <div key={alertIndex} className="flex items-center gap-2">
                            <Badge variant={getAlertBadgeVariant(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <span className="text-sm">{alert.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No recent activity updates. Real-time monitoring is active.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alert Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alert Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-red-800">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.alerts.highPriorityAlerts}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-yellow-800">Medium Priority</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.alerts.mediumPriorityAlerts}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">Low Priority</p>
                <p className="text-2xl font-bold text-blue-600">{stats.alerts.lowPriorityAlerts}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}