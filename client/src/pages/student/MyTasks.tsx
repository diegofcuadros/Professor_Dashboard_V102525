import TaskList from "@/components/tasks/TaskList";
import { CheckSquare, Target, Clock } from "lucide-react";

export default function MyTasks() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CheckSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
          <p className="text-muted-foreground">
            View and complete all your assigned tasks across all projects
          </p>
        </div>
      </div>

      {/* Task Overview */}
      <TaskList showProject={true} />
    </div>
  );
}