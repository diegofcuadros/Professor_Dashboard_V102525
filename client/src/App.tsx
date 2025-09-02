import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ProjectManagement from "@/pages/admin/ProjectManagement";
import ProjectDetails from "@/pages/admin/ProjectDetails";
import AIAnalytics from "@/pages/admin/AIAnalytics";
import ScheduleManagement from "@/pages/admin/ScheduleManagement";
import ReportsManagement from "@/pages/admin/ReportsManagement";
import SystemSettings from "@/pages/admin/SystemSettings";
import IntegrationsPage from "@/pages/admin/IntegrationsPage";
import MyProjects from "@/pages/student/MyProjects";
import MyTasks from "@/pages/student/MyTasks";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin/projects" component={ProjectManagement} />
          <Route path="/admin/projects/:projectId" component={ProjectDetails} />
          <Route path="/admin/ai-analytics" component={AIAnalytics} />
          <Route path="/admin/schedules" component={ScheduleManagement} />
          <Route path="/admin/reports" component={ReportsManagement} />
          <Route path="/admin/settings" component={SystemSettings} />
          <Route path="/admin/integrations" component={IntegrationsPage} />
          <Route path="/projects" component={MyProjects} />
          <Route path="/student/projects" component={MyProjects} />
          <Route path="/postdoc/projects" component={MyProjects} />
          <Route path="/tasks" component={MyTasks} />
          <Route path="/student/tasks" component={MyTasks} />
          <Route path="/postdoc/tasks" component={MyTasks} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
