import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const OccupancyAreaChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="rgb(var(--color-primary))" stopOpacity={0.4} />
          <stop offset="95%" stopColor="rgb(var(--color-primary))" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-border) / 0.6)" />
      <XAxis dataKey="day" stroke="rgb(var(--color-muted))" />
      <YAxis unit="%" stroke="rgb(var(--color-muted))" domain={[0, 100]} />
      <Tooltip
        contentStyle={{
          background: 'rgb(var(--color-surface))',
          borderRadius: '1rem',
          border: '1px solid rgba(var(--color-border) / 0.4)',
        }}
      />
      <Area
        type="monotone"
        dataKey="occupancy"
        stroke="rgb(var(--color-primary))"
        strokeWidth={3}
        fillOpacity={1}
        fill="url(#occupancyGradient)"
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default OccupancyAreaChart;
