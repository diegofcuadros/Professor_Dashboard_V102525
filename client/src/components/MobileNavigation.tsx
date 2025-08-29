import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import RealTimeNotifications from "@/components/RealTimeNotifications";
import {
  Menu,
  Home,
  FolderOpen,
  Brain,
  Calendar,
  BarChart3,
  Settings,
  Globe,
  LogOut,
  User,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface MobileNavProps {
  onLogout: () => void;
  isLoggingOut: boolean;
}

export default function MobileNavigation({ onLogout, isLoggingOut }: MobileNavProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'professor';

  const navItems = [
    { href: "/", icon: Home, label: "Dashboard", adminOnly: false },
    ...(isAdmin ? [
      { href: "/admin/projects", icon: FolderOpen, label: "Projects", adminOnly: true },
      { href: "/admin/ai-analytics", icon: Brain, label: "AI Analytics", adminOnly: true },
      { href: "/admin/schedules", icon: Calendar, label: "Schedules", adminOnly: true },
      { href: "/admin/reports", icon: BarChart3, label: "Reports", adminOnly: true },
      { href: "/admin/integrations", icon: Globe, label: "Integrations", adminOnly: true },
      { href: "/admin/settings", icon: Settings, label: "Settings", adminOnly: true },
    ] : [
      { href: "/projects", icon: FolderOpen, label: "My Projects", adminOnly: false },
    ])
  ];

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="px-2" data-testid="mobile-menu-trigger">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b bg-primary text-primary-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {user?.role}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 py-4">
              <nav className="space-y-1 px-4">
                {navItems.map((item) => {
                  const isActive = location === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        onClick={handleNavClick}
                        className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                        data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Notifications</span>
                <RealTimeNotifications />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                disabled={isLoggingOut}
                className="w-full"
                data-testid="mobile-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}