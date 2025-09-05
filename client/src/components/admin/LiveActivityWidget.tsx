import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  MessageCircle,
  TrendingUp,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap = {
  status: Settings,
  progress: TrendingUp,
  comment: MessageCircle,
};

export default function LiveActivityWidget() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/admin/live-activity'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6" />
          <CardTitle>Live Activity Feed</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && (!activities || activities.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No recent activity</p>
            <p className="text-sm">Things are quiet right now. Check back later.</p>
          </div>
        )}

        {!isLoading && activities && activities.length > 0 && (
          <div className="space-y-4">
            {activities.map(item => {
              const Icon = iconMap[item.type] || Activity;
              return (
                <div key={item.id} className="flex items-start gap-3 text-xs">
                  <Icon className="h-3 w-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p>
                      <span className="font-semibold">{item.studentName}</span>
                      {` ${item.type === 'progress' ? 'updated progress on' : item.type === 'status' ? 'changed status of' : 'commented on'}`}
                      <span className="font-semibold text-primary"> {item.taskTitle}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
