/**
 * Sparkline - Mini inline chart component
 * Lightweight chart for showing trends in compact spaces
 */

import { cn } from '@/lib/cn';
import { Area, AreaChart, ResponsiveContainer, Line, LineChart } from 'recharts';
import { chartPalette, chartSoftPalette } from './palette';

const Sparkline = ({
  data,
  dataKey = 'value',
  type = 'area', // 'area' | 'line'
  color = 'primary',
  width = 100,
  height = 32,
  showGradient = true,
  className,
}) => {
  const strokeColor = chartPalette[color] || chartPalette.primary;
  const fillColor = chartSoftPalette[color] || chartSoftPalette.primary;
  const gradientId = `sparkline-gradient-${color}-${Math.random().toString(36).substr(2, 9)}`;

  if (!data || data.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center', className)}
        style={{ width, height }}
      >
        <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-subtle)]">
          No data
        </span>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className={className} style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          {showGradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColor}
            strokeWidth={2}
            fill={showGradient ? `url(#${gradientId})` : fillColor}
            fillOpacity={1}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;

