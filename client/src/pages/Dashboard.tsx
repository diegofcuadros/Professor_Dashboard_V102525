import { useAuth } from "@/hooks/useAuth";
import RealTimeNotifications from "@/components/RealTimeNotifications";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import AdminDashboard from "./admin/AdminDashboard";
import StudentDashboard from "./student/StudentDashboard";
import PostdocDashboard from "./postdoc/PostdocDashboard";
import { LogOut, User } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Dashboard content based on user role
  const getDashboardContent = () => {
    switch (user.role) {
      case 'admin':
      case 'professor':
        return <AdminDashboard />;
      case 'postdoc':
        return <PostdocDashboard />;
      case 'student':
      default:
        return <StudentDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-border px-6 py-3">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <img 
              src="attached_assets/LOGO_DigEpi_Lab_V2_1756505531752.tif" 
              alt="Digital Epidemiology Laboratory Logo" 
              className="h-8 w-auto"
              onError={(e) => {
                // Fallback if TIF format isn't supported
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-xl font-bold text-foreground">Digital Epidemiology Laboratory</h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.firstName} {user?.lastName}</span>
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs capitalize">
                {user?.role}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <RealTimeNotifications />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      {getDashboardContent()}
    </div>
  );
}
