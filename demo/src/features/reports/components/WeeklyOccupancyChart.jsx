/**
 * WeeklyOccupancyChart - Token-based bar chart for weekly occupancy
 * Uses the unified chart system with design tokens
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartPalette } from '@/components/ui/charts/palette';
import { tooltipContentStyle } from '@/components/ui/charts/ChartTooltip';

const WeeklyOccupancyChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid 
        strokeDasharray="3 3" 
        stroke="var(--bb-color-chart-grid)" 
        strokeOpacity={0.4}
      />
      <XAxis 
        dataKey="day" 
        stroke="var(--bb-color-chart-axis)"
        tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 12 }}
        tickLine={{ stroke: 'var(--bb-color-chart-axis)' }}
      />
      <YAxis
        domain={[0, 100]}
        stroke="var(--bb-color-chart-axis)"
        tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 12 }}
        tickLine={{ stroke: 'var(--bb-color-chart-axis)' }}
        tickFormatter={(value) => `${value}%`}
      />
      <Tooltip
        contentStyle={tooltipContentStyle}
        labelStyle={{ color: 'var(--bb-color-text-primary)', fontWeight: 600 }}
        itemStyle={{ color: 'var(--bb-color-text-muted)' }}
        formatter={(value) => `${value}% occupancy`}
      />
      <Bar 
        dataKey="occupancy" 
        fill={chartPalette.primary} 
        radius={[8, 8, 0, 0]} 
      />
    </BarChart>
  </ResponsiveContainer>
);

export default WeeklyOccupancyChart;
