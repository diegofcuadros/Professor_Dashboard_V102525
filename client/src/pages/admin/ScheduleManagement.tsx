import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ScheduleCompliance from "@/components/schedule/ScheduleCompliance";
import { 
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Download,
  Upload,
  Users,
  TrendingUp,
  AlertTriangle,
  Home
} from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description: string;
  taskType: string;
  approved: boolean;
  user?: User;
  projectName?: string;
}

interface WorkSchedule {
  id: string;
  userId: string;
  weekStartDate: string;
  totalScheduledHours: number;
  approved: boolean;
  status: string;
  notes?: string;
  user?: User;
}

export default function ScheduleManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateEntry, setShowCreateEntry] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [viewMode, setViewMode] = useState<'team' | 'individual'>('team');
  
  // Form states
  const [entryDate, setEntryDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState("research");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Fetch time entries
  const { data: timeEntries, isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: [`/api/time-entries?weekStart=${selectedWeek}`],
    retry: false,
  });

  // Fetch work schedules
  const { data: schedules, isLoading: schedulesLoading } = useQuery<WorkSchedule[]>({
    queryKey: [`/api/work-schedules?weekStart=${selectedWeek}`],
    retry: false,
  });

  // Fetch users for assignment
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Create time entry mutation
  const createTimeEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/time-entries", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Time entry created successfully",
      });
      setShowCreateEntry(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create time entry",
        variant: "destructive",
      });
    },
  });

  // Approve schedule mutation
  const approveScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      return await apiRequest("PUT", `/api/work-schedules/${scheduleId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Schedule approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-schedules"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve schedule",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setEntryDate(getTodayDate());
    setStartTime("");
    setEndTime("");
    setDescription("");
    setTaskType("research");
    setSelectedUserId("");
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startTime || !endTime || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Calculate duration
    const duration = calculateDuration(startTime, endTime);
    if (duration <= 0) {
      toast({
        title: "Invalid Time",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    createTimeEntryMutation.mutate({
      userId: user?.id,
      date: entryDate,
      startTime,
      endTime,
      duration,
      description,
      taskType,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const getTaskTypeBadge = (taskType: string) => {
    const colors = {
      research: 'bg-blue-100 text-blue-800',
      development: 'bg-green-100 text-green-800',
      analysis: 'bg-purple-100 text-purple-800',
      meeting: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[taskType as keyof typeof colors] || colors.other}>{taskType}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center space-x-2 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="nav-home">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
        <span className="text-muted-foreground">→</span>
        <span className="text-foreground font-medium">Schedule Management</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Schedule Management</h1>
          <p className="text-muted-foreground">
            Manage team schedules, time tracking, and work approvals
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" data-testid="button-export-schedules">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          
          <Dialog open={showCreateEntry} onOpenChange={setShowCreateEntry}>
            <DialogTrigger asChild>
              <Button data-testid="button-log-time">
                <Plus className="mr-2 h-4 w-4" />
                Log Time
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Log Time Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateEntry} className="space-y-4">
                <div>
                  <Label htmlFor="entry-date">Date</Label>
                  <Input
                    id="entry-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="mt-2"
                    data-testid="input-entry-date"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-2"
                      data-testid="input-start-time"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-2"
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="task-type">Task Type</Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger className="mt-2" data-testid="select-task-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you work on?"
                    className="mt-2"
                    data-testid="textarea-description"
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateEntry(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTimeEntryMutation.isPending}
                    data-testid="button-submit-entry"
                  >
                    {createTimeEntryMutation.isPending ? "Saving..." : "Log Time"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="compliance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compliance">Schedule Compliance</TabsTrigger>
          <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
          <TabsTrigger value="schedules">Work Schedules</TabsTrigger>
          <TabsTrigger value="analytics">Time Analytics</TabsTrigger>
        </TabsList>

        {/* Schedule Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <ScheduleCompliance />
        </TabsContent>

        {/* Time Entries Tab */}
        <TabsContent value="time-entries" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Time Entries</h2>
            <div className="flex items-center space-x-4">
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={getCurrentWeek()}>This Week</SelectItem>
                  <SelectItem value={getLastWeek()}>Last Week</SelectItem>
                  <SelectItem value={getNextWeek()}>Next Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Task Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries?.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'Unknown User'}
                      </TableCell>
                      <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                      <TableCell>{entry.duration}h</TableCell>
                      <TableCell>{getTaskTypeBadge(entry.taskType)}</TableCell>
                      <TableCell className="max-w-48 truncate">{entry.description}</TableCell>
                      <TableCell>
                        {entry.approved ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                          {!entry.approved && (user?.role === 'admin' || user?.role === 'professor') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!timeEntries?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No time entries found for this period</p>
                  <p className="text-sm">Start by logging your first time entry</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Schedules Tab */}
        <TabsContent value="schedules" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Work Schedules</h2>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import Schedule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules?.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {schedule.user ? `${schedule.user.firstName} ${schedule.user.lastName}` : 'Unknown User'}
                    </CardTitle>
                    {getStatusBadge(schedule.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Week of {new Date(schedule.weekStartDate).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Scheduled Hours:</span>
                      <span className="text-sm">{schedule.totalScheduledHours}h</span>
                    </div>
                    
                    {schedule.notes && (
                      <div>
                        <span className="text-sm font-medium">Notes:</span>
                        <p className="text-sm text-muted-foreground mt-1">{schedule.notes}</p>
                      </div>
                    )}
                    
                    {!schedule.approved && (user?.role === 'admin' || user?.role === 'professor') && (
                      <div className="flex space-x-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => approveScheduleMutation.mutate(schedule.id)}
                          disabled={approveScheduleMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!schedules?.length && (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No schedules found</p>
                <p className="text-muted-foreground">Team schedules will appear here when submitted</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Time Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Time Analytics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">
                      {timeEntries?.reduce((sum, entry) => sum + entry.duration, 0).toFixed(1) || '0'}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">
                      {timeEntries?.filter(entry => entry.approved).length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">
                      {timeEntries?.filter(entry => !entry.approved).length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">
                      {new Set(timeEntries?.map(entry => entry.userId)).size || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Time Distribution by Task Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['research', 'development', 'analysis', 'meeting', 'other'].map(taskType => {
                  const typeEntries = timeEntries?.filter(entry => entry.taskType === taskType) || [];
                  const totalHours = typeEntries.reduce((sum, entry) => sum + entry.duration, 0);
                  const percentage = timeEntries?.length ? (totalHours / timeEntries.reduce((sum, entry) => sum + entry.duration, 0)) * 100 : 0;
                  
                  return (
                    <div key={taskType} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getTaskTypeBadge(taskType)}
                        <span className="text-sm capitalize">{taskType}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium">{totalHours.toFixed(1)}h</span>
                        <span className="text-sm text-muted-foreground">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function getCurrentWeek(): string {
  const today = new Date();
  const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  return monday.toISOString().split('T')[0];
}

function getLastWeek(): string {
  const today = new Date();
  const lastWeek = new Date(today.setDate(today.getDate() - 7));
  const monday = new Date(lastWeek.setDate(lastWeek.getDate() - lastWeek.getDay() + 1));
  return monday.toISOString().split('T')[0];
}

function getNextWeek(): string {
  const today = new Date();
  const nextWeek = new Date(today.setDate(today.getDate() + 7));
  const monday = new Date(nextWeek.setDate(nextWeek.getDate() - nextWeek.getDay() + 1));
  return monday.toISOString().split('T')[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  return (endTotalMinutes - startTotalMinutes) / 60;
}