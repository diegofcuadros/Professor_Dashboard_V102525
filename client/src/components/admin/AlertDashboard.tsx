import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiRequestJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Target, 
  TrendingDown,
  Settings,
  RefreshCw,
  Bell,
  BellOff,
  Mail,
  Eye,
  EyeOff,
  Zap,
  Filter,
  Search
} from "lucide-react";
import { format } from "date-fns";

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  userId?: string;
  projectId?: string;
  taskId?: string;
  data?: any;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  // Enhanced context
  studentName?: string;
  studentEmail?: string;
  projectName?: string;
  taskTitle?: string;
}

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: {
    task_overdue?: number;
    student_inactive?: number;
    project_risk?: number;
    velocity_drop?: number;
    task_blocked?: number;
  };
}

interface AlertConfiguration {
  id: string;
  alertType: string;
  isEnabled: boolean;
  thresholds: any;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  maxAlertsPerDay: number;
  cooldownHours: number;
}

const severityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const severityIcons = {
  low: Bell,
  medium: AlertTriangle,
  high: AlertTriangle,
  critical: AlertTriangle,
};

const alertTypeLabels = {
  task_overdue: "Task Overdue",
  student_inactive: "Student Inactive", 
  project_risk: "Project Risk",
  velocity_drop: "Velocity Drop",
  task_blocked: "Task Blocked",
};

const alertTypeIcons = {
  task_overdue: Clock,
  student_inactive: Users,
  project_risk: Target,
  velocity_drop: TrendingDown,
  task_blocked: AlertTriangle,
};

