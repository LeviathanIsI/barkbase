/**
 * WorkflowsHeader - Header component for the workflows dashboard
 * Includes title, search, and create workflow dropdown
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  FileCode,
  Layout,
  Sparkles,
  Search,
  Zap,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export default function WorkflowsHeader({
  searchQuery = '',
  onSearchChange,
  onCreateFromTemplate,
  hasWorkflows = false,
}) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleCreateFromScratch = () => {
    setIsDropdownOpen(false);
    navigate('/workflows/new');
  };

  const handleCreateFromTemplateClick = () => {
    setIsDropdownOpen(false);
    onCreateFromTemplate?.();
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bb-color-border-subtle)]">
      {/* Left side - Title and breadcrumb */}
      <div className="flex items-center gap-6">
        <div>
          {/* Breadcrumb */}
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Automation</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Workflows</li>
            </ol>
          </nav>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[color:var(--bb-color-accent)] to-purple-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[var(--bb-color-text-primary)]">
                Workflows
              </h1>
              {!hasWorkflows && (
                <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                  Automate tasks and communications
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Search - Only show when workflows exist */}
        {hasWorkflows && (
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--bb-color-text-tertiary)]"
            />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className={cn(
                "w-64 h-9 pl-9 pr-3 rounded-lg",
                "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
                "text-sm text-[var(--bb-color-text-primary)]",
                "placeholder:text-[var(--bb-color-text-tertiary)]",
                "focus:outline-none focus:border-[var(--bb-color-accent)] focus:ring-1 focus:ring-[var(--bb-color-accent)]",
                "transition-colors"
              )}
            />
          </div>
        )}
      </div>

      {/* Right side - Create workflow dropdown (only when workflows exist) */}
      {hasWorkflows && (
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            rightIcon={<ChevronDown size={16} className={cn(
              "transition-transform duration-200",
              isDropdownOpen && "rotate-180"
            )} />}
          >
            <Plus size={16} />
            Create workflow
          </Button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div className={cn(
              "absolute right-0 mt-2 w-64 z-50",
              "bg-[var(--bb-color-bg-elevated)] rounded-xl",
              "border border-[var(--bb-color-border-subtle)]",
              "shadow-lg",
              "py-2 overflow-hidden"
            )}>
              <button
                onClick={handleCreateFromScratch}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 text-left",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "hover:bg-[var(--bb-color-bg-surface)]",
                  "transition-colors"
                )}
              >
                <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <FileCode size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium">From scratch</div>
                  <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                    Build a custom workflow
                  </div>
                </div>
              </button>

              <button
                onClick={handleCreateFromTemplateClick}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 text-left",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "hover:bg-[var(--bb-color-bg-surface)]",
                  "transition-colors"
                )}
              >
                <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Layout size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium">From template</div>
                  <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                    Start with a pre-built workflow
                  </div>
                </div>
              </button>

              <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />

              <button
                disabled
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 text-left",
                  "text-sm text-[var(--bb-color-text-tertiary)]",
                  "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="h-9 w-9 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={18} className="text-amber-500/50" />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    With AI
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                      Soon
                    </span>
                  </div>
                  <div className="text-xs">
                    Describe what you want
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
