import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MetricCard from "@/components/dashboard/MetricCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import TeamTable from "@/components/dashboard/TeamTable";
import CommunicationDashboard from "@/components/communication/CommunicationDashboard";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Users, Projector, Clock, AlertTriangle, Bell, FolderOpen, Plus, Brain, Calendar, BarChart3, Settings, MessageSquare } from "lucide-react";

const adminSidebarItems = [
  { id: 'overview', label: 'Lab Overview', icon: 'chart-line' },
  { id: 'team', label: 'Team Management', icon: 'users' },
  { id: 'projects', label: 'Projects', icon: 'project-diagram' },
  { id: 'communication', label: 'Communication', icon: 'message-square' },
  { id: 'ai-analytics', label: 'AI Analytics', icon: 'brain' },
  { id: 'schedules', label: 'Schedules', icon: 'calendar-alt' },
  { id: 'reports', label: 'Reports', icon: 'file-alt' },
  { id: 'settings', label: 'Settings', icon: 'cog' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('overview');

  const { data: labMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["/api/analytics/lab"],
    retry: false,
  });

  const { data: allUsers, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["/api/users"],
    retry: false,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications/user", user?.id],
    retry: false,
    enabled: !!user?.id,
  });

  // Handle unauthorized errors
  if (metricsError && isUnauthorizedError(metricsError)) {
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

  if (usersError && isUnauthorizedError(usersError)) {
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

  const unreadNotifications = Array.isArray(notifications) 
    ? notifications.filter((n: any) => !n.readAt).length 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        user={user} 
        role="Professor"
        roleIcon="user-tie"
        notificationCount={unreadNotifications}
      />
      
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar 
          items={adminSidebarItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <main className="flex-1 overflow-auto" data-testid="main-content-admin">
          {activeSection === 'overview' && (
            <div className="p-4 lg:p-6">
              <div className="mb-4 lg:mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Lab Overview</h2>
                  <p className="text-sm lg:text-base text-muted-foreground">
                    Real-time insights into your research team's progress and productivity
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link href="/admin/projects">
                    <Button variant="outline" data-testid="button-manage-projects">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Manage Projects
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
                <MetricCard
                  title="Active Students"
                  value={(labMetrics as any)?.activeStudents?.toString() || "0"}
                  subtitle="team members"
                  icon={Users}
                  iconColor="text-primary"
                  iconBgColor="bg-primary/10"
                  isLoading={metricsLoading}
                  data-testid="metric-active-students"
                />
                
                <MetricCard
                  title="Active Projects"
                  value={(labMetrics as any)?.activeProjects?.toString() || "0"}
                  subtitle="in progress"
                  icon={Projector}
                  iconColor="text-secondary"
                  iconBgColor="bg-secondary/10"
                  isLoading={metricsLoading}
                  data-testid="metric-active-projects"
                />
                
                <MetricCard
                  title="This Week's Hours"
                  value="284"
                  subtitle="logged hours"
                  icon={Clock}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                  data-testid="metric-weekly-hours"
                />
                
                <MetricCard
                  title="At-Risk Students"
                  value="2"
                  subtitle="need attention"
                  icon={AlertTriangle}
                  iconColor="text-destructive"
                  iconBgColor="bg-destructive/10"
                  data-testid="metric-at-risk-students"
                />
              </div>

              {/* Current Alerts */}
              <div className="bg-card border border-border rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Bell className="w-5 h-5 text-destructive mr-2" />
                  Priority Alerts
                </h3>
                <div className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No priority alerts at this time</p>
                  </div>
                </div>
              </div>

              {/* Team Activity Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <ActivityFeed 
                  title="Currently Working"
                  items={[]}
                  emptyMessage="No team members currently checked in"
                  data-testid="currently-working-feed"
                />
                
                <ActivityFeed 
                  title="Recent Updates"
                  items={[]}
                  emptyMessage="No recent progress updates"
                  data-testid="recent-updates-feed"
                />
              </div>
            </div>
          )}

          {activeSection === 'team' && (
            <div className="p-4 lg:p-6">
              <div className="mb-4 lg:mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Team Management</h2>
                  <p className="text-sm lg:text-base text-muted-foreground">
                    Manage your research team members and their access
                  </p>
                </div>
              </div>

              <TeamTable 
                users={(allUsers as any) || []}
                isLoading={usersLoading}
                error={usersError}
                data-testid="team-table"
              />
            </div>
          )}

          {activeSection === 'communication' && (
            <CommunicationDashboard />
          )}

          {activeSection === 'projects' && (
            <div className="p-4 lg:p-6">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Projects</h2>
                <p className="text-sm lg:text-base text-muted-foreground">Manage research projects and assignments</p>
              </div>
              <div className="text-center py-12">
                <div className="mb-6">
                  <FolderOpen className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-lg font-semibold text-foreground mb-2">Project Management System</p>
                  <p className="text-sm text-muted-foreground mb-6">Create projects, assign team members, and track progress</p>
                </div>
                <Link href="/admin/projects">
                  <Button 
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    data-testid="button-open-project-management"
                  >
                    <FolderOpen className="mr-2 h-5 w-5" />
                    Open Project Management
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {activeSection === 'ai-analytics' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">AI Analytics</h2>
                <p className="text-muted-foreground">Intelligent insights and predictions</p>
              </div>
              <div className="text-center py-12">
                <div className="mb-6">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-semibold text-foreground mb-2">AI Analytics Dashboard</p>
                  <p className="text-sm text-muted-foreground mb-6">Access advanced AI-powered insights and predictions</p>
                </div>
                <Link href="/admin/ai-analytics">
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    data-testid="button-open-ai-analytics"
                  >
                    <Brain className="mr-2 h-5 w-5" />
                    Open AI Analytics
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {activeSection === 'schedules' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Schedules</h2>
                <p className="text-muted-foreground">Schedule management and approval</p>
              </div>
              <div className="text-center py-12">
                <div className="mb-6">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-semibold text-foreground mb-2">Schedule Management System</p>
                  <p className="text-sm text-muted-foreground mb-6">Manage team schedules, time tracking, and work approvals</p>
                </div>
                <div className="space-y-3">
                  <Link href="/admin/schedules">
                    <Button 
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="button-view-schedules"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Open Schedule Management
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground">Time tracking and schedule approvals</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Reports</h2>
                <p className="text-muted-foreground">Generate and view reports</p>
              </div>
              <div className="text-center py-12">
                <div className="mb-6">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  <p className="text-lg font-semibold text-foreground mb-2">Reporting Dashboard</p>
                  <p className="text-sm text-muted-foreground mb-6">Generate comprehensive reports on team productivity and project progress</p>
                </div>
                <div className="space-y-3">
                  <Link href="/admin/reports">
                    <Button 
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      data-testid="button-generate-reports"
                    >
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Open Reports Dashboard
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground">Generate comprehensive analytics reports</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Settings</h2>
                <p className="text-muted-foreground">System configuration and preferences</p>
              </div>
              <div className="text-center py-12">
                <div className="mb-6">
                  <Settings className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                  <p className="text-lg font-semibold text-foreground mb-2">System Settings</p>
                  <p className="text-sm text-muted-foreground mb-6">Configure lab settings, permissions, and system preferences</p>
                </div>
                <div className="space-y-3">
                  <Link href="/admin/settings">
                    <Button 
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-testid="button-open-settings"
                    >
                      <Settings className="mr-2 h-5 w-5" />
                      Open System Settings
                    </Button>
                  </Link>
                  <p className="text-xs text-muted-foreground">Lab configuration and user management</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
