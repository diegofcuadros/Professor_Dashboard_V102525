import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  FileText,
  Download,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  Home,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Share2
} from "lucide-react";
import { Link } from "wouter";
import type { User, Project } from "@shared/schema";

interface ReportData {
  id: string;
  title: string;
  type: string;
  generatedAt: string;
  createdBy: string;
  status: string;
  fileSize?: string;
  downloadUrl?: string;
}

interface ProductivityReport {
  userId: string;
  userName: string;
  totalHours: number;
  completedTasks: number;
  activeProjects: number;
  productivityScore: number;
  weeklyTrend: number[];
}

interface ProjectReport {
  projectId: string;
  projectName: string;
  status: string;
  progress: number;
  totalHours: number;
  teamSize: number;
  deadline: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function ReportsManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState("productivity");
  const [dateRange, setDateRange] = useState("last30days");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Form states for report generation
  const [reportTitle, setReportTitle] = useState("");
  const [reportFormat, setReportFormat] = useState("pdf");
  const [includeCharts, setIncludeCharts] = useState(true);

  // Fetch existing reports
  const { data: reports, isLoading: reportsLoading } = useQuery<ReportData[]>({
    queryKey: ["/api/reports"],
    retry: false,
  });

  // Fetch productivity reports
  const { data: productivityData, isLoading: productivityLoading } = useQuery<ProductivityReport[]>({
    queryKey: ["/api/reports/productivity", dateRange],
    retry: false,
  });

  // Fetch project reports
  const { data: projectData, isLoading: projectLoading } = useQuery<ProjectReport[]>({
    queryKey: ["/api/reports/projects", dateRange],
    retry: false,
  });

  // Fetch users for report filtering
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/reports/generate", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report generation started. You'll be notified when ready.",
      });
      setShowCreateReport(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  // Download report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return await apiRequest("GET", `/api/reports/${reportId}/download`, {});
    },
    onSuccess: (data: any, reportId) => {
      // Create download link
      const link = document.createElement('a');
      link.href = data.downloadUrl || '#';
      link.download = `report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "Report downloaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download report",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setReportTitle("");
    setSelectedReportType("productivity");
    setReportFormat("pdf");
    setIncludeCharts(true);
  };

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reportTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a report title",
        variant: "destructive",
      });
      return;
    }

    generateReportMutation.mutate({
      title: reportTitle,
      type: selectedReportType,
      format: reportFormat,
      dateRange,
      includeCharts,
      createdBy: user?.id,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'generating':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="h-3 w-3 mr-1" />Generating</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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
        <span className="text-foreground font-medium">Reports & Analytics</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports and export analytics data
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" data-testid="button-refresh-data">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          
          <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-report">
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGenerateReport} className="space-y-4">
                <div>
                  <Label htmlFor="report-title">Report Title</Label>
                  <Input
                    id="report-title"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Monthly Productivity Report"
                    className="mt-2"
                    data-testid="input-report-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger className="mt-2" data-testid="select-report-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="productivity">Team Productivity</SelectItem>
                      <SelectItem value="projects">Project Status</SelectItem>
                      <SelectItem value="time">Time Analytics</SelectItem>
                      <SelectItem value="performance">Performance Review</SelectItem>
                      <SelectItem value="compliance">Compliance Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="date-range">Date Range</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="mt-2" data-testid="select-date-range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="last30days">Last 30 Days</SelectItem>
                      <SelectItem value="last90days">Last 90 Days</SelectItem>
                      <SelectItem value="lastYear">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="report-format">Export Format</Label>
                  <Select value={reportFormat} onValueChange={setReportFormat}>
                    <SelectTrigger className="mt-2" data-testid="select-report-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV Data</SelectItem>
                      <SelectItem value="json">JSON Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateReport(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={generateReportMutation.isPending}
                    data-testid="button-submit-report"
                  >
                    {generateReportMutation.isPending ? "Generating..." : "Generate Report"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="reports">My Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                    <p className="text-2xl font-bold">{reports?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Avg Productivity</p>
                    <p className="text-2xl font-bold">
                      {productivityData && productivityData.length > 0 
                        ? Math.round(productivityData.reduce((sum, p) => sum + p.productivityScore, 0) / productivityData.length)
                        : 0}%
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
                    <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold">
                      {projectData?.filter(p => p.status === 'active').length || 0}
                    </p>
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
                    <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold">
                      {productivityData?.reduce((sum, p) => sum + p.totalHours, 0) || 0}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Report Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2" data-testid="button-quick-productivity">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <span>Productivity Report</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2" data-testid="button-quick-project">
                  <Target className="h-8 w-8 text-green-600" />
                  <span>Project Status Report</span>
                </Button>
                <Button variant="outline" className="h-24 flex flex-col items-center justify-center space-y-2" data-testid="button-quick-time">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <span>Time Analytics Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Team Productivity Analytics</h2>
            <Button variant="outline" data-testid="button-export-productivity">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Hours Logged</TableHead>
                    <TableHead>Tasks Completed</TableHead>
                    <TableHead>Active Projects</TableHead>
                    <TableHead>Productivity Score</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productivityData?.map((member) => (
                    <TableRow key={member.userId}>
                      <TableCell className="font-medium">{member.userName}</TableCell>
                      <TableCell>{member.totalHours}h</TableCell>
                      <TableCell>{member.completedTasks}</TableCell>
                      <TableCell>{member.activeProjects}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{member.productivityScore}%</span>
                          {member.productivityScore >= 85 && (
                            <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                          )}
                          {member.productivityScore >= 70 && member.productivityScore < 85 && (
                            <Badge className="bg-blue-100 text-blue-800">Good</Badge>
                          )}
                          {member.productivityScore < 70 && (
                            <Badge className="bg-yellow-100 text-yellow-800">Needs Attention</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.weeklyTrend?.slice(-4).map((value, index) => (
                          <span key={index} className={`inline-block w-2 h-6 mx-0.5 ${
                            value > 0 ? 'bg-green-400' : value < 0 ? 'bg-red-400' : 'bg-gray-300'
                          }`} />
                        )) || 'No data'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!productivityData?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No productivity data available</p>
                  <p className="text-sm">Data will appear as team members log time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Project Status Reports</h2>
            <Button variant="outline" data-testid="button-export-projects">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Team Size</TableHead>
                    <TableHead>Hours Logged</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectData?.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell>
                        <Badge className={`${
                          project.status === 'active' ? 'bg-green-100 text-green-800' :
                          project.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                          project.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{project.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{project.teamSize} members</TableCell>
                      <TableCell>{project.totalHours}h</TableCell>
                      <TableCell>{formatDate(project.deadline)}</TableCell>
                      <TableCell>{getRiskBadge(project.riskLevel)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!projectData?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No project data available</p>
                  <p className="text-sm">Projects will appear here when created</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Generated Reports</h2>
            <div className="flex space-x-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reports</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="generating">Generating</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>File Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports?.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(report.generatedAt)}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>{report.fileSize || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {report.status === 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => downloadReportMutation.mutate(report.id)}
                              disabled={downloadReportMutation.isPending}
                              data-testid={`button-download-${report.id}`}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                          <Button size="sm" variant="outline" data-testid={`button-share-${report.id}`}>
                            <Share2 className="h-3 w-3 mr-1" />
                            Share
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {!reports?.length && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reports generated yet</p>
                  <p className="text-sm">Create your first report using the "Generate Report" button</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}