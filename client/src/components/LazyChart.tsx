import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load chart components for better performance
const ProductivityTrendChart = lazy(() => 
  import('@/components/AdvancedCharts').then(module => ({ 
    default: module.ProductivityTrendChart 
  }))
);

const ProjectStatusPieChart = lazy(() => 
  import('@/components/AdvancedCharts').then(module => ({ 
    default: module.ProjectStatusPieChart 
  }))
);

const TeamPerformanceRadar = lazy(() => 
  import('@/components/AdvancedCharts').then(module => ({ 
    default: module.TeamPerformanceRadar 
  }))
);

const ResourceUtilizationChart = lazy(() => 
  import('@/components/AdvancedCharts').then(module => ({ 
    default: module.ResourceUtilizationChart 
  }))
);

const TimeSeriesAnalytics = lazy(() => 
  import('@/components/AdvancedCharts').then(module => ({ 
    default: module.TimeSeriesAnalytics 
  }))
);

const BurndownChart = lazy(() => 
  import('@/components/AdvancedCharts').then(module => ({ 
    default: module.BurndownChart 
  }))
);

// Loading fallback component
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <Skeleton className="w-full h-full rounded-lg" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Lazy wrapper components with mobile-optimized heights
interface LazyChartProps {
  data: any[];
  className?: string;
}

export function LazyProductivityTrendChart({ data, className }: LazyChartProps) {
  return (
    <div className={className}>
      <Suspense fallback={<ChartSkeleton height={250} />}>
        <div className="h-64 md:h-80">
          <ProductivityTrendChart data={data} />
        </div>
      </Suspense>
    </div>
  );
}

export function LazyProjectStatusPieChart({ data, className }: LazyChartProps) {
  return (
    <div className={className}>
      <Suspense fallback={<ChartSkeleton height={250} />}>
        <div className="h-64 md:h-80">
          <ProjectStatusPieChart data={data} />
        </div>
      </Suspense>
    </div>
  );
}

export function LazyTeamPerformanceRadar({ data, className }: LazyChartProps) {
  return (
    <div className={className}>
      <Suspense fallback={<ChartSkeleton height={300} />}>
        <div className="h-72 md:h-96">
          <TeamPerformanceRadar data={data} />
        </div>
      </Suspense>
    </div>
  );
}

export function LazyResourceUtilizationChart({ data, className }: LazyChartProps) {
  return (
    <div className={className}>
      <Suspense fallback={<ChartSkeleton height={250} />}>
        <div className="h-64 md:h-80">
          <ResourceUtilizationChart data={data} />
        </div>
      </Suspense>
    </div>
  );
}

export function LazyTimeSeriesAnalytics({ data, className }: LazyChartProps) {
  return (
    <div className={className}>
      <Suspense fallback={<ChartSkeleton height={350} />}>
        <div className="h-80 md:h-96">
          <TimeSeriesAnalytics data={data} />
        </div>
      </Suspense>
    </div>
  );
}

export function LazyBurndownChart({ data, className }: LazyChartProps) {
  return (
    <div className={className}>
      <Suspense fallback={<ChartSkeleton height={250} />}>
        <div className="h-64 md:h-80">
          <BurndownChart data={data} />
        </div>
      </Suspense>
    </div>
  );
}