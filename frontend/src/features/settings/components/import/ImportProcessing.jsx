import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const STAGES = [
  { id: 'validating', label: 'Validating data...' },
  { id: 'checking', label: 'Checking for duplicates...' },
  { id: 'creating', label: 'Creating records...' },
  { id: 'associations', label: 'Creating associations...' },
];

/**
 * Full-screen processing overlay - enterprise style
 */
const ImportProcessing = ({
  isVisible,
  currentStage = 'validating',
  progress = null,
  error = null,
}) => {
  if (!isVisible) return null;

  const currentIndex = STAGES.findIndex(s => s.id === currentStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/95 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 text-center">
        {/* Spinner or Status Icon */}
        <div className="mb-6">
          {error ? (
            <div className="w-16 h-16 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-danger" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-text mb-2">
          {error ? 'Import Failed' : 'Importing your data...'}
        </h2>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-danger mb-6">{error}</p>
        )}

        {/* Progress Stages */}
        {!error && (
          <div className="space-y-3 mb-6">
            {STAGES.map((stage, index) => {
              const isComplete = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isPending = index > currentIndex;

              return (
                <div
                  key={stage.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2 rounded-lg transition-all',
                    isCurrent && 'bg-accent/10',
                    isComplete && 'opacity-60',
                    isPending && 'opacity-40'
                  )}
                >
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-accent animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-muted/30" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    isCurrent ? 'text-text font-medium' : 'text-muted'
                  )}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Progress bar (if percentage available) */}
        {progress !== null && !error && (
          <div className="mb-6">
            <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">{progress}% complete</p>
          </div>
        )}

        {/* Info message */}
        {!error && (
          <p className="text-sm text-muted">
            You can navigate away. We'll notify you when complete.
          </p>
        )}
      </div>
    </div>
  );
};

export default ImportProcessing;
