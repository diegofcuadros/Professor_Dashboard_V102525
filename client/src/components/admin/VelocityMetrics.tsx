import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Target,
  Zap,
  Clock,
  MessageSquare,
  Users
} from "lucide-react";
import { format } from "date-fns";

interface VelocityMetric {
  studentId: string;
  studentName: string;
  totalActivity: number;
  progressUpdates: number;
  statusChanges: number;
  comments: number;
  uniqueTasksWorkedOn: number;
  uniqueProjectsActive: number;
  velocityScore: number;
  velocityTrend: 'increasing' | 'decreasing' | 'stable' | 'new' | 'inactive';
  dailyActivity: { [key: string]: number };
}

interface VelocityMetricsProps {
  autoRefresh?: boolean;
}

const trendColors = {
  increasing: "text-green-600",
  decreasing: "text-red-600", 
  stable: "text-blue-600",
  new: "text-purple-600",
  inactive: "text-gray-500",
};

const trendIcons = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: BarChart3,
  new: Zap,
  inactive: Clock,
};

export default function VelocityMetrics({ autoRefresh = false }: VelocityMetricsProps) {
  const [days, setDays] = useState(7);
  const [sortBy, setSortBy] = useState<'velocityScore' | 'totalActivity' | 'studentName'>('velocityScore');

  const { data: velocityMetrics, isLoading, refetch } = useQuery<VelocityMetric[]>({
    queryKey: [`/api/admin/velocity-metrics?days=${days}`],
    refetchInterval: autoRefresh ? 60000 : false,
  });

  const sortedMetrics = velocityMetrics ? [...velocityMetrics].sort((a, b) => {
    switch (sortBy) {
      case 'velocityScore':
        return b.velocityScore - a.velocityScore;
      case 'totalActivity':
        return b.totalActivity - a.totalActivity;
      case 'studentName':
        return a.studentName.localeCompare(b.studentName);
      default:
        return 0;
    }
  }) : [];

  const getVelocityLevel = (score: number) => {
    if (score >= 80) return { level: 'high', color: 'bg-green-100 text-green-800', label: 'High Velocity' };
    if (score >= 40) return { level: 'medium', color: 'bg-yellow-100 text-yellow-800', label: 'Medium Velocity' };
    return { level: 'low', color: 'bg-red-100 text-red-800', label: 'Low Velocity' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progress Velocity Metrics</CardTitle>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Progress Velocity Metrics
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track student productivity and engagement patterns
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="velocityScore">Velocity Score</SelectItem>
                <SelectItem value="totalActivity">Total Activity</SelectItem>
                <SelectItem value="studentName">Name</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedMetrics.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No velocity data found</p>
            <p className="text-sm">
              No student activity recorded in the selected time period
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMetrics.map((metric) => {
              const velocityLevel = getVelocityLevel(metric.velocityScore);
              const TrendIcon = trendIcons[metric.velocityTrend];
              
              return (
                <Card key={metric.studentId} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{metric.studentName}</h3>
                        <Badge className={velocityLevel.color + " mt-2"}>
                          {velocityLevel.label}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{metric.velocityScore}</div>
                        <div className="text-xs text-muted-foreground">velocity score</div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Trend Indicator */}
                    <div className={`flex items-center gap-2 ${trendColors[metric.velocityTrend]}`}>
                      <TrendIcon className="h-4 w-4" />
                      <span className="text-sm font-medium capitalize">
                        {metric.velocityTrend === 'new' ? 'New Activity' : 
                         metric.velocityTrend === 'inactive' ? 'Inactive' :
                         metric.velocityTrend} Trend
                      </span>
                    </div>

                    {/* Activity Breakdown */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{metric.totalActivity}</div>
                        <div className="text-muted-foreground">Total Actions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{metric.uniqueTasksWorkedOn}</div>
                        <div className="text-muted-foreground">Tasks Active</div>
                      </div>
                    </div>

                    {/* Activity Types */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-3 w-3 text-green-600" />
                          <span>Progress Updates</span>
                        </div>
                        <span className="font-medium">{metric.progressUpdates}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="h-3 w-3 text-blue-600" />
                          <span>Status Changes</span>
                        </div>
                        <span className="font-medium">{metric.statusChanges}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-purple-600" />
                          <span>Comments</span>
                        </div>
                        <span className="font-medium">{metric.comments}</span>
                      </div>
                    </div>

                    {/* Projects Active */}
                    <div className="flex justify-between items-center text-sm pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-orange-600" />
                        <span>Projects Active</span>
                      </div>
                      <span className="font-medium">{metric.uniqueProjectsActive}</span>
                    </div>

                    {/* Daily Activity Sparkline (simplified) */}
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground mb-2">
                        Daily Activity ({days} days)
                      </div>
                      <div className="flex items-end gap-1 h-8">
                        {Object.entries(metric.dailyActivity)
                          .slice(-7) // Show last 7 days
                          .map(([date, count]) => (
                            <div
                              key={date}
                              className="bg-blue-200 rounded-sm flex-1 min-h-[2px]"
                              style={{ height: `${Math.max((count / Math.max(...Object.values(metric.dailyActivity))) * 100, 10)}%` }}
                              title={`${date}: ${count} activities`}
                            />
                          ))
                        }
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
