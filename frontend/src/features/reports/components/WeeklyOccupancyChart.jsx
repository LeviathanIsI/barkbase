import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const WeeklyOccupancyChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-border) / 0.4)" />
      <XAxis dataKey="day" stroke="rgb(var(--color-muted))" />
      <YAxis
        domain={[0, 100]}
        stroke="rgb(var(--color-muted))"
        tickFormatter={(value) => `${value}%`}
      />
      <Tooltip
        contentStyle={{
          background: 'rgb(var(--color-surface))',
          borderRadius: '1rem',
          border: '1px solid rgba(var(--color-border) / 0.4)',
        }}
        formatter={(value) => `${value}% occupancy`}
      />
      <Bar dataKey="occupancy" fill="rgb(var(--color-primary))" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default WeeklyOccupancyChart;
