import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AdminDashboard from "./admin/AdminDashboard";
import StudentDashboard from "./student/StudentDashboard";
import PostdocDashboard from "./postdoc/PostdocDashboard";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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

  // Route to appropriate dashboard based on user role
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
}
