import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import type { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface HeaderProps {
  user: User | null;
  role: string;
  roleIcon: string;
  notificationCount?: number;
}

const roleColors = {
  'Professor': 'bg-primary/10 text-primary',
  'PhD Student': 'bg-secondary/10 text-secondary', 
  'Postdoc': 'bg-green-100 text-green-800',
};

export default function Header({ user, role, roleIcon, notificationCount = 0 }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch (_) {
      // ignore errors and continue
    } finally {
      window.location.reload();
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return "??";
    const first = firstName ? firstName[0].toUpperCase() : "";
    const last = lastName ? lastName[0].toUpperCase() : "";
    return first + last;
  };

  const getRoleColorClass = (role: string) => {
    return roleColors[role as keyof typeof roleColors] || 'bg-muted text-muted-foreground';
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.25 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground" data-testid="header-title">
              {role.includes('Professor') ? 'LIA Dashboard' : 
               role.includes('Student') ? 'My Research Dashboard' : 'Research Hub'}
            </h1>
          </div>
          <div className={`px-3 py-1 rounded-full ${getRoleColorClass(role)}`}>
            <span className="text-xs font-medium">
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                {roleIcon === 'user-tie' && (
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                )}
                {roleIcon === 'user-graduate' && (
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z M10 14a4 4 0 00-4 4h8a4 4 0 00-4-4z"/>
                )}
                {roleIcon === 'user-check' && (
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z M10 14a4 4 0 00-4 4h8a4 4 0 00-4-4z M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                )}
              </svg>
              {role}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-notifications"
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="text-right" data-testid="user-info">
              <p className="text-sm font-medium">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.department || user?.specialization || 'Research Team'}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center" data-testid="user-avatar">
              <span className="text-sm font-medium text-primary-foreground">
                {getInitials(user?.firstName, user?.lastName)}
              </span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
