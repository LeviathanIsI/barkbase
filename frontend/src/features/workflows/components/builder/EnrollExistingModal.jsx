/**
 * EnrollExistingModal - Modal shown when activating filter_criteria workflows
 * Shows count of matching records and gives option to enroll them immediately
 */
import { useState, useEffect } from 'react';
import { X, Users, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import { OBJECT_TYPE_CONFIG } from '../../constants';

export default function EnrollExistingModal({ workflow, pendingFilterConfig, onClose, onActivate }) {
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activating, setActivating] = useState(false);

  const objectConfig = OBJECT_TYPE_CONFIG[workflow.objectType] || {};
  const objectLabel = objectConfig.label || workflow.objectType;
  const objectLabelPlural = objectConfig.labelPlural || `${objectLabel}s`;

  // Fetch count of matching records on mount
  // If pendingFilterConfig is provided, use POST to send the new filter
  // Otherwise use GET to read from database
  useEffect(() => {
    const fetchCount = async () => {
      try {
        setLoading(true);
        setError(null);

        let data;
        if (pendingFilterConfig) {
          // Use POST with the pending filter config (not yet saved to DB)
          const response = await apiClient.post(
            `/api/v1/workflows/${workflow.id}/matching-records-count`,
            { filterConfig: pendingFilterConfig, objectType: workflow.objectType }
          );
          data = response.data;
        } else {
          // Use GET to read filter from database
          const response = await apiClient.get(`/api/v1/workflows/${workflow.id}/matching-records-count`);
          data = response.data;
        }

        setCount(data.count);
      } catch (err) {
        console.error('Error fetching matching records:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
  }, [workflow.id, workflow.objectType, pendingFilterConfig]);

  const handleActivate = async (enrollExisting) => {
    setActivating(true);
    try {
      await onActivate({ enrollExisting });
      onClose();
    } catch (err) {
      console.error('Activation failed:', err);
      setError(err.message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={cn(
          'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
          'rounded-xl w-full max-w-md mx-4 shadow-2xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--bb-color-border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
            Do you want to enroll existing records?
          </h2>
          <button
            onClick={onClose}
            disabled={activating}
            className="p-1 hover:bg-[var(--bb-color-bg-surface)] rounded text-[var(--bb-color-text-tertiary)] disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Matching records count box */}
          <div
            className={cn(
              'p-4 rounded-lg border',
              'bg-[var(--bb-color-bg-surface)] border-[var(--bb-color-border-subtle)]'
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="w-5 h-5 text-[var(--bb-color-accent)] animate-spin" />
                <span className="text-sm text-[var(--bb-color-text-secondary)]">
                  Counting matching records...
                </span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-[#EF4444]">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">Error: {error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    'bg-[var(--bb-color-accent)]/10'
                  )}
                >
                  <Users className="w-5 h-5 text-[var(--bb-color-accent)]" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-[var(--bb-color-text-primary)]">
                    {count?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-[var(--bb-color-text-secondary)]">
                    {objectLabelPlural.toLowerCase()} match your filter criteria
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="text-sm text-[var(--bb-color-text-tertiary)] space-y-2">
            <p>
              <strong className="text-[var(--bb-color-text-secondary)]">Enroll existing:</strong>{' '}
              These {count?.toLocaleString() || 0} {objectLabelPlural.toLowerCase()} will be enrolled
              immediately when you activate the workflow.
            </p>
            <p>
              <strong className="text-[var(--bb-color-text-secondary)]">Don't enroll:</strong>{' '}
              Only future {objectLabelPlural.toLowerCase()} that match the criteria will be enrolled.
            </p>
          </div>

          {/* Info note */}
          {count > 0 && !loading && !error && (
            <div className="flex items-start gap-2 p-3 bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-lg">
              <CheckCircle className="w-4 h-4 text-[#3B82F6] mt-0.5 flex-shrink-0" />
              <span className="text-sm text-[#93C5FD]">
                Enrolling existing records will queue them for processing immediately.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 p-4 border-t border-[var(--bb-color-border-subtle)]">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleActivate(true)}
            disabled={activating || loading || count === 0}
            loading={activating}
            className="w-full bg-[#10B981] hover:bg-[#059669]"
          >
            {activating ? 'Activating...' : `Save and enroll ${count?.toLocaleString() || 0} existing records`}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleActivate(false)}
            disabled={activating}
            className="w-full"
          >
            Save and don't enroll existing records
          </Button>
        </div>
      </div>
    </div>
  );
}
