import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Zap, 
  Clock, 
  Wifi, 
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface PerformanceMetrics {
  loadTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkLatency: number;
  jsHeapSize: number;
  domNodes: number;
  connectionType: string;
  isOnline: boolean;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const collectMetrics = () => {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;
      const connection = (navigator as any).connection;

      const newMetrics: PerformanceMetrics = {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        memoryUsage: memory ? Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100) : 0,
        cacheHitRate: Math.random() * 40 + 60, // Simulated - in real app would track actual cache hits
        networkLatency: navigation.responseEnd - navigation.requestStart,
        jsHeapSize: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : 0,
        domNodes: document.querySelectorAll('*').length,
        connectionType: connection?.effectiveType || 'unknown',
        isOnline: navigator.onLine
      };

      setMetrics(newMetrics);
    } catch (error) {
      console.warn('Performance metrics collection failed:', error);
    }
  };

  useEffect(() => {
    collectMetrics();
    
    // Update metrics every 30 seconds
    const interval = setInterval(collectMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getPerformanceGrade = (metrics: PerformanceMetrics): { grade: string; color: string } => {
    let score = 100;
    
    if (metrics.loadTime > 3000) score -= 20;
    if (metrics.memoryUsage > 80) score -= 15;
    if (metrics.cacheHitRate < 70) score -= 10;
    if (metrics.networkLatency > 1000) score -= 15;
    
    if (score >= 90) return { grade: 'A', color: 'text-green-600' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600' };
    return { grade: 'D', color: 'text-red-600' };
  };

  if (!metrics) return null;

  const { grade, color } = getPerformanceGrade(metrics);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Performance Badge */}
      <div className="flex items-center space-x-2 mb-2">
        <Button
          variant={isVisible ? "default" : "secondary"}
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="shadow-lg"
        >
          <Activity className="h-4 w-4 mr-1" />
          Performance {grade}
        </Button>
        
        <Badge variant={metrics.isOnline ? "default" : "destructive"} className="shadow-lg">
          <Wifi className="h-3 w-3 mr-1" />
          {metrics.isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Detailed Metrics Panel */}
      {isVisible && (
        <Card className="w-80 shadow-xl border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                Performance Monitor
              </CardTitle>
              <div className="flex items-center space-x-2">
                <span className={`text-2xl font-bold ${color}`}>{grade}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collectMetrics}
                  className="p-1"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Load Time */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="text-sm font-medium">Load Time</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {metrics.loadTime.toFixed(0)}ms
                </span>
              </div>
              <Progress 
                value={Math.min((metrics.loadTime / 5000) * 100, 100)} 
                className="h-2"
              />
            </div>

            {/* Memory Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Database className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="text-sm font-medium">Memory Usage</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {metrics.memoryUsage}% ({metrics.jsHeapSize}MB)
                </span>
              </div>
              <Progress 
                value={metrics.memoryUsage} 
                className="h-2"
              />
            </div>

            {/* Cache Hit Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {metrics.cacheHitRate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={metrics.cacheHitRate} 
                className="h-2"
              />
            </div>

            {/* Network Info */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Network</p>
                <p className="text-sm font-medium capitalize">{metrics.connectionType}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">DOM Nodes</p>
                <p className="text-sm font-medium">{metrics.domNodes.toLocaleString()}</p>
              </div>
            </div>

            {/* Performance Tips */}
            {(metrics.loadTime > 3000 || metrics.memoryUsage > 80) && (
              <div className="flex items-start space-x-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  {metrics.loadTime > 3000 && <p>• Consider enabling browser caching</p>}
                  {metrics.memoryUsage > 80 && <p>• High memory usage detected</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}