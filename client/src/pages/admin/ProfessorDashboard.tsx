import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import AttentionItemsWidget from "@/components/admin/AttentionItemsWidget";
import UpcomingDeadlinesWidget from "@/components/admin/UpcomingDeadlinesWidget";
import LiveActivityWidget from "@/components/admin/LiveActivityWidget";

export default function ProfessorDashboard() {
  const { 
    data: attentionItems, 
    isLoading: loadingAttention 
  } = useQuery({
    queryKey: ['/api/admin/dashboard/attention-items'],
    // Add staleTime to avoid refetching too often on navigation
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { 
    data: upcomingDeadlines, 
    isLoading: loadingDeadlines 
  } = useQuery({
    queryKey: ['/api/admin/dashboard/upcoming-deadlines'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Professor Dashboard</h1>
          <p className="text-muted-foreground">
            A high-level overview of your lab's current status
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Actionable Items */}
        <div className="lg:col-span-2 space-y-6">
          <AttentionItemsWidget 
            items={attentionItems} 
            isLoading={loadingAttention} 
          />
          <UpcomingDeadlinesWidget
            deadlines={upcomingDeadlines}
            isLoading={loadingDeadlines}
          />
        </div>

        {/* Right Column: Live Feed */}
        <div className="lg:col-span-1">
          <LiveActivityWidget />
        </div>
      </div>
    </div>
  );
}
