export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface UserMetrics {
  activeProjects: number;
  weeklyHours: number;
  productivityScore: number;
  totalUpdates: number;
  upcomingDeadlines: number;
}

export interface LabMetrics {
  totalUsers: number;
  activeStudents: number;
  activeProjects: number;
  totalProjects: number;
  weeklyHours: number;
  atRiskStudents: number;
}
