import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar,
  User,
  FileText,
  Play,
  Pause,
  Square,
  MessageCircle,
  Activity,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import TaskActivity from "./TaskActivity";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority: string;
    estimatedHours?: string;
    isRequired: boolean;
    projectName?: string;
    isCompleted?: boolean;
    // Sprint A fields
    status?: string;
    progressPct?: number;
  };
  user: User | null;
  showProject?: boolean;
  onTaskCompleted?: () => void;
  onTaskUpdated?: () => void;
}

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const priorityIcons = {
  low: Clock,
  medium: Clock,
  high: AlertTriangle,
  urgent: AlertTriangle
};

// Sprint B: Status colors and icons
const statusColors = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  'in-progress': "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200",
  blocked: "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
};

const statusIcons = {
  pending: Clock,
  'in-progress': Play,
  completed: CheckCircle2,
  blocked: Pause
};

const statusLabels = {
  pending: "Pending",
  'in-progress': "In Progress",
  completed: "Completed",
  blocked: "Blocked"
};

export default function TaskCard({ task, showProject = false, onTaskCompleted, onTaskUpdated, user }: TaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");
  
  // Sprint B: Enhanced state management
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [progressValue, setProgressValue] = useState([task.progressPct || 0]);
  const [selectedStatus, setSelectedStatus] = useState(task.status || 'pending');

  const isProfessor = user?.role === 'professor';

  const completeTaskMutation = useMutation({
    mutationFn: async (data: { notes?: string; hoursSpent?: number }) => {
      return apiRequest("POST", `/api/tasks/${task.id}/complete`, data);
    },
    onSuccess: () => {
      toast({
        title: "Task Completed!",
        description: "Great work completing this task.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks/overview"] });
      setShowCompleteForm(false);
      setCompletionNotes("");
      setHoursSpent("");
      onTaskCompleted?.();
      onTaskUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive",
      });
    },
  });

  // Sprint B: Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { status: string; note?: string }) => {
      return apiRequest("PATCH", `/api/tasks/${task.id}/status`, data);
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Task status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks/overview"] });
      onTaskUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
      setSelectedStatus(task.status || 'pending'); // Revert on error
    },
  });

  // Sprint B: Progress update mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { progressPct: number; note?: string }) => {
      return apiRequest("PATCH", `/api/tasks/${task.id}/progress`, data);
    },
    onSuccess: () => {
      toast({
        title: "Progress Updated",
        description: "Task progress has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tasks/overview"] });
      setShowProgressForm(false);
      onTaskUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update progress",
        variant: "destructive",
      });
      setProgressValue([task.progressPct || 0]); // Revert on error
    },
  });

  // Sprint B: Comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      return apiRequest("POST", `/api/tasks/${task.id}/comment`, data);
    },
    onSuccess: () => {
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the task.",
      });
      setNewComment("");
      setShowCommentForm(false);
      // We need to refetch the activity feed, which is handled internally by TaskActivity
      // but we also need to update the main task list if comments affect task state.
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${task.id}/activity`] });
      onTaskUpdated?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleCompleteTask = () => {
    if (task.isCompleted) return;
    
    const data: { notes?: string; hoursSpent?: number } = {};
    if (completionNotes.trim()) data.notes = completionNotes.trim();
    if (hoursSpent.trim()) data.hoursSpent = parseFloat(hoursSpent);
    
    completeTaskMutation.mutate(data);
  };

  // Sprint B: Handle status changes
  const handleStatusChange = (newStatus: string) => {
    if (newStatus === task.status) return;
    setSelectedStatus(newStatus);
    updateStatusMutation.mutate({ status: newStatus });
  };

  // Sprint B: Handle progress updates
  const handleProgressUpdate = () => {
    const newProgress = progressValue[0];
    if (newProgress === task.progressPct) {
      setShowProgressForm(false);
      return;
    }
    updateProgressMutation.mutate({ progressPct: newProgress });
  };

  // Sprint B: Handle comment submission
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ message: newComment.trim() });
  };

  // Sprint B: Quick action handlers
  const handleQuickStart = () => {
    if (task.status !== 'in-progress') {
      handleStatusChange('in-progress');
    }
  };

  const handleQuickComplete = () => {
    if (task.progressPct !== 100) {
      updateProgressMutation.mutate({ progressPct: 100, note: 'Marked as complete' });
    }
  };

  const handleQuickBlock = () => {
    if (task.status !== 'blocked') {
      handleStatusChange('blocked');
    }
  };

  const PriorityIcon = priorityIcons[task.priority as keyof typeof priorityIcons] || Clock;
  const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Clock;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted;
  const currentStatus = task.status || 'pending';
  const currentProgress = task.progressPct || 0;

  return (
    <Card 
      className={`transition-all hover:shadow-md ${
        task.isCompleted ? 'opacity-75 bg-muted/30' : ''
      } ${isOverdue ? 'border-destructive' : ''}`}
      data-testid={`task-card-${task.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={`h-5 w-5 flex-shrink-0 ${
                currentStatus === 'completed' ? 'text-green-600' :
                currentStatus === 'in-progress' ? 'text-blue-600' :
                currentStatus === 'blocked' ? 'text-red-600' :
                'text-muted-foreground'
              }`} />
              <h3 className={`font-semibold text-sm line-clamp-2 ${
                task.isCompleted || currentStatus === 'completed' ? 'line-through text-muted-foreground' : ''
              }`}>
                {task.title}
              </h3>
              {currentProgress > 0 && !isProfessor && (
                <Badge variant="outline" className="text-xs ml-auto">
                  {currentProgress}%
                </Badge>
              )}
            </div>
            
            {/* Progress Bar */}
            {!isProfessor && currentProgress > 0 && (
              <div className="mb-2">
                <Progress value={currentProgress} className="h-2" />
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Badge */}
              <Badge 
                className={statusColors[currentStatus as keyof typeof statusColors] || statusColors.pending}
                data-testid={`task-status-${currentStatus}`}
              >
                {statusLabels[currentStatus as keyof typeof statusLabels] || 'Pending'}
              </Badge>
              
              {/* Priority Badge */}
              <Badge 
                variant="outline" 
                className={`text-xs ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}`}
                data-testid={`task-priority-${task.priority}`}
              >
                {task.priority}
              </Badge>
              
              {task.isRequired && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
              
              {showProject && task.projectName && (
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {task.projectName}
                </Badge>
              )}
            </div>
          </div>
          
          {!task.isCompleted && currentStatus !== 'completed' && (
            <div className="flex flex-col gap-2">
              {/* Quick Actions */}
              <div className="flex gap-1">
                {!isProfessor && currentStatus === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickStart}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-start-task"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                )}
                
                {!isProfessor && currentStatus === 'in-progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickComplete}
                    disabled={updateProgressMutation.isPending}
                    data-testid="button-complete-task"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </Button>
                )}
                
                {!isProfessor && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowProgressForm(!showProgressForm)}
                    data-testid="button-update-progress"
                  >
                    <Activity className="h-3 w-3" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCommentForm(!showCommentForm)}
                  data-testid="button-add-comment"
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {(task.isCompleted || currentStatus === 'completed') && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {task.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${
              isOverdue ? 'text-destructive font-medium' : ''
            }`}>
              <Calendar className="h-3 w-3" />
              Due {format(new Date(task.dueDate), "MMM d, yyyy")}
            </div>
          )}
          
          {task.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimatedHours}h estimated
            </div>
          )}
        </div>

        {/* Professor Comment Form Toggle */}
        {isProfessor && (
          <div className="mt-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCommentForm(!showCommentForm)}
              className="w-full"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {showCommentForm ? 'Cancel' : 'Add Comment'}
            </Button>
          </div>
        )}

        {/* Sprint B: Status Selector */}
        {!isProfessor && (
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sprint B: Progress Update Form */}
        {!isProfessor && showProgressForm && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-3">Update Progress</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Progress: {progressValue[0]}%</Label>
                <Slider
                  value={progressValue}
                  onValueChange={setProgressValue}
                  max={100}
                  step={5}
                  className="mt-2"
                />
                <Progress value={progressValue[0]} className="h-2 mt-2" />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleProgressUpdate}
                  disabled={updateProgressMutation.isPending}
                >
                  {updateProgressMutation.isPending ? "Updating..." : "Update Progress"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProgressForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sprint B: Comment Form */}
        {showCommentForm && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-3">Add Comment</h4>
            <div className="space-y-3">
              <Textarea
                placeholder="Add a comment about this task..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-sm"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending || !newComment.trim()}
                >
                  {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCommentForm(false);
                    setNewComment("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Task Completion Form (Legacy) */}
        {!isProfessor && showCompleteForm && !task.isCompleted && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-3">Complete Task</h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="completion-notes" className="text-xs">
                  Notes (optional)
                </Label>
                <Textarea
                  id="completion-notes"
                  placeholder="Add any notes about completing this task..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="text-sm"
                  data-testid="input-completion-notes"
                />
              </div>
              
              <div>
                <Label htmlFor="hours-spent" className="text-xs">
                  Hours Spent (optional)
                </Label>
                <Input
                  id="hours-spent"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="2.5"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(e.target.value)}
                  className="text-sm"
                  data-testid="input-hours-spent"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCompleteTask}
                  disabled={completeTaskMutation.isPending}
                  data-testid="button-submit-completion"
                >
                  {completeTaskMutation.isPending ? "Completing..." : "Mark Complete"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCompleteForm(false)}
                  data-testid="button-cancel-completion"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sprint B: Task Activity Feed */}
        <TaskActivity 
          taskId={task.id}
          isExpanded={showActivity}
          onToggle={() => setShowActivity(!showActivity)}
        />
      </CardContent>
    </Card>
  );
}