import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import TaskCard from "./TaskCard";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  Calendar
} from "lucide-react";

interface TaskListProps {
  projectId?: string;
  title?: string;
  showProject?: boolean;
}

export default function TaskList({ projectId, title = "My Tasks", showProject = true }: TaskListProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const apiEndpoint = projectId 
    ? `/api/user/projects/${projectId}/tasks`
    : `/api/user/tasks`;

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: [apiEndpoint],
    enabled: !!user?.id,
    retry: false,
  });

  // Handle unauthorized errors
  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (isLoading) {
    return (
      <Card data-testid="task-list-loading">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const taskArray = Array.isArray(tasks) ? tasks : [];
  const completedTasks = taskArray.filter(task => task.isCompleted);
  const incompleteTasks = taskArray.filter(task => !task.isCompleted);
  const overdueTasks = incompleteTasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date()
  );

  // Sort incomplete tasks: overdue first, then by due date, then by priority
  const sortedIncompleteTasks = [...incompleteTasks].sort((a, b) => {
    // Overdue tasks first
    const aOverdue = a.dueDate && new Date(a.dueDate) < new Date();
    const bOverdue = b.dueDate && new Date(b.dueDate) < new Date();
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by due date
    if (a.dueDate && b.dueDate) {
      const dateComparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (dateComparison !== 0) return dateComparison;
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    // Then by priority
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return (priorityOrder[b.priority as keyof typeof priorityOrder] || 2) - 
           (priorityOrder[a.priority as keyof typeof priorityOrder] || 2);
  });

  return (
    <Card data-testid="task-list">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {overdueTasks.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueTasks.length} overdue
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {incompleteTasks.length} active
            </Badge>
            <Badge variant="outline" className="text-xs">
              {completedTasks.length} completed
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {taskArray.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="no-tasks-message">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No tasks assigned</p>
            <p className="text-sm">
              {projectId 
                ? "This project doesn't have any tasks assigned to you yet." 
                : "You don't have any tasks assigned across all projects."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active/Incomplete Tasks */}
            {sortedIncompleteTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Active Tasks ({sortedIncompleteTasks.length})
                </h4>
                <div className="space-y-3">
                  {sortedIncompleteTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      user={user}
                      showProject={showProject}
                      onTaskCompleted={() => refetch()}
                      onTaskUpdated={() => refetch()}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Completed Tasks ({completedTasks.length})
                </h4>
                <div className="space-y-3">
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      user={user}
                      showProject={showProject}
                      onTaskUpdated={() => refetch()}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}