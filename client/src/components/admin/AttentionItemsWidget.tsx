import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { 
  Bell, 
  AlertTriangle, 
  UserX,
  CalendarCheck
} from "lucide-react";

const iconMap = {
  schedule_approval: CalendarCheck,
  task_overdue: AlertTriangle,
  student_inactive: UserX,
};

const colorMap = {
  schedule_approval: "text-blue-500",
  task_overdue: "text-orange-500",
  student_inactive: "text-red-500",
};

export default function AttentionItemsWidget({ items, isLoading }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6" />
          <CardTitle>Needs Attention</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (!items || items.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">Nothing needs your immediate attention.</p>
          </div>
        )}

        {!isLoading && items && items.length > 0 && (
          <div className="space-y-4">
            {items.map(item => {
              const Icon = iconMap[item.type] || Bell;
              const iconColor = colorMap[item.type] || "text-gray-500";
              
              return (
                <Link key={item.id} href={item.link}>
                  <a className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className={iconColor}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
