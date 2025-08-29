import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  isLoading?: boolean;
  'data-testid'?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  isLoading = false,
  'data-testid': testId,
}: MetricCardProps) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground" data-testid={`${testId}-value`}>
                {value}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 ${iconBgColor} rounded-full flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
