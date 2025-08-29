import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import TaskCard from "./TaskCard";
import CreateTaskDialog from "./CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  CheckSquare, 
  Users, 
  Plus, 
  Trash2, 
  Edit,
  Clock,
  AlertTriangle
} from "lucide-react";

interface TaskManagementProps {
  projectId: string;
  projectName: string;
  isProfesor?: boolean;
}

interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: string;
  estimatedHours?: string;
  isRequired: boolean;
  orderIndex: number;
  createdAt: string;
  createdBy: string;
}

export default function TaskManagement({ projectId, projectName, isProfesor = false }: TaskManagementProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useQuery({
    queryKey: ["/api/projects", projectId, "tasks"],
    enabled: !!projectId,
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: isProfesor,
    retry: false,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      return apiRequest("POST", `/api/tasks/${taskId}/assign`, { userId });
    },
    onSuccess: () => {
      toast({
        title: "Task Assigned",
        description: "The task has been assigned successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
      setSelectedUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign task",
        variant: "destructive",
      });
    },
  });

  // Handle unauthorized errors
  if (tasksError && isUnauthorizedError(tasksError)) {
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

  if (tasksLoading) {
    return (
      <Card data-testid="task-management-loading">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
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
  const overdueTasks = taskArray.filter((task: ProjectTask) => 
    task.dueDate && new Date(task.dueDate) < new Date()
  );

  const studentUsers = Array.isArray(users) 
    ? users.filter((u: any) => u.role === 'student' || u.role === 'postdoc')
    : [];

  const handleAssignTask = (taskId: string) => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user to assign the task to.",
        variant: "destructive",
      });
      return;
    }
    assignTaskMutation.mutate({ taskId, userId: selectedUserId });
  };

  return (
    <div className="space-y-6" data-testid="task-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            Project Tasks
          </h2>
          <p className="text-muted-foreground">
            {isProfesor ? "Manage tasks and assignments for" : "Tasks for"} {projectName}
          </p>
        </div>
        
        {isProfesor && (
          <CreateTaskDialog 
            projectId={projectId}
            trigger={
              <Button data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            }
          />
        )}
      </div>

      {/* Task Assignment Section (Professor only) */}
      {isProfesor && !usersLoading && studentUsers.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assign Tasks to Students
            </h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-48" data-testid="select-assign-user">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {studentUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select a student to assign tasks to them
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{taskArray.length}</div>
              <div className="text-sm text-muted-foreground">Total Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{taskArray.filter((t: any) => t.priority === 'high' || t.priority === 'urgent').length}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{overdueTasks.length}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{taskArray.filter((t: any) => t.isRequired).length}</div>
              <div className="text-sm text-muted-foreground">Required</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Tasks</h3>
            {overdueTasks.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueTasks.length} overdue
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {taskArray.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No tasks created yet</p>
              <p className="text-sm">
                {isProfesor 
                  ? "Create your first task to get students started on the project."
                  : "No tasks have been assigned to this project yet."}
              </p>
              {isProfesor && (
                <CreateTaskDialog 
                  projectId={projectId}
                  trigger={
                    <Button className="mt-4" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Task
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {taskArray.map((task: ProjectTask) => (
                <div key={task.id} className="group border rounded-lg p-4 hover:bg-muted/20">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-sm">{task.title}</h4>
                        <Badge 
                          variant="secondary"
                          className={`text-xs ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {task.priority}
                        </Badge>
                        {task.isRequired && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${
                            new Date(task.dueDate) < new Date() ? 'text-destructive font-medium' : ''
                          }`}>
                            <Clock className="h-3 w-3" />
                            Due {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
                        )}
                        {task.estimatedHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedHours}h estimated
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isProfesor && (
                      <div className="flex items-center gap-2">
                        {selectedUserId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignTask(task.id)}
                            disabled={assignTaskMutation.isPending}
                            data-testid={`button-assign-task-${task.id}`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Assign
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              data-testid={`button-delete-task-${task.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Task</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{task.title}"? This action cannot be undone and will remove all associated assignments and completions.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Task
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}