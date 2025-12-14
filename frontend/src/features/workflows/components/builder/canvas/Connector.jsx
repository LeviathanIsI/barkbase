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
}) {
  return (
    <div
      className="relative flex flex-col items-center"
      style={{ height: `${height}px` }}
    >
      {/* SVG line */}
      <svg
        width="2"
        height={height}
        className="overflow-visible"
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2={height}
          stroke="var(--bb-color-border-subtle)"
          strokeWidth="2"
          strokeDasharray={dashed ? "4 4" : undefined}
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
        width="2"
        height={height}
        className="overflow-visible"
        style={{ marginTop: '20px' }}
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2={height - 20}
          stroke="var(--bb-color-border-subtle)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
