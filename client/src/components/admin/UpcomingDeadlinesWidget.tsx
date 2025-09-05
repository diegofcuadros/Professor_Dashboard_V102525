import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Calendar,
  ClipboardCheck,
  Target
} from "lucide-react";

const iconMap = {
  task: ClipboardCheck,
  milestone: Target,
};

export default function UpcomingDeadlinesWidget({ deadlines, isLoading }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6" />
          <CardTitle>Upcoming Deadlines</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!deadlines || deadlines.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No deadlines soon</p>
            <p className="text-sm">There are no upcoming deadlines in the next 7 days.</p>
          </div>
        )}

        {!isLoading && deadlines && deadlines.length > 0 && (
          <div className="space-y-3">
            {deadlines.map(item => {
              const Icon = iconMap[item.type] || Calendar;
              
              return (
                <div key={item.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                  <Icon className="h-5 w-5 mt-1 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.projectName} - {item.studentName}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-right flex-shrink-0 ml-4">
                        {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                      </p>
                    </div>
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