export default function AlertDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfigs, setShowConfigs] = useState(false);

  // API Queries
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<Alert[]>({
    queryKey: ['/api/admin/alerts'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: alertStats, isLoading: statsLoading } = useQuery<AlertStats>({
    queryKey: ['/api/admin/alerts/stats'],
    refetchInterval: 60000, // Refresh stats every minute
  });

  const { data: alertConfigs, isLoading: configsLoading } = useQuery<AlertConfiguration[]>({
    queryKey: ['/api/admin/alert-configs'],
    enabled: showConfigs,
  });

  // Mutations
  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string, reason?: string }) => {
      return apiRequest("PATCH", `/api/admin/alerts/${alertId}/resolve`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Alert Resolved",
        description: "Alert has been successfully resolved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/alerts/stats'] });
      setSelectedAlert(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resolve alert",
        variant: "destructive",
      });
    },
  });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      return apiRequestJson("POST", "/api/admin/alerts/generate");
    },
    onSuccess: (data: any) => {
      toast({
        title: "Alerts Generated",
        description: `Generated ${data.generatedAlerts} new alerts`,
      });
      refetchAlerts();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate alerts",
        variant: "destructive",
      });
    },
  });

  // Filter alerts
  const filteredAlerts = alerts?.filter(alert => {
    if (!showResolved && alert.isResolved) return false;
    
    if (severityFilter.length > 0 && !severityFilter.includes(alert.severity)) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(alert.type)) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        alert.title.toLowerCase().includes(searchLower) ||
        alert.message.toLowerCase().includes(searchLower) ||
        alert.studentName?.toLowerCase().includes(searchLower) ||
        alert.projectName?.toLowerCase().includes(searchLower) ||
        alert.taskTitle?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  }) || [];

  const handleResolveAlert = (alert: Alert, reason?: string) => {
    resolveAlertMutation.mutate({ alertId: alert.id, reason });
  };

  const getAlertTypeIcon = (type: string) => {
    const IconComponent = alertTypeIcons[type as keyof typeof alertTypeIcons] || Bell;
    return IconComponent;
  };

  const getSeverityIcon = (severity: string) => {
    const IconComponent = severityIcons[severity as keyof typeof severityIcons] || Bell;
    return IconComponent;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alert Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage automated system alerts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigs(!showConfigs)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAlertsMutation.mutate()}
            disabled={generateAlertsMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generateAlertsMutation.isPending ? 'animate-spin' : ''}`} />
            Check Now
          </Button>
        </div>
      </div>

      {/* Alert Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Bell className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : alertStats?.total || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : alertStats?.critical || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">High</p>
                <p className="text-2xl font-bold text-orange-600">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : alertStats?.high || 0}
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
                <p className="text-sm font-medium text-muted-foreground">Medium</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : alertStats?.medium || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Low</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statsLoading ? <Skeleton className="h-8 w-12" /> : alertStats?.low || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <Label>Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <Label>Severity</Label>
              <Select value={severityFilter.join(',')} onValueChange={(value) => setSeverityFilter(value ? value.split(',') : [])}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <Label>Alert Type</Label>
              <Select value={typeFilter.join(',')} onValueChange={(value) => setTypeFilter(value ? value.split(',') : [])}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task_overdue">Task Overdue</SelectItem>
                  <SelectItem value="student_inactive">Student Inactive</SelectItem>
                  <SelectItem value="project_risk">Project Risk</SelectItem>
                  <SelectItem value="velocity_drop">Velocity Drop</SelectItem>
                  <SelectItem value="task_blocked">Task Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Resolved */}
            <div className="flex items-center space-x-2 mt-6">
              <Switch
                id="show-resolved"
                checked={showResolved}
                onCheckedChange={setShowResolved}
              />
              <Label htmlFor="show-resolved">Show Resolved</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Active Alerts
              {filteredAlerts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({filteredAlerts.length} alerts)
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {alertsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No alerts found</p>
              <p className="text-sm">
                {showResolved ? "No alerts match your filters" : "All systems operating normally"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const TypeIcon = getAlertTypeIcon(alert.type);
                const SeverityIcon = getSeverityIcon(alert.severity);
                
                return (
                  <div 
                    key={alert.id} 
                    className={`p-4 border rounded-lg ${alert.isResolved ? 'bg-gray-50 opacity-75' : 'bg-white'} hover:shadow-md transition-shadow cursor-pointer`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-100' : alert.severity === 'high' ? 'bg-orange-100' : alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                            <TypeIcon className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-red-600' : alert.severity === 'high' ? 'text-orange-600' : alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-foreground">{alert.title}</h3>
                            <Badge className={severityColors[alert.severity]}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">
                              {alertTypeLabels[alert.type as keyof typeof alertTypeLabels] || alert.type}
                            </Badge>
                            {alert.isResolved && (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{format(new Date(alert.createdAt), "MMM d, h:mm a")}</span>
                            {alert.studentName && (
                              <span>Student: {alert.studentName}</span>
                            )}
                            {alert.projectName && (
                              <span>Project: {alert.projectName}</span>
                            )}
                            {alert.taskTitle && (
                              <span>Task: {alert.taskTitle}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!alert.isResolved && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolveAlert(alert);
                          }}
                          disabled={resolveAlertMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAlert?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={severityColors[selectedAlert.severity]}>
                  {selectedAlert.severity}
                </Badge>
                <Badge variant="outline">
                  {alertTypeLabels[selectedAlert.type as keyof typeof alertTypeLabels] || selectedAlert.type}
                </Badge>
                {selectedAlert.isResolved && (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Resolved
                  </Badge>
                )}
              </div>
              
              <p className="text-muted-foreground">{selectedAlert.message}</p>
              
              {selectedAlert.data && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Additional Details:</h4>
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(selectedAlert.data, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Created:</strong> {format(new Date(selectedAlert.createdAt), "MMM d, yyyy h:mm a")}
                </div>
                <div>
                  <strong>Updated:</strong> {format(new Date(selectedAlert.updatedAt), "MMM d, yyyy h:mm a")}
                </div>
                {selectedAlert.studentName && (
                  <div>
                    <strong>Student:</strong> {selectedAlert.studentName}
                  </div>
                )}
                {selectedAlert.projectName && (
                  <div>
                    <strong>Project:</strong> {selectedAlert.projectName}
                  </div>
                )}
              </div>
              
              {!selectedAlert.isResolved && (
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    onClick={() => handleResolveAlert(selectedAlert)}
                    disabled={resolveAlertMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Resolve Alert
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
