import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import MetricCard from "@/components/dashboard/MetricCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import ScheduleSubmission from "@/components/schedule/ScheduleSubmission";
import MyProjects from "./MyProjects";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Clock, Projector, Calendar, TrendingUp, Plus, BookOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const studentSidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'chart-line' },
  { id: 'projects', label: 'My Projects', icon: 'project-diagram' },
  { id: 'messages', label: 'Messages', icon: 'message-circle' },
  { id: 'schedule', label: 'Schedule', icon: 'calendar-alt' },
  { id: 'progress', label: 'Progress', icon: 'tasks' },
  { id: 'insights', label: 'AI Insights', icon: 'lightbulb' },
  { id: 'lab-stats', label: 'Lab Statistics', icon: 'chart-bar' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');

  const { data: userMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: [`/api/analytics/user/${user?.id}`],
    retry: false,
    enabled: !!user?.id,
  });

  const { data: userProjects, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: [`/api/assignments/user/${user?.id}`],
    retry: false,
    enabled: !!user?.id,
  });

  const { data: notifications } = useQuery({
    queryKey: [`/api/notifications/user/${user?.id}`],
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
        role="PhD Student"
        roleIcon="user-graduate"
        notificationCount={unreadNotifications}
      />
      
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar 
          items={studentSidebarItems}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <main className="flex-1 overflow-auto" data-testid="main-content-student">
          {activeSection === 'dashboard' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Welcome back, {user?.firstName || 'Student'}!
                </h2>
                <p className="text-muted-foreground">
                  Here's your research progress and upcoming tasks
                </p>
              </div>

              {/* Personal Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Hours This Week"
                  value="0"
                  subtitle="of 20 required"
                  icon={Clock}
                  iconColor="text-green-600"
                  iconBgColor="bg-green-100"
                  data-testid="metric-weekly-hours"
                />
                
                <MetricCard
                  title="Active Projects"
                  value={userMetrics?.activeProjects?.toString() || "0"}
                  subtitle="in progress"
                  icon={Projector}
                  iconColor="text-primary"
                  iconBgColor="bg-primary/10"
                  isLoading={metricsLoading}
                  data-testid="metric-active-projects"
                />
                
                <MetricCard
                  title="Upcoming Deadlines"
                  value="0"
                  subtitle="next 2 weeks"
                  icon={Calendar}
                  iconColor="text-yellow-600"
                  iconBgColor="bg-yellow-100"
                  data-testid="metric-upcoming-deadlines"
                />
                
                <MetricCard
                  title="Productivity Score"
                  value={userMetrics?.productivityScore?.toString() || "0"}
                  subtitle="% efficiency"
                  icon={TrendingUp}
                  iconColor="text-secondary"
                  iconBgColor="bg-secondary/10"
                  isLoading={metricsLoading}
                  data-testid="metric-productivity-score"
                />
              </div>

              {/* Today's Schedule & Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Today's Schedule */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Calendar className="w-5 h-5 text-primary mr-2" />
                    Today's Schedule
                  </h3>
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No scheduled activities for today</p>
                    <p className="text-sm">Submit your weekly schedule to get started</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      className="p-4 h-auto flex-col items-start space-y-2 bg-primary/10 border-primary/20 hover:bg-primary/20 text-left"
                      data-testid="button-update-progress"
                    >
                      <Plus className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Update Progress</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="p-4 h-auto flex-col items-start space-y-2 bg-secondary/10 border-secondary/20 hover:bg-secondary/20 text-left"
                      data-testid="button-submit-schedule"
                      onClick={() => setActiveSection('schedule')}
                    >
                      <Calendar className="w-5 h-5 text-secondary" />
                      <span className="text-sm font-medium text-secondary">Submit Schedule</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="p-4 h-auto flex-col items-start space-y-2 bg-green-50 border-green-200 hover:bg-green-100 text-left"
                      data-testid="button-log-hours"
                    >
                      <Clock className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Log Hours</span>
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="p-4 h-auto flex-col items-start space-y-2 bg-yellow-50 border-yellow-200 hover:bg-yellow-100 text-left"
                      data-testid="button-get-help"
                    >
                      <HelpCircle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-600">Get Help</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Project Progress Overview */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Project Progress</h3>
                {userProjects && userProjects.length > 0 ? (
                  <div className="space-y-6">
                    {userProjects.map((project: any) => (
                      <div key={project.id} className="border border-border rounded-lg p-4" data-testid={`project-${project.id}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-foreground">{project.name}</h4>
                          <span className="text-xs text-muted-foreground">
                            Due: {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString() : 'TBD'}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Overall Progress</span>
                            <span>0%</span>
                          </div>
                          <Progress value={0} className="h-2" />
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-1">Literature Review</p>
                            <Progress value={0} className="h-1" />
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Data Analysis</p>
                            <Progress value={0} className="h-1" />
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Writing</p>
                            <Progress value={0} className="h-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Projector className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No projects assigned yet</p>
                    <p className="text-sm">Contact your supervisor to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'messages' && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">Messages</h2>
                <p className="text-muted-foreground">Your messages and notifications from professors</p>
              </div>
              
              <div className="space-y-4">
                {notifications && notifications.length > 0 ? (
                  notifications.map((notification: any) => (
                    <div 
                      key={notification.id} 
                      className={`border border-border rounded-lg p-4 ${
                        !notification.readAt ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground">{notification.subject}</h3>
                        <div className="flex items-center gap-2">
                          {!notification.readAt && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">NEW</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(notification.sentAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-3">{notification.content}</p>
                      
                      {notification.metadata?.fromUserName && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-2">
                          <span>From: {notification.metadata.fromUserName}</span>
                          {notification.metadata?.fromUserRole && (
                            <span className="capitalize">({notification.metadata.fromUserRole})</span>
                          )}
                        </div>
                      )}
                      
                      {!notification.readAt && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={async () => {
                            try {
                              await fetch(`/api/notifications/${notification.id}/read`, {
                                method: 'PUT',
                                credentials: 'include'
                              });
                              // Refresh notifications
                              window.location.reload();
                            } catch (error) {
                              console.error('Error marking notification as read:', error);
                            }
                          }}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No messages yet. Your professors' messages will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'schedule' && (
            <div className="p-6">
              <ScheduleSubmission />
            </div>
          )}

          {activeSection === 'projects' && (
            <div className="p-6">
              <MyProjects />
            </div>
          )}

          {(activeSection !== 'dashboard' && activeSection !== 'projects' && activeSection !== 'schedule') && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground mb-2 capitalize">
                  {activeSection.replace('-', ' ')}
                </h2>
                <p className="text-muted-foreground">
                  {activeSection === 'progress' && 'Track your research progress and milestones'}
                  {activeSection === 'insights' && 'AI-powered insights and recommendations'}
                  {activeSection === 'lab-stats' && 'View lab-wide statistics and benchmarks'}
                </p>
              </div>
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 opacity-50 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚧</span>
                </div>
                <p className="text-lg capitalize">{activeSection.replace('-', ' ')} coming in Phase 3</p>
                <p className="text-sm">Enhanced functionality will be available soon</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
