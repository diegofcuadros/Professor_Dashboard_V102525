import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Activity, 
  MessageSquare, 
  BarChart3, 
  Target, 
  Clock, 
  Users,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause
} from "lucide-react";
import { format } from "date-fns";

interface LiveActivityItem {
  id: string;
  type: 'status' | 'progress' | 'comment';
  message: string;
  createdAt: string;
  studentName: string;
  taskTitle: string;
  projectName: string;
  taskStatus?: string;
  taskProgress?: number;
  timeAgo: string;
}

interface LiveActivityProps {
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
}

const activityIcons = {
  status: Target,
  progress: BarChart3,
  comment: MessageSquare,
};

const activityColors = {
  status: "text-blue-600",
  progress: "text-green-600", 
  comment: "text-purple-600",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  'in-progress': "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
};

export default function LiveActivity({ autoRefresh = false, onAutoRefreshChange }: LiveActivityProps) {
  const [localAutoRefresh, setLocalAutoRefresh] = useState(autoRefresh);

  const { data: activities, isLoading, refetch, dataUpdatedAt } = useQuery<LiveActivityItem[]>({
    queryKey: ['/api/admin/live-activity'],
    refetchInterval: localAutoRefresh ? 30000 : false, // 30 seconds
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    setLocalAutoRefresh(autoRefresh);
  }, [autoRefresh]);

  const handleAutoRefreshToggle = (enabled: boolean) => {
    setLocalAutoRefresh(enabled);
    onAutoRefreshChange?.(enabled);
  };

  const getActivityIcon = (type: string) => {
    const IconComponent = activityIcons[type as keyof typeof activityIcons] || Activity;
    return IconComponent;
  };

  const getActivityColor = (type: string) => {
    return activityColors[type as keyof typeof activityColors] || "text-gray-600";
  };

  const formatActivityMessage = (activity: LiveActivityItem) => {
    // Clean up bulk comment prefix
    let message = activity.message.replace('[Bulk Comment] ', '');
    
    // Add context for progress updates
    if (activity.type === 'progress' && activity.taskProgress !== undefined) {
      message = `Updated progress to ${activity.taskProgress}%`;
    }
    
    return message;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Team Activity</CardTitle>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Team Activity
              {localAutoRefresh && (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600 font-normal">Live</span>
                </div>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time student activity feed (last 30 minutes)
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={localAutoRefresh}
                onCheckedChange={handleAutoRefreshToggle}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh
              </Label>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        
        {dataUpdatedAt && (
          <div className="text-xs text-muted-foreground">
            Last updated: {format(new Date(dataUpdatedAt), "h:mm:ss a")}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No recent activity</p>
            <p className="text-sm">
              No team activity in the last 30 minutes
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const ActivityIcon = getActivityIcon(activity.type);
              const activityColor = getActivityColor(activity.type);
              
              return (
                <div key={activity.id} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="bg-background border rounded-full p-2">
                      <ActivityIcon className={`h-4 w-4 ${activityColor}`} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{activity.studentName}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {activity.type}
                          </Badge>
                          {activity.taskStatus && (
                            <Badge className={`text-xs ${statusColors[activity.taskStatus as keyof typeof statusColors] || statusColors.pending}`}>
                              {activity.taskStatus.replace('-', ' ')}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-foreground mb-1">
                          {formatActivityMessage(activity)}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{activity.taskTitle}</span>
                          <span>•</span>
                          <span>{activity.projectName}</span>
                          {activity.taskProgress !== undefined && (
                            <>
                              <span>•</span>
                              <span>{activity.taskProgress}% complete</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{activity.timeAgo}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Activity Summary */}
        {activities && activities.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {activities.filter(a => a.type === 'status').length}
                </div>
                <div className="text-xs text-muted-foreground">Status Changes</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-green-600">
                  {activities.filter(a => a.type === 'progress').length}
                </div>
                <div className="text-xs text-muted-foreground">Progress Updates</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-purple-600">
                  {activities.filter(a => a.type === 'comment').length}
                </div>
                <div className="text-xs text-muted-foreground">Comments</div>
              </div>
              
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {new Set(activities.map(a => a.studentName)).size}
                </div>
                <div className="text-xs text-muted-foreground">Active Students</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
