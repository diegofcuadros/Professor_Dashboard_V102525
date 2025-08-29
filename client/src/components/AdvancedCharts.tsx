import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Productivity Trend Chart
interface ProductivityTrendProps {
  data: Array<{
    date: string;
    productivity: number;
    projects: number;
    hours: number;
  }>;
}

export function ProductivityTrendChart({ data }: ProductivityTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis 
          yAxisId="left"
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="productivity"
          fill="url(#productivityGradient)"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Productivity Score"
        />
        <Bar
          yAxisId="right"
          dataKey="hours"
          fill="#8b5cf6"
          name="Hours Worked"
          opacity={0.8}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="projects"
          stroke="#10b981"
          strokeWidth={3}
          name="Active Projects"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
        />
        <defs>
          <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
          </linearGradient>
        </defs>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Project Status Distribution
interface ProjectStatusPieProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export function ProjectStatusPieChart({ data }: ProjectStatusPieProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={40}
          paddingAngle={5}
          dataKey="value"
          stroke="#ffffff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Team Performance Radar
interface TeamRadarProps {
  data: Array<{
    skill: string;
    current: number;
    target: number;
    fullMark: number;
  }>;
}

export function TeamPerformanceRadar({ data }: TeamRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis 
          dataKey="skill" 
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#64748b' }}
        />
        <Radar
          name="Current Performance"
          dataKey="current"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
        />
        <Radar
          name="Target Performance"
          dataKey="target"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.1}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
        />
        <Legend />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// Resource Utilization Chart
interface ResourceUtilizationProps {
  data: Array<{
    resource: string;
    allocated: number;
    used: number;
    available: number;
  }>;
}

export function ResourceUtilizationChart({ data }: ResourceUtilizationProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="resource" 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Bar 
          dataKey="allocated" 
          stackId="a" 
          fill="#e2e8f0" 
          name="Allocated"
          radius={[0, 0, 4, 4]}
        />
        <Bar 
          dataKey="used" 
          stackId="a" 
          fill="#3b82f6" 
          name="Used"
        />
        <Bar 
          dataKey="available" 
          stackId="a" 
          fill="#10b981" 
          name="Available"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Time Series Analytics
interface TimeSeriesProps {
  data: Array<{
    time: string;
    commits: number;
    reviews: number;
    meetings: number;
    research: number;
  }>;
}

export function TimeSeriesAnalytics({ data }: TimeSeriesProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="time" 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="commits"
          stroke="#3b82f6"
          strokeWidth={3}
          name="Code Commits"
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="reviews"
          stroke="#8b5cf6"
          strokeWidth={3}
          name="Code Reviews"
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="meetings"
          stroke="#f59e0b"
          strokeWidth={3}
          name="Meetings"
          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="research"
          stroke="#10b981"
          strokeWidth={3}
          name="Research Hours"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Burndown Chart for Projects
interface BurndownChartProps {
  data: Array<{
    day: string;
    planned: number;
    actual: number;
    ideal: number;
  }>;
}

export function BurndownChart({ data }: BurndownChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="day" 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#e2e8f0"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Ideal Progress"
          dot={{ fill: '#e2e8f0', strokeWidth: 1, r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="planned"
          stroke="#3b82f6"
          strokeWidth={3}
          name="Planned Progress"
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#10b981"
          strokeWidth={3}
          name="Actual Progress"
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}