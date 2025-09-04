import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequestJson } from "@/lib/queryClient";
import { 
  Users, 
  Eye, 
  Search, 
  Filter,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  BarChart3,
  MessageSquare
} from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  yearLevel: string;
  specialization: string;
  isActive: boolean;
}

interface StudentDashboardData {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  metrics: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    totalHoursScheduled: number;
    unreadNotifications: number;
    productivityScore: number;
    riskLevel: string;
  };
  recentActivity: {
    progressUpdates: Array<any>;
    recentTasks: Array<any>;
  };
  productivity: {
    currentScore: number;
    riskLevel: string;
    recommendations: string[];
    lastAnalyzed: string;
  };
}

export default function StudentDashboardViewer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showMessage, setShowMessage] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  // Fetch all students
  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/users"],
    retry: false,
    enabled: user?.role === 'admin' || user?.role === 'professor',
  });

  // Fetch selected student's dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<StudentDashboardData>({
    queryKey: [`/api/users/${selectedStudent?.id}/dashboard-metrics`],
    retry: false,
    enabled: !!selectedStudent?.id && (user?.role === 'admin' || user?.role === 'professor'),
  });

  // Phase 1: Professor overview for selected student
  const { data: studentOverview } = useQuery<any>({
    queryKey: selectedStudent?.id ? [`/api/students/${selectedStudent.id}/overview`] : ["/noop"],
    retry: false,
    enabled: !!selectedStudent?.id && (user?.role === 'admin' || user?.role === 'professor'),
  });

  // Phase 1: Professor schedule view for selected student and current week
  const getCurrentWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7; // 0 for Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return format(monday, 'yyyy-MM-dd');
  };

  const getPastWeek = () => {
    const now = new Date();
    now.setDate(now.getDate() - 7);
    const day = now.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    return format(monday, 'yyyy-MM-dd');
  };

  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeek());

  const { data: studentSchedules, isLoading: schedulesLoading } = useQuery<any[]>({
    queryKey: selectedStudent?.id ? [`/api/students/${selectedStudent.id}/schedules?weekStart=${selectedWeek}`] : ["/noop"],
    retry: false,
    enabled: !!selectedStudent?.id && !!selectedWeek && (user?.role === 'admin' || user?.role === 'professor'),
  });

  // Phase 1: Fetch tasks for selected student
  const { data: studentTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: selectedStudent?.id ? [`/api/students/${selectedStudent.id}/tasks`] : ["/noop"],
    retry: false,
    enabled: !!selectedStudent?.id && (user?.role === 'admin' || user?.role === 'professor'),
  });

  // Fetch schedule blocks for the first schedule
  const currentScheduleId = studentSchedules?.[0]?.id;
  const { data: scheduleBlocks } = useQuery<any[]>({
    queryKey: currentScheduleId ? [`/api/work-schedules/${currentScheduleId}/blocks`] : ["/noop"],
    retry: false,
    enabled: !!currentScheduleId,
  });

  // Professor edit state for blocks
  const [editingBlock, setEditingBlock] = useState<any | null>(null);
  const [showAddProfessorBlock, setShowAddProfessorBlock] = useState(false);
  const addForm: any = { dayOfWeek: 'monday', startTime: '09:00', endTime: '17:00', location: 'lab', plannedActivity: 'research' };

  const addBlockMutation = useMutation({
    mutationFn: async ({ scheduleId, blockData }: { scheduleId: string; blockData: any }) =>
      apiRequestJson("POST", `/api/work-schedules/${scheduleId}/blocks`, blockData),
    onSuccess: () => {
      if (currentScheduleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-schedules/${currentScheduleId}/blocks`] });
      }
      setShowAddProfessorBlock(false);
    }
  });

  const updateBlockMutation = useMutation({
    mutationFn: async ({ scheduleId, blockId, updates }: { scheduleId: string; blockId: string; updates: any }) =>
      apiRequestJson("PUT", `/api/work-schedules/${scheduleId}/blocks/${blockId}`, updates),
    onSuccess: () => {
      if (currentScheduleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-schedules/${currentScheduleId}/blocks`] });
      }
      setEditingBlock(null);
    }
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async ({ scheduleId, blockId }: { scheduleId: string; blockId: string }) =>
      apiRequestJson("DELETE", `/api/work-schedules/${scheduleId}/blocks/${blockId}`),
    onSuccess: () => {
      if (currentScheduleId) {
        queryClient.invalidateQueries({ queryKey: [`/api/work-schedules/${currentScheduleId}/blocks`] });
      }
    }
  });

  // Helper: compute end time by adding hours (decimal) to HH:MM start time
  function computeEndTime(startTime: string, hours: number): string {
    if (!startTime || !Number.isFinite(hours)) return startTime;
    const [h, m] = startTime.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const added = Math.round(hours * 60);
    const endMinutes = startMinutes + added;
    const endH = Math.floor((endMinutes % (24 * 60)) / 60);
    const endM = endMinutes % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(endH)}:${pad(endM)}`;
  }

  // Helpers for schedule comments
  const fetchComments = async (scheduleId: string) => apiRequestJson<any[]>("GET", `/api/schedules/${scheduleId}/comments`);
  const addComment = useMutation({
    mutationFn: async ({ scheduleId, comment }: { scheduleId: string; comment: string }) =>
      apiRequestJson<any>("POST", `/api/schedules/${scheduleId}/comment`, { comment }),
    onSuccess: (_d, v) => queryClient.invalidateQueries({ queryKey: [`/api/schedules/${v.scheduleId}/comments`] }),
  });

  const sendMessage = useMutation({
    mutationFn: async () => apiRequestJson("POST", "/api/messages/send", {
      recipientId: selectedStudent?.id,
      subject: messageSubject.trim(),
      message: messageBody.trim(),
    }),
    onSuccess: () => {
      setShowMessage(false);
      setMessageSubject("");
      setMessageBody("");
    },
  });

  // Filter students
  const filteredStudents = students?.filter(student => {
    if (student.role !== 'student') return false;
    
    const matchesSearch = searchTerm === "" || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || student.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  }) || [];

  // Get unique departments for filter
  const departments = [...new Set(students?.filter(s => s.role === 'student' && s.department).map(s => s.department))];

  const getStatusColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Student Dashboard Viewer</h2>
          <p className="text-muted-foreground">
            View individual student progress, schedules, and performance analytics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept || ""}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {studentsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading students...</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">No students found</div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedStudent?.id === student.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {student.email}
                          </p>
                          {student.department && (
                            <p className="text-xs text-muted-foreground">
                              {student.department}
                            </p>
                          )}
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Dashboard */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Student Info Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{studentOverview?.firstName || selectedStudent.firstName} {studentOverview?.lastName || selectedStudent.lastName}</CardTitle>
                        <p className="text-muted-foreground">{studentOverview?.email || selectedStudent.email}</p>
                      </div>
                    </div>
                    <Badge variant={(studentOverview?.isActive ?? selectedStudent.isActive) ? "default" : "secondary"}>
                      {(studentOverview?.isActive ?? selectedStudent.isActive) ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-medium">{studentOverview?.department || selectedStudent.department || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Year Level:</span>
                      <p className="font-medium">{studentOverview?.yearLevel || selectedStudent.yearLevel || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Specialization:</span>
                      <p className="font-medium">{studentOverview?.specialization || selectedStudent.specialization || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Metrics Tabs */}
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="schedule">Schedule</TabsTrigger>
                  <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {dashboardLoading ? (
                    <Card>
                      <CardContent className="p-6 text-center">Loading metrics...</CardContent>
                    </Card>
                  ) : (dashboardData || studentOverview) ? (
                    <>
                      {studentOverview && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Student Information</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium">{studentOverview.firstName} {studentOverview.lastName}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{studentOverview.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Department</p>
                                <p className="font-medium">{studentOverview.department || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Year Level</p>
                                <p className="font-medium">{studentOverview.yearLevel || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Specialization</p>
                                <p className="font-medium">{studentOverview.specialization || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge variant={studentOverview.isActive ? "default" : "secondary"}>
                                  {studentOverview.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Key & Additional Metrics + Performance */}
                      {dashboardData?.metrics && (
                        <>
                          {/* Key Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Total Projects */}
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                                    <p className="text-2xl font-bold">{dashboardData.metrics.totalProjects}</p>
                                  </div>
                                  <BarChart3 className="h-6 w-6 text-blue-500" />
                                </div>
                              </CardContent>
                            </Card>
                            {/* Total Tasks */}
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                                    <p className="text-2xl font-bold">{dashboardData.metrics.totalTasks}</p>
                                  </div>
                                  <BarChart3 className="h-6 w-6 text-blue-500" />
                                </div>
                              </CardContent>
                            </Card>
                            {/* Completed Tasks */}
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold text-green-600">{dashboardData.metrics.completedTasks}</p>
                                  </div>
                                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                                </div>
                              </CardContent>
                            </Card>
                            {/* In Progress */}
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                                    <p className="text-2xl font-bold text-yellow-600">{dashboardData.metrics.inProgressTasks}</p>
                                  </div>
                                  <Clock className="h-6 w-6 text-yellow-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Additional Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Hours Scheduled</p>
                                    <p className="text-2xl font-bold">{dashboardData.metrics.totalHoursScheduled}h</p>
                                  </div>
                                  <Clock className="h-6 w-6 text-blue-500" />
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Unread Notifications</p>
                                    <p className="text-2xl font-bold">{dashboardData.metrics.unreadNotifications}</p>
                                  </div>
                                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Risk Level</p>
                                    <Badge variant={dashboardData.metrics.riskLevel === 'high' ? 'destructive' : dashboardData.metrics.riskLevel === 'medium' ? 'secondary' : 'default'}>
                                      {dashboardData.metrics.riskLevel?.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <BarChart3 className="h-6 w-6 text-red-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Completion Rate & Productivity */}
                          <Card>
                            <CardHeader>
                              <CardTitle>Performance Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Task Completion Rate</span>
                                    <span className="text-sm font-medium">
                                      {dashboardData.metrics.totalTasks > 0 ? Math.round((dashboardData.metrics.completedTasks / dashboardData.metrics.totalTasks) * 100) : 0}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-2">
                                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${dashboardData.metrics.totalTasks > 0 ? (dashboardData.metrics.completedTasks / dashboardData.metrics.totalTasks) * 100 : 0}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Productivity Score</span>
                                    <Badge variant={getStatusBadge(dashboardData.metrics.productivityScore)}>{dashboardData.metrics.productivityScore}/100</Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        No dashboard data available
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="tasks">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Tasks & Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {tasksLoading ? (
                        <div className="text-center py-6 text-muted-foreground">Loading tasks…</div>
                      ) : (studentTasks && studentTasks.length > 0) ? (
                        <div className="space-y-3">
                          {studentTasks.map((task: any) => (
                            <div key={task.id} className="p-3 border rounded">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <span className="font-medium">{task.title}</span>
                                  {task.projectName && (
                                    <div className="text-sm text-muted-foreground">Project: {task.projectName}</div>
                                  )}
                                  {task.dueDate && (
                                    <div className="text-sm text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant={task.status === 'completed' ? 'default' : task.status === 'in_progress' ? 'secondary' : 'outline'}>
                                    {task.status}
                                  </Badge>
                                  {task.priority && (
                                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                      {task.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {typeof task.progressPercentage === 'number' && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Progress</span>
                                    <span>{task.progressPercentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${task.progressPercentage}%` }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No tasks assigned</p>
                        </div>
                      )}

                      {/* Progress Updates */}
                      {dashboardData?.recentActivity?.progressUpdates?.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className="font-medium">Recent Progress Updates</h4>
                          {dashboardData.recentActivity.progressUpdates.map((update: any, index: number) => (
                            <div key={index} className="flex items-start gap-3 p-3 border rounded">
                              <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                              <div className="flex-1">
                                <p className="text-sm">{update.description || update.notes || 'Progress update'}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {update.createdAt ? new Date(update.createdAt).toLocaleString() : 'Recent'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="schedule">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Schedule Information</CardTitle>
                        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={getCurrentWeek()}>Current Week</SelectItem>
                            <SelectItem value={getPastWeek()}>Past Week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {schedulesLoading ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Loading schedule…</p>
                        </div>
                      ) : (studentSchedules && studentSchedules.length > 0) ? (
                        <div className="space-y-3">
                          {studentSchedules.map((s: any) => (
                            <div key={s.id} className="p-3 border rounded">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">Week starting {new Date(s.weekStartDate).toLocaleDateString()}</div>
                                  <div className="text-sm text-muted-foreground">Status: {s.status}{s.approved ? ' (Approved)' : ''}</div>
                                </div>
                                <div className="text-sm">Total scheduled: {s.totalScheduledHours ?? 0}h</div>
                              </div>
                              {s.id === currentScheduleId && scheduleBlocks && scheduleBlocks.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <div className="text-sm font-medium">Schedule Details</div>
                                  <div className="grid grid-cols-1 gap-2">
                                    {scheduleBlocks.map((block: any) => (
                                      <div key={block.id} className="p-2 bg-muted rounded text-sm">
                                        {editingBlock && editingBlock.id === block.id ? (
                                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                                            <Input defaultValue={block.dayOfWeek} onChange={(e) => (editingBlock.dayOfWeek = e.target.value)} />
                                            <Input defaultValue={block.startTime} onChange={(e) => (editingBlock.startTime = e.target.value)} />
                                            <Input defaultValue={block.endTime} onChange={(e) => (editingBlock.endTime = e.target.value)} />
                                            <Input defaultValue={block.location} onChange={(e) => (editingBlock.location = e.target.value)} />
                                            <div className="flex gap-2">
                                              <Input defaultValue={block.plannedActivity} onChange={(e) => (editingBlock.plannedActivity = e.target.value)} />
                                              <Button size="sm" onClick={() => updateBlockMutation.mutate({ scheduleId: s.id, blockId: block.id, updates: editingBlock })}>Save</Button>
                                              <Button size="sm" variant="ghost" onClick={() => setEditingBlock(null)}>Cancel</Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <span className="font-medium">{block.dayOfWeek}</span>
                                                <span className="ml-2">{block.startTime} - {block.endTime}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">{block.location || 'No location'}</Badge>
                                                {(user?.role === 'admin' || user?.role === 'professor') && (
                                                  <div className="flex gap-1">
                                                    <Button size="sm" variant="outline" onClick={() => setEditingBlock(block)}>Edit</Button>
                                                    <Button size="sm" variant="outline" onClick={() => deleteBlockMutation.mutate({ scheduleId: s.id, blockId: block.id })}>Delete</Button>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div className="mt-1 text-muted-foreground">{block.plannedActivity || 'No activity specified'}</div>
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {(user?.role === 'admin' || user?.role === 'professor') && selectedWeek === getCurrentWeek() && (
                                    <div className="pt-2">
                                      <Button size="sm" variant="outline" onClick={() => setShowAddProfessorBlock(true)}>Add Block</Button>
                                      {showAddProfessorBlock && (
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-6 gap-2">
                                          <Input placeholder="Day (monday)" onChange={(e) => (addForm.dayOfWeek = e.target.value)} />
                                          <Input placeholder="Start (09:00)" onChange={(e) => (addForm.startTime = e.target.value)} />
                                          <Input placeholder="Hours (e.g. 2.5)" onChange={(e) => (addForm.hours = parseFloat(e.target.value || '0'))} />
                                          <Input placeholder="Location (lab)" onChange={(e) => (addForm.location = e.target.value)} />
                                          <Input placeholder="Activity (research)" onChange={(e) => (addForm.plannedActivity = e.target.value)} />
                                          <div className="flex gap-2">
                                            <Button size="sm" onClick={() => {
                                              const end = computeEndTime(addForm.startTime, addForm.hours || 0);
                                              addBlockMutation.mutate({ scheduleId: s.id, blockData: { dayOfWeek: addForm.dayOfWeek, startTime: addForm.startTime, endTime: end, location: addForm.location, plannedActivity: addForm.plannedActivity } });
                                            }}>Save</Button>
                                            <Button size="sm" variant="ghost" onClick={() => setShowAddProfessorBlock(false)}>Cancel</Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              <CommentsSection
                                scheduleId={s.id}
                                fetchComments={fetchComments}
                                onAddComment={(text) => addComment.mutate({ scheduleId: s.id, comment: text })}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No schedule found for the selected week</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analysis">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Productivity Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboardLoading ? (
                        <div className="text-center py-6">Loading AI analysis...</div>
                      ) : dashboardData?.productivity ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded">
                              <h4 className="font-medium mb-2">Productivity Score</h4>
                              <p className={`text-2xl font-bold ${getStatusColor(dashboardData.productivity.currentScore)}`}>
                                {dashboardData.productivity.currentScore}/100
                              </p>
                            </div>
                            <div className="p-4 border rounded">
                              <h4 className="font-medium mb-2">Risk Level</h4>
                              <Badge variant={
                                dashboardData.productivity.riskLevel === 'high' ? 'destructive' :
                                dashboardData.productivity.riskLevel === 'medium' ? 'secondary' : 'default'
                              }>
                                {dashboardData.productivity.riskLevel?.toUpperCase() || 'LOW'}
                              </Badge>
                            </div>
                          </div>

                          {dashboardData.productivity.lastAnalyzed && (
                            <div className="p-4 bg-muted/30 rounded">
                              <p className="text-sm text-muted-foreground">
                                Last analyzed: {new Date(dashboardData.productivity.lastAnalyzed).toLocaleString()}
                              </p>
                            </div>
                          )}
                          
                          {dashboardData.productivity.recommendations?.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">AI Recommendations</h4>
                              <ul className="space-y-2">
                                {dashboardData.productivity.recommendations.map((rec: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">•</span>
                                    <span className="text-sm">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No analysis data available</p>
                          <p className="text-sm mt-1">AI analysis will appear here once student data is available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowMessage(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Schedule
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Dialog open={showMessage} onOpenChange={setShowMessage}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send message to {selectedStudent.firstName} {selectedStudent.lastName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Subject" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} />
                    <Textarea placeholder="Write your message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowMessage(false)}>Cancel</Button>
                    <Button onClick={() => sendMessage.mutate()} disabled={!messageSubject.trim() || !messageBody.trim() || sendMessage.isPending}>
                      {sendMessage.isPending ? 'Sending…' : 'Send'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a Student</h3>
                <p className="text-muted-foreground">
                  Choose a student from the list to view their dashboard and progress
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Lightweight comments section (internal component)
function CommentsSection({
  scheduleId,
  fetchComments,
  onAddComment,
}: {
  scheduleId: string;
  fetchComments: (scheduleId: string) => Promise<any[]>;
  onAddComment: (text: string) => void;
}) {
  const [comment, setComment] = useState("");
  const { data: comments } = useQuery<any[]>({
    queryKey: [`/api/schedules/${scheduleId}/comments`],
    queryFn: () => fetchComments(scheduleId),
    retry: false,
  });

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      <div className="text-sm font-medium">Comments</div>
      <div className="space-y-2">
        {(comments || []).map((c: any) => (
          <div key={c.id} className="text-sm text-muted-foreground">
            <span className="font-medium">{c.authorId?.slice(0, 6) || 'user'}:</span> {c.body}
          </div>
        ))}
        {(!comments || comments.length === 0) && (
          <div className="text-xs text-muted-foreground">No comments yet.</div>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add a comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button
          size="sm"
          onClick={() => {
            if (!comment.trim()) return;
            onAddComment(comment.trim());
            setComment("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}