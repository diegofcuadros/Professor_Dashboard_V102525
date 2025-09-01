import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  AlertTriangle, 
  Filter, 
  Search, 
  Download,
  Settings,
  MessageSquare,
  Calendar,
  Clock,
  Target,
  CheckSquare2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Home
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface TeamTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  progressPct: number;
  priority: string;
  dueDate?: string;
  isRequired: boolean;
  estimatedHours?: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  projectName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  isCompleted: boolean;
  isOverdue: boolean;
  daysSinceLastUpdate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface StudentSummary {
  studentId: string;
  studentName: string;
  studentEmail: string;
  department?: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  avgProgress: number;
  completionRate: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  lastActivity?: string;
  scheduleCompliance: number;
}

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  'in-progress': "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
};

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const riskColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

export default function TeamTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // View state
  const [currentView, setCurrentView] = useState<'tasks' | 'students'>('tasks');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [progressMin, setProgressMin] = useState<number>(0);
  const [progressMax, setProgressMax] = useState<number>(100);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [recentlyActive, setRecentlyActive] = useState(false);

  // Bulk action state
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkComment, setBulkComment] = useState("");

  // Build query parameters for API call
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    
    if (statusFilter.length > 0) {
      statusFilter.forEach(status => params.append('status', status));
    }
    if (riskFilter.length > 0) {
      riskFilter.forEach(risk => params.append('riskLevel', risk));
    }
    if (priorityFilter.length > 0) {
      priorityFilter.forEach(priority => params.append('priorities', priority));
    }
    if (progressMin > 0) params.append('progressMin', progressMin.toString());
    if (progressMax < 100) params.append('progressMax', progressMax.toString());
    if (needsAttention) params.append('needsAttention', 'true');
    if (recentlyActive) params.append('recentlyActive', 'true');
    
    return params.toString();
  };

  // Fetch team tasks
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useQuery<TeamTask[]>({
    queryKey: ['/api/admin/tasks/overview', buildQueryParams()],
    enabled: currentView === 'tasks',
  });

  // Fetch student summaries
  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = useQuery<StudentSummary[]>({
    queryKey: ['/api/admin/tasks/students'],
    enabled: currentView === 'students',
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: { taskIds: string[], updates: any }) => {
      return apiRequest("PATCH", "/api/admin/tasks/bulk", data);
    },
    onSuccess: () => {
      toast({
        title: "Tasks Updated",
        description: `Successfully updated ${selectedTasks.length} tasks`,
      });
      setSelectedTasks([]);
      setShowBulkActions(false);
      setBulkStatus("");
      setBulkPriority("");
      refetchTasks();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tasks",
        variant: "destructive",
      });
    },
  });

  // Bulk comment mutation
  const bulkCommentMutation = useMutation({
    mutationFn: async (data: { taskIds: string[], message: string }) => {
      return apiRequest("POST", "/api/admin/tasks/bulk-comment", data);
    },
    onSuccess: () => {
      toast({
        title: "Comments Added",
        description: `Successfully added comment to ${selectedTasks.length} tasks`,
      });
      setSelectedTasks([]);
      setBulkComment("");
      refetchTasks();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comments",
        variant: "destructive",
      });
    },
  });

  // Handle task selection
  const handleTaskSelect = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks([...selectedTasks, taskId]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && tasks) {
      setSelectedTasks(tasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  // Handle bulk updates
  const handleBulkUpdate = () => {
    const updates: any = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkPriority) updates.priority = bulkPriority;
    
    if (Object.keys(updates).length > 0) {
      bulkUpdateMutation.mutate({ taskIds: selectedTasks, updates });
    }
  };

  // Handle bulk comment
  const handleBulkComment = () => {
    if (bulkComment.trim()) {
      bulkCommentMutation.mutate({ 
        taskIds: selectedTasks, 
        message: bulkComment.trim() 
      });
    }
  };

  // Filter tasks based on search
  const filteredTasks = tasks?.filter(task => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.studentName.toLowerCase().includes(searchLower) ||
      task.projectName.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Filter students based on search
  const filteredStudents = students?.filter(student => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      student.studentName.toLowerCase().includes(searchLower) ||
      student.studentEmail.toLowerCase().includes(searchLower) ||
      student.department?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center space-x-2 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <span className="text-muted-foreground">→</span>
        <span className="text-foreground font-medium">Team Tasks</span>
      </div>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Task Oversight</h1>
            <p className="text-muted-foreground">
              Monitor and manage all student tasks across projects
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={currentView === 'tasks' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('tasks')}
              >
                <Target className="h-4 w-4 mr-2" />
                Tasks
              </Button>
              <Button
                variant={currentView === 'students' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView('students')}
              >
                <Users className="h-4 w-4 mr-2" />
                Students
              </Button>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={currentView === 'tasks' ? "Search tasks, students, projects..." : "Search students..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle */}
            {currentView === 'tasks' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? <EyeOff className="h-4 w-4 ml-2" /> : <Eye className="h-4 w-4 ml-2" />}
              </Button>
            )}

            {/* Bulk Actions */}
            {selectedTasks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkActions(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions ({selectedTasks.length})
              </Button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && currentView === 'tasks' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="space-y-2 mt-2">
                    {['pending', 'in-progress', 'completed', 'blocked'].map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={statusFilter.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilter([...statusFilter, status]);
                            } else {
                              setStatusFilter(statusFilter.filter(s => s !== status));
                            }
                          }}
                        />
                        <Label htmlFor={`status-${status}`} className="capitalize">
                          {status.replace('-', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Level Filter */}
                <div>
                  <Label className="text-sm font-medium">Risk Level</Label>
                  <div className="space-y-2 mt-2">
                    {['low', 'medium', 'high'].map(risk => (
                      <div key={risk} className="flex items-center space-x-2">
                        <Checkbox
                          id={`risk-${risk}`}
                          checked={riskFilter.includes(risk)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setRiskFilter([...riskFilter, risk]);
                            } else {
                              setRiskFilter(riskFilter.filter(r => r !== risk));
                            }
                          }}
                        />
                        <Label htmlFor={`risk-${risk}`} className="capitalize">
                          {risk} Risk
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="space-y-2 mt-2">
                    {['low', 'medium', 'high', 'urgent'].map(priority => (
                      <div key={priority} className="flex items-center space-x-2">
                        <Checkbox
                          id={`priority-${priority}`}
                          checked={priorityFilter.includes(priority)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPriorityFilter([...priorityFilter, priority]);
                            } else {
                              setPriorityFilter(priorityFilter.filter(p => p !== priority));
                            }
                          }}
                        />
                        <Label htmlFor={`priority-${priority}`} className="capitalize">
                          {priority}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Filters */}
                <div>
                  <Label className="text-sm font-medium">Special Filters</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="needs-attention"
                        checked={needsAttention}
                        onCheckedChange={setNeedsAttention}
                      />
                      <Label htmlFor="needs-attention">
                        Needs Attention
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="recently-active"
                        checked={recentlyActive}
                        onCheckedChange={setRecentlyActive}
                      />
                      <Label htmlFor="recently-active">
                        Recently Active
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter([]);
                    setRiskFilter([]);
                    setPriorityFilter([]);
                    setProgressMin(0);
                    setProgressMax(100);
                    setNeedsAttention(false);
                    setRecentlyActive(false);
                  }}
                >
                  Clear All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks View */}
        {currentView === 'tasks' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Team Tasks
                  {filteredTasks.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredTasks.length} tasks)
                    </span>
                  )}
                </CardTitle>
                {selectedTasks.length > 0 && (
                  <Badge variant="secondary">
                    {selectedTasks.length} selected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No tasks found</p>
                  <p className="text-sm">
                    Try adjusting your filters or search criteria
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTasks.length === filteredTasks.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Last Update</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTasks.includes(task.id)}
                              onCheckedChange={(checked) => 
                                handleTaskSelect(task.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{task.studentName}</p>
                              <p className="text-sm text-muted-foreground">
                                {task.studentEmail}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{task.projectName}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                              {task.status.replace('-', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Progress value={task.progressPct} className="h-2" />
                              <p className="text-sm text-muted-foreground">
                                {task.progressPct}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={riskColors[task.riskLevel]}>
                              {task.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              <div className={`text-sm ${task.isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                {format(new Date(task.dueDate), "MMM d, yyyy")}
                                {task.isOverdue && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span className="text-xs">Overdue</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No deadline</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {task.daysSinceLastUpdate === 0 ? (
                                <span className="text-green-600">Today</span>
                              ) : task.daysSinceLastUpdate === 1 ? (
                                <span>Yesterday</span>
                              ) : task.daysSinceLastUpdate > 7 ? (
                                <span className="text-red-600 font-medium">
                                  {task.daysSinceLastUpdate} days ago
                                </span>
                              ) : (
                                <span>{task.daysSinceLastUpdate} days ago</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Students View */}
        {currentView === 'students' && (
          <Card>
            <CardHeader>
              <CardTitle>
                Student Performance Overview
                {filteredStudents.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({filteredStudents.length} students)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full" />
                  ))}
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No students found</p>
                  <p className="text-sm">
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => (
                    <Card key={student.studentId} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{student.studentName}</h3>
                            <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                            {student.department && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {student.department}
                              </p>
                            )}
                          </div>
                          <Badge className={riskColors[student.riskLevel]}>
                            {student.riskLevel} risk
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Task Summary */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="text-center">
                              <p className="text-2xl font-bold">{student.totalTasks}</p>
                              <p className="text-muted-foreground">Total Tasks</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{student.completedTasks}</p>
                              <p className="text-muted-foreground">Completed</p>
                            </div>
                          </div>

                          {/* Progress Metrics */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Completion Rate</span>
                              <span className="font-medium">{student.completionRate}%</span>
                            </div>
                            <Progress value={student.completionRate} className="h-2" />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Avg Progress</span>
                              <span className="font-medium">{student.avgProgress}%</span>
                            </div>
                            <Progress value={student.avgProgress} className="h-2" />
                          </div>

                          {/* Risk Indicators */}
                          {(student.overdueTasks > 0 || student.blockedTasks > 0) && (
                            <div className="space-y-1">
                              {student.overdueTasks > 0 && (
                                <div className="flex items-center gap-2 text-sm text-red-600">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>{student.overdueTasks} overdue task{student.overdueTasks > 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {student.blockedTasks > 0 && (
                                <div className="flex items-center gap-2 text-sm text-orange-600">
                                  <Clock className="h-4 w-4" />
                                  <span>{student.blockedTasks} blocked task{student.blockedTasks > 1 ? 's' : ''}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Last Activity */}
                          {student.lastActivity && (
                            <div className="text-xs text-muted-foreground">
                              Last activity: {format(new Date(student.lastActivity), "MMM d, h:mm a")}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActions} onOpenChange={setShowBulkActions}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Actions ({selectedTasks.length} tasks)</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Bulk Updates */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Update Tasks</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Change Status</Label>
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Change Priority</Label>
                  <Select value={bulkPriority} onValueChange={setBulkPriority}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleBulkUpdate}
                disabled={!bulkStatus && !bulkPriority || bulkUpdateMutation.isPending}
                className="w-full"
              >
                {bulkUpdateMutation.isPending ? "Updating..." : "Update Selected Tasks"}
              </Button>
            </div>

            {/* Bulk Comment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add Comment to All</h3>
              
              <Textarea
                placeholder="Add a comment to all selected tasks..."
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                rows={3}
              />

              <Button 
                onClick={handleBulkComment}
                disabled={!bulkComment.trim() || bulkCommentMutation.isPending}
                className="w-full"
                variant="outline"
              >
                {bulkCommentMutation.isPending ? "Adding..." : "Add Comment to Selected Tasks"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
