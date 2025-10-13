import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { useManualRunMutation } from '../api';

const HEADER_HEIGHT = 104; // Export for canvas padding (64px top row + 40px menu row)

const FlowHeader = ({
  title,
  onTitleChange,
  hasUnsavedChanges = false,
  onSave,
  onValidate,
  onPublish,
  onRun,
  isSaving = false,
  tenant = 'testing',
  plan = 'FREE',
  flowId,
  flowStatus = 'draft',
}) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const titleInputRef = useRef(null);

  // Test Enroll modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollPayload, setEnrollPayload] = useState('{\n  \n}');
  const [enrollIdempotencyKey, setEnrollIdempotencyKey] = useState('');
  const manualRunMutation = useManualRunMutation();

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (localTitle.trim() !== title) {
      onTitleChange?.(localTitle.trim() || 'Unnamed workflow');
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalTitle(title);
      titleInputRef.current?.blur();
    }
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const handleTestEnroll = async () => {
    try {
      const payload = JSON.parse(enrollPayload);
      const result = await manualRunMutation.mutateAsync({
        flowId,
        payload,
        idempotencyKey: enrollIdempotencyKey || undefined,
      });

      // Navigate to run detail page
      if (result.runId) {
        navigate(`/app/handler-runs/${result.runId}`);
      }

      setShowEnrollModal(false);
    } catch (error) {
      alert(`Failed to enroll: ${error.message}`);
    }
  };

  return (
    <header
      role="banner"
      className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm"
    >
      {/* Top Row: Title and Actions */}
      <div className="h-16 flex items-center justify-between gap-4 px-4 border-b border-border">
        {/* Left Side */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/handler-flows')}
            aria-label="Back to workflows"
            className="flex-shrink-0"
          >
            ← Back to workflows
          </Button>

          {/* Editable Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1 max-w-3xl">
            <input
              ref={titleInputRef}
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={handleTitleClick}
              placeholder="Name this workflow"
              aria-label="Workflow title"
              className={cn(
                'w-full text-lg font-semibold bg-transparent border-none outline-none text-text',
                'truncate',
                isEditingTitle ? 'border-b-2 border-primary' : 'cursor-pointer hover:text-primary'
              )}
              title={localTitle}
            />
            {hasUnsavedChanges && (
              <span className="text-orange-500 text-xl leading-none flex-shrink-0" aria-label="Unsaved changes">
                •
              </span>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Workflow Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Workflow is</span>
            <Badge variant={flowStatus === 'on' ? 'success' : flowStatus === 'off' ? 'danger' : 'neutral'}>
              {flowStatus.toUpperCase()}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onValidate}
              aria-label="Validate workflow"
            >
              Validate
            </Button>
            {flowId && (
              <Button
                size="sm"
                variant="outline"
                onClick={onPublish}
                aria-label="Publish workflow"
              >
                Publish
              </Button>
            )}
            {flowId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEnrollModal(true)}
                aria-label="Test enroll workflow"
              >
                Test Enroll
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              aria-label="Save workflow"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Test Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text">Test Enroll</h2>
              <p className="text-sm text-muted mt-1">
                Manually trigger this workflow with a test payload
              </p>
            </div>

            <div className="px-6 py-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Payload (JSON)
                </label>
                <textarea
                  value={enrollPayload}
                  onChange={(e) => setEnrollPayload(e.target.value)}
                  className="w-full h-64 px-3 py-2 text-sm font-mono border border-border rounded bg-background text-text focus:ring-primary focus:border-primary"
                  placeholder='{\n  "owner": { "id": "123", "email": "test@example.com" }\n}'
                />
                <p className="text-xs text-muted mt-1">
                  Enter a JSON object to use as the context payload for this run
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Idempotency Key (optional)
                </label>
                <input
                  type="text"
                  value={enrollIdempotencyKey}
                  onChange={(e) => setEnrollIdempotencyKey(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text focus:ring-primary focus:border-primary"
                  placeholder="unique-key-123"
                />
                <p className="text-xs text-muted mt-1">
                  Prevents duplicate runs with the same key
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowEnrollModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleTestEnroll}
                disabled={manualRunMutation.isLoading}
              >
                {manualRunMutation.isLoading ? 'Starting...' : 'Start Run'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Row: Menu Bar */}
      <div className="h-10 flex items-center justify-between px-4 bg-background">
        {/* Menu Items */}
        <div className="flex items-center gap-1">
          <button className="px-3 py-1.5 text-sm text-text hover:bg-surface rounded transition-colors">
            File
          </button>
          <button className="px-3 py-1.5 text-sm text-text hover:bg-surface rounded transition-colors">
            Edit
          </button>
          <button className="px-3 py-1.5 text-sm text-text hover:bg-surface rounded transition-colors">
            Settings
          </button>
          <button className="px-3 py-1.5 text-sm text-text hover:bg-surface rounded transition-colors">
            View
          </button>
          <button className="px-3 py-1.5 text-sm text-text hover:bg-surface rounded transition-colors">
            Help
          </button>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-3 text-xs text-muted">
          <Badge variant="neutral" className="uppercase">
            {tenant}
          </Badge>
          <Badge variant="warning" className="uppercase">
            {plan}
          </Badge>
          <span className="hidden lg:inline">DEV</span>
        </div>
      </div>
    </header>
  );
};

export { HEADER_HEIGHT };
export default FlowHeader;
