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
import { isUnauthorizedError } from "@/lib/authUtils";
import { Users, Projector, Clock, AlertTriangle, Bell, FolderOpen, Plus } from "lucide-react";

const adminSidebarItems = [
  { id: 'overview', label: 'Lab Overview', icon: 'chart-line' },
  { id: 'team', label: 'Team Management', icon: 'users' },
  { id: 'projects', label: 'Projects', icon: 'project-diagram' },
  { id: 'analytics', label: 'AI Analytics', icon: 'brain' },
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

  const unreadNotifications = notifications?.filter(n => !n.readAt).length || 0;

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
            <div className="p-6">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Lab Overview</h2>
                  <p className="text-muted-foreground">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Active Students"
                  value={labMetrics?.activeStudents?.toString() || "0"}
                  subtitle="team members"
                  icon={Users}
                  iconColor="text-primary"
                  iconBgColor="bg-primary/10"
                  isLoading={metricsLoading}
                  data-testid="metric-active-students"
                />
                
                <MetricCard
                  title="Active Projects"
                  value={labMetrics?.activeProjects?.toString() || "0"}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Team Management</h2>
                  <p className="text-muted-foreground">
                    Manage your research team members and their access
                  </p>
                </div>
              </div>

              <TeamTable 
                users={allUsers || []}
                isLoading={usersLoading}
                error={usersError}
                data-testid="team-table"
              />
            </div>
          )}

          {activeSection === 'projects' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Projects</h2>
                <p className="text-muted-foreground">Manage research projects and assignments</p>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <Projector className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Project management coming in Phase 2</p>
                <p className="text-sm">Create and manage research projects, assign team members</p>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">AI Analytics</h2>
                <p className="text-muted-foreground">Intelligent insights and predictions</p>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p className="text-lg">AI Analytics coming in Phase 2</p>
                <p className="text-sm">Advanced pattern analysis and risk prediction</p>
              </div>
            </div>
          )}

          {(activeSection === 'schedules' || activeSection === 'reports' || activeSection === 'settings') && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2 capitalize">{activeSection}</h2>
                <p className="text-muted-foreground">
                  {activeSection === 'schedules' && 'Schedule management and approval'}
                  {activeSection === 'reports' && 'Generate and view reports'}
                  {activeSection === 'settings' && 'System configuration and preferences'}
                </p>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 opacity-50 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚙️</span>
                </div>
                <p className="text-lg capitalize">{activeSection} coming in Phase 2</p>
                <p className="text-sm">Enhanced functionality will be available soon</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
