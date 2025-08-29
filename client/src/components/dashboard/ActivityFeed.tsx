import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  status?: string;
}

interface ActivityFeedProps {
  title: string;
  items: ActivityItem[];
  emptyMessage: string;
  'data-testid'?: string;
}

export default function ActivityFeed({ title, items, emptyMessage, 'data-testid': testId }: ActivityFeedProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6" data-testid={testId}>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      
      {items.length > 0 ? (
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid={`activity-item-${item.id}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-foreground">
                      {item.user.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.user}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 opacity-50 bg-muted rounded-full flex items-center justify-center">
            <span className="text-xl">📋</span>
          </div>
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
