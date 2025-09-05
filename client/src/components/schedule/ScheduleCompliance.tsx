import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  Filter
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ScheduleCompliance {
  scheduleId: string;
  userId: string;
  userName: string;
  weekStartDate: string;
  totalHours: number;
  approved: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  compliant: boolean;
  requiresAttention: boolean;
}

interface ComplianceStats {
  totalUsers: number;
  compliantUsers: number;
  pendingApprovals: number;
  averageHours: number;
}

export default function ScheduleCompliance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');

  // Fetch schedule compliance data
  const { data: complianceData, isLoading } = useQuery<ScheduleCompliance[]>({
    queryKey: [`/api/schedule-compliance?weekStart=${selectedWeek}`],
    retry: false,
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
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-compliance?weekStart=${selectedWeek}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve schedule",
        variant: "destructive",
      });
    },
  });

  const rejectScheduleMutation = useMutation({
    mutationFn: async ({ scheduleId, reason }: { scheduleId: string; reason?: string }) => {
      return await apiRequest("PUT", `/api/work-schedules/${scheduleId}/reject`, { reason: reason || 'No reason provided' });
    },
    onSuccess: () => {
      toast({
        title: "Rejected",
        description: "Schedule rejected",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-compliance?weekStart=${selectedWeek}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject schedule",
        variant: "destructive",
      });
    },
  });

  // Calculate compliance stats
  const stats: ComplianceStats = {
    totalUsers: complianceData?.length || 0,
    compliantUsers: complianceData?.filter(item => item.compliant).length || 0,
    pendingApprovals: complianceData?.filter(item => item.status === 'submitted').length || 0,
    averageHours: complianceData?.reduce((sum, item) => sum + item.totalHours, 0) / (complianceData?.length || 1) || 0
  };

  // Filter compliance data
  const filteredData = complianceData?.filter(item => {
    const statusMatch = statusFilter === 'all' || item.status === statusFilter;
    const complianceMatch = complianceFilter === 'all' || 
      (complianceFilter === 'compliant' && item.compliant) ||
      (complianceFilter === 'non-compliant' && !item.compliant) ||
      (complianceFilter === 'attention' && item.requiresAttention);
    
    return statusMatch && complianceMatch;
  }) || [];

  const getStatusBadge = (status: string, approved: boolean) => {
    if (approved) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
    }
  };

  const getComplianceBadge = (compliant: boolean, totalHours: number) => {
    if (compliant && totalHours >= 20) {
      return <Badge className="bg-green-100 text-green-800">✓ Compliant</Badge>;
    } else if (totalHours < 20) {
      return <Badge className="bg-red-100 text-red-800">⚠ Under 20h</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800">⚠ Issues</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Schedule Compliance</h2>
          <p className="text-muted-foreground">
            Monitor team schedule compliance and approve weekly schedules
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
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

      {/* Compliance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Team Members</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Compliant</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold">{stats.compliantUsers}</p>
                  <p className="text-sm text-muted-foreground">
                    ({stats.totalUsers > 0 ? Math.round((stats.compliantUsers / stats.totalUsers) * 100) : 0}%)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Average Hours</p>
                <p className="text-2xl font-bold">{stats.averageHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Status:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm">Compliance:</span>
                <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="compliant">Compliant</SelectItem>
                    <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                    <SelectItem value="attention">Needs Attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Schedule Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Week Starting</TableHead>
                <TableHead>Scheduled Hours</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, index) => (
                <TableRow key={`${item.userId}-${item.weekStartDate}`}>
                  <TableCell>
                    <div className="font-medium">{item.userName}</div>
                    <div className="text-sm text-muted-foreground">{item.userId.slice(-8)}</div>
                  </TableCell>
                  <TableCell>
                    {new Date(item.weekStartDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.totalHours}h</span>
                      {item.totalHours < 20 && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getComplianceBadge(item.compliant, item.totalHours)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status, item.approved)}
                  </TableCell>
                  <TableCell>
                    <div className="w-16">
                      <Progress 
                        value={Math.min((item.totalHours / 20) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {item.status === 'submitted' && !item.approved && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => approveScheduleMutation.mutate(item.scheduleId)}
                            disabled={approveScheduleMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => rejectScheduleMutation.mutate({ scheduleId: item.scheduleId })}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {item.requiresAttention && (
                        <Button size="sm" variant="outline">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schedule data found for the selected filters</p>
              <p className="text-sm">Team members will appear here when they submit schedules</p>
            </div>
          )}
        </CardContent>
      </Card>
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