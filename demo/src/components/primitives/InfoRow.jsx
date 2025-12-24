import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';

/**
 * Two-column label/value row with optional helpers (copy, tooltip, mono).
 */
export default function InfoRow({
  label,
  value,
  hint,
  copyable = false,
  mono = false,
  tooltip,
  className,
  labelClassName,
  valueClassName,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyable || typeof value !== 'string') return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy value', error);
    }
  };

  return (
    <div className={cn('flex items-start justify-between gap-3', className)} title={tooltip}>
      <div className={cn('text-xs font-medium uppercase tracking-wide text-muted', labelClassName)}>
        {label}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-end gap-1 text-right">
        <div
          className={cn(
            'text-sm text-text',
            mono && 'font-mono',
            valueClassName,
          )}
        >
          {value ?? <span className="text-muted">—</span>}
        </div>

        {(hint || copyable) && (
          <div className="flex items-center gap-2 text-xs text-muted">
            {hint && <span>{hint}</span>}
            {copyable && typeof value === 'string' && value && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy value'}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
