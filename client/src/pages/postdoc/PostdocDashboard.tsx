import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MetricCard from "@/components/dashboard/MetricCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Projector, Users, FileText, Trophy, Crown, Lightbulb } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const postdocSidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'chart-line' },
  { id: 'projects', label: 'My Projects', icon: 'project-diagram' },
  { id: 'mentorship', label: 'Mentorship', icon: 'user-friends' },
  { id: 'team-analytics', label: 'Team Analytics', icon: 'chart-bar' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar-alt' },
  { id: 'lab-overview', label: 'Lab Overview', icon: 'microscope' },
];

export default function PostdocDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');

  const { data: userMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ["/api/analytics/user", user?.id],
    retry: false,
    enabled: !!user?.id,
  });

  const { data: userProjects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications/user", user?.id],
    retry: false,
    enabled: !!user?.id,
  });

  // Handle unauthorized errors
  if ((metricsError && isUnauthorizedError(metricsError)) || 
      (projectsError && isUnauthorizedError(projectsError))) {
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
        role="Postdoc"
        roleIcon="user-check"
        notificationCount={unreadNotifications}
      />
      
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar 
          items={postdocSidebarItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <main className="flex-1 overflow-auto" data-testid="main-content-postdoc">
          {activeSection === 'dashboard' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome back, Dr. {user?.lastName || 'Researcher'}!
                </h2>
                <p className="text-muted-foreground">
                  Your research projects and mentorship overview
                </p>
              </div>

              {/* Enhanced Metrics for Postdoc */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Active Projects"
                  value={userMetrics?.activeProjects?.toString() || "0"}
                  subtitle="leading 0 teams"
                  icon={Projector}
                  iconColor="text-primary"
                  iconBgColor="bg-primary/10"
                  isLoading={metricsLoading}
                  data-testid="metric-active-projects"
                />
                
                <MetricCard
                  title="Mentoring"
                  value="0"
                  subtitle="graduate students"
                  icon={Users}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                  data-testid="metric-mentees"
                />
                
                <MetricCard
                  title="Publications"
                  value="0"
                  subtitle="in review"
                  icon={FileText}
                  iconColor="text-secondary"
                  iconBgColor="bg-secondary/10"
                  data-testid="metric-publications"
                />
                
                <MetricCard
                  title="Team Performance"
                  value={userMetrics?.productivityScore?.toString() || "0"}
                  subtitle="% average"
                  icon={Trophy}
                  iconColor="text-yellow-600"
                  iconBgColor="bg-yellow-100"
                  isLoading={metricsLoading}
                  data-testid="metric-team-performance"
                />
              </div>

              {/* Mentorship Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Mentees Status */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Users className="w-5 h-5 text-green-600 mr-2" />
                    Mentees Progress
                  </h3>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No mentees assigned yet</p>
                    <p className="text-sm">Students will appear here once assigned</p>
                  </div>
                </div>

                {/* Project Leadership */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Crown className="w-5 h-5 text-yellow-600 mr-2" />
                    Leading Projects
                  </h3>
                  {userProjects && userProjects.length > 0 ? (
                    <div className="space-y-4">
                      {userProjects.map((project: any) => (
                        <div key={project.id} className="border border-border rounded-lg p-4" data-testid={`leading-project-${project.id}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">{project.name}</h4>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Leading</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Due: {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : 'TBD'}
                          </p>
                          <Progress value={0} className="h-2 mb-1" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress: 0%</span>
                            <span>Status: {project.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Crown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No projects under your leadership</p>
                      <p className="text-sm">Projects will appear here once assigned</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activities and AI Insights */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activities & AI Suggestions</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ActivityFeed 
                    title="Team Updates"
                    items={[]}
                    emptyMessage="No recent team activities"
                    data-testid="team-updates-feed"
                  />
                  
                  {/* AI Suggestions */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">AI Insights & Suggestions</h4>
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>AI insights coming in Phase 2</p>
                      <p className="text-sm">Personalized recommendations will appear here</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection !== 'dashboard' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2 capitalize">
                  {activeSection.replace('-', ' ')}
                </h2>
                <p className="text-muted-foreground">
                  {activeSection === 'projects' && 'Manage your research projects and collaborations'}
                  {activeSection === 'mentorship' && 'Guide and support graduate students'}
                  {activeSection === 'team-analytics' && 'Analyze team performance and productivity'}
                  {activeSection === 'schedule' && 'Manage your research schedule'}
                  {activeSection === 'lab-overview' && 'View lab-wide activities and insights'}
                </p>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 opacity-50 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚙️</span>
                </div>
                <p className="text-lg capitalize">{activeSection.replace('-', ' ')} coming in Phase 2</p>
                <p className="text-sm">Enhanced functionality will be available soon</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
