import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Users, 
  Projector as Project, 
  Brain, 
  Calendar, 
  FileText, 
  Settings,
  ListTodo,
  Lightbulb,
  Microscope,
  UserCheck
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const iconMap = {
  'chart-line': BarChart3,
  'users': Users,
  'project-diagram': Project,
  'brain': Brain,
  'calendar-alt': Calendar,
  'file-alt': FileText,
  'cog': Settings,
  'tasks': ListTodo,
  'lightbulb': Lightbulb,
  'chart-bar': BarChart3,
  'microscope': Microscope,
  'user-friends': UserCheck,
};

export default function Sidebar({ items, activeSection, onSectionChange }: SidebarProps) {
  return (
    <nav className="w-64 bg-card border-r border-border p-4" data-testid="sidebar-nav">
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap] || BarChart3;
          const isActive = activeSection === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start text-sm h-10",
                isActive 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "hover:bg-accent"
              )}
              onClick={() => onSectionChange(item.id)}
              data-testid={`nav-${item.id}`}
            >
              <Icon className="w-4 h-4 mr-3" />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
