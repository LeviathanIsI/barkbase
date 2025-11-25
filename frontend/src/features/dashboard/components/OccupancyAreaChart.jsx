/**
 * OccupancyAreaChart - Token-based area chart for occupancy data
 * Uses the unified chart system with design tokens
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartPalette } from '@/components/ui/charts/palette';
import { tooltipContentStyle } from '@/components/ui/charts/ChartTooltip';

const OccupancyAreaChart = ({ data }) => {
  const gradientId = 'occupancy-gradient';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartPalette.primary} stopOpacity={0.4} />
            <stop offset="95%" stopColor={chartPalette.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="var(--bb-color-chart-grid)" 
          strokeOpacity={0.6}
        />
        <XAxis 
          dataKey="day" 
          stroke="var(--bb-color-chart-axis)"
          tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 12 }}
          tickLine={{ stroke: 'var(--bb-color-chart-axis)' }}
        />
        <YAxis 
          unit="%" 
          stroke="var(--bb-color-chart-axis)" 
          domain={[0, 100]}
          tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 12 }}
          tickLine={{ stroke: 'var(--bb-color-chart-axis)' }}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={{ color: 'var(--bb-color-text-primary)', fontWeight: 600 }}
          itemStyle={{ color: 'var(--bb-color-text-muted)' }}
        />
        <Area
          type="monotone"
          dataKey="occupancy"
          stroke={chartPalette.primary}
          strokeWidth={3}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default OccupancyAreaChart;
