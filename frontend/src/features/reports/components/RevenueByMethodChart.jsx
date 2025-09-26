import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RevenueByMethodChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(var(--color-border) / 0.4)" />
      <XAxis dataKey="method" stroke="rgb(var(--color-muted))" />
      <YAxis
        stroke="rgb(var(--color-muted))"
        tickFormatter={(value) => `$${value.toLocaleString()}`}
      />
      <Tooltip
        contentStyle={{
          background: 'rgb(var(--color-surface))',
          borderRadius: '1rem',
          border: '1px solid rgba(var(--color-border) / 0.4)',
        }}
        formatter={(value) => `$${Number(value).toLocaleString()}`}
      />
      <Bar dataKey="amount" fill="rgb(var(--color-primary))" radius={[8, 8, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);

export default RevenueByMethodChart;
