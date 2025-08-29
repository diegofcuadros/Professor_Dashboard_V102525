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
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar,
  User,
  FileText
} from "lucide-react";

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
  };
  showProject?: boolean;
  onTaskCompleted?: () => void;
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

export default function TaskCard({ task, showProject = false, onTaskCompleted }: TaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [hoursSpent, setHoursSpent] = useState("");

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
      setShowCompleteForm(false);
      setCompletionNotes("");
      setHoursSpent("");
      onTaskCompleted?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
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

  const PriorityIcon = priorityIcons[task.priority as keyof typeof priorityIcons] || Clock;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.isCompleted;

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
              {task.isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <PriorityIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <h3 className={`font-semibold text-sm line-clamp-2 ${
                task.isCompleted ? 'line-through text-muted-foreground' : ''
              }`}>
                {task.title}
              </h3>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant="secondary" 
                className={priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}
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
          
          {!task.isCompleted && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCompleteForm(true)}
              data-testid="button-complete-task"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete
            </Button>
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

        {/* Task Completion Form */}
        {showCompleteForm && !task.isCompleted && (
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
      </CardContent>
    </Card>
  );
}