import { CheckCircle } from 'lucide-react';

/**
 * ProcessorCard - Radio-style card for selecting a payment processor
 */
const ProcessorCard = ({
  processor,
  name,
  logo,
  description,
  selected,
  connected,
  onSelect,
  disabled = false,
}) => {
  const isActive = selected && connected;

  return (
    <button
      type="button"
      onClick={() => !disabled && onSelect(processor)}
      disabled={disabled}
      className={`
        relative w-full text-left p-4 rounded-lg border-2 transition-all duration-200
        ${selected
          ? 'border-primary-500 dark:border-primary-400 bg-primary-500/10 dark:bg-primary-500/20'
          : 'border-gray-200 dark:border-surface-border bg-white dark:bg-surface-primary hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Selection indicator */}
      <div className="absolute top-3 right-3">
        <div
          className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${selected
              ? 'border-primary-500 bg-primary-500'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-surface-secondary'
            }
          `}
        >
          {selected && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
      </div>

      {/* Logo and name */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-surface-secondary">
          {logo}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-text-primary">{name}</span>
            {connected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                <CheckCircle className="w-3 h-3" />
                Connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-text-secondary">{description}</p>
        </div>
      </div>
    </button>
  );
};

export default ProcessorCard;
