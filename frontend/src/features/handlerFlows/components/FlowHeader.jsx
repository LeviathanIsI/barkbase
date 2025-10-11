import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const HEADER_HEIGHT = 104; // Export for canvas padding (64px top row + 40px menu row)

const FlowHeader = ({
  title,
  onTitleChange,
  hasUnsavedChanges = false,
  onSave,
  onValidate,
  onRun,
  isSaving = false,
  tenant = 'testing',
  plan = 'FREE'
}) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const titleInputRef = useRef(null);

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
            <Badge variant="success">ON</Badge>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRun}
              aria-label="Test run workflow"
            >
              Enroll
            </Button>
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
