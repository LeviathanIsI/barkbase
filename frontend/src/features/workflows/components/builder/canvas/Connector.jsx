/**
 * Connector - Connector line component for the workflow canvas
 * SVG line connecting steps with optional plus button
 */
import { cn } from '@/lib/cn';

export default function Connector({
  height = 40,
  showPlus = false,
  onPlusClick,
  dashed = false,
  animated = false,
}) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ height: `${height}px` }}
    >
      {/* SVG line with gradient */}
      <svg
        width="4"
        height={height}
        className="overflow-visible"
      >
        {/* Gradient definition for animated flow */}
        {animated && (
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--bb-color-accent)" stopOpacity="0.2">
                <animate
                  attributeName="offset"
                  values="0;1;0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="50%" stopColor="var(--bb-color-accent)" stopOpacity="0.6">
                <animate
                  attributeName="offset"
                  values="0.5;1.5;0.5"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="var(--bb-color-accent)" stopOpacity="0.2">
                <animate
                  attributeName="offset"
                  values="1;2;1"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
          </defs>
        )}

        {/* Main connector line */}
        <line
          x1="2"
          y1="0"
          x2="2"
          y2={height}
          stroke={animated ? "url(#flowGradient)" : "var(--bb-color-border-subtle)"}
          strokeWidth="2"
          strokeDasharray={dashed ? "4 4" : undefined}
          strokeLinecap="round"
        />

        {/* Direction arrow indicator at the bottom */}
        <path
          d={`M 2 ${height - 6} L 5 ${height - 10} M 2 ${height - 6} L -1 ${height - 10}`}
          stroke="var(--bb-color-border-subtle)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          className="opacity-40"
        />
      </svg>

      {/* Plus button */}
      {showPlus && (
        <button
          onClick={onPlusClick}
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-6 h-6 rounded-full",
            "bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]",
            "flex items-center justify-center",
            "text-[var(--bb-color-text-tertiary)]",
            "hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent)]",
            "hover:bg-[var(--bb-color-accent-soft)]",
            "hover:scale-110",
            "transition-all duration-150",
            "z-10"
          )}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 2.5V9.5M2.5 6H9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * BranchConnector - Connector for branching paths (determinator)
 */
export function BranchConnector({ label, color, height = 40 }) {
  const labelColor = color === 'green' ? '#10B981' : '#EF4444';

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ height: `${height}px` }}
    >
      {/* Branch label */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: `${labelColor}20`, color: labelColor }}
      >
        {label}
      </div>

      {/* SVG line */}
      <svg
        width="4"
        height={height}
        className="overflow-visible"
        style={{ marginTop: '20px' }}
      >
        <line
          x1="2"
          y1="0"
          x2="2"
          y2={height - 20}
          stroke="var(--bb-color-border-subtle)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
