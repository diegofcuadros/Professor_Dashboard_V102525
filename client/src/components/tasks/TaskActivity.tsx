import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  MessageCircle, 
  TrendingUp, 
  Settings,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";

interface TaskActivityProps {
  taskId: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

interface ActivityItem {
  id: string;
  type: 'status' | 'progress' | 'comment';
  message: string;
  createdAt: string;
  userId: string;
  authorFirstName?: string;
  authorLastName?: string;
}

const activityIcons = {
  status: Settings,
  progress: TrendingUp,
  comment: MessageCircle,
};

const activityColors = {
  status: "text-blue-600",
  progress: "text-green-600", 
  comment: "text-purple-600",
};

export default function TaskActivity({ taskId, isExpanded = false, onToggle }: TaskActivityProps) {
  const { data: activities, isLoading, error } = useQuery<ActivityItem[]>({
    queryKey: [`/api/tasks/${taskId}/activity`],
    enabled: isExpanded, // Only fetch when expanded
  });

  if (!isExpanded) {
    return (
      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-between"
          data-testid="button-show-activity"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Show Activity
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <h4 className="text-sm font-medium">Task Activity</h4>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          data-testid="button-hide-activity"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      </div>

      <Card className="bg-muted/20">
        <CardContent className="p-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Failed to load activity</p>
            </div>
          )}

          {activities && activities.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity yet</p>
            </div>
          )}

          {activities && activities.length > 0 && (
            <div className="space-y-3">
              {activities.map((activity) => {
                const IconComponent = activityIcons[activity.type];
                const iconColor = activityColors[activity.type];
                
                return (
                  <div key={activity.id} className="flex gap-3" data-testid={`activity-${activity.type}`}>
                    <div className={`flex-shrink-0 mt-0.5`}>
                      <div className="bg-background border rounded-full p-1.5">
                        <IconComponent className={`h-3 w-3 ${iconColor}`} />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-foreground">
                            {activity.type === 'comment' && activity.authorFirstName && (
                              <span className="font-semibold">{activity.authorFirstName} {activity.authorLastName}: </span>
                            )}
                            {activity.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.type}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(activity.createdAt), "MMM d, h:mm a")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
