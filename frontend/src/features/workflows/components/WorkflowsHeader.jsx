/**
 * WorkflowsHeader - Header component for the workflows dashboard
 * Includes title, search, and create workflow dropdown
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  ChevronDown,
  FileCode,
  Layout,
  Sparkles,
  Search
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export default function WorkflowsHeader({
  searchQuery = '',
  onSearchChange,
  onCreateFromTemplate,
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
      {/* Left side - Title and search */}
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-[var(--bb-color-text-primary)]">
          Workflows
        </h1>

        {/* Search */}
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
              "w-64 h-9 pl-9 pr-3 rounded-md",
              "bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]",
              "text-sm text-[var(--bb-color-text-primary)]",
              "placeholder:text-[var(--bb-color-text-tertiary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)] focus:ring-1 focus:ring-[var(--bb-color-accent)]",
              "transition-colors"
            )}
          />
        </div>
      </div>

      {/* Right side - Create workflow dropdown */}
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
            "absolute right-0 mt-2 w-56 z-50",
            "bg-[var(--bb-color-bg-elevated)] rounded-md",
            "border border-[var(--bb-color-border-subtle)]",
            "shadow-lg",
            "py-1"
          )}>
            <button
              onClick={handleCreateFromScratch}
              className={cn(
                "w-full px-4 py-2.5 flex items-center gap-3 text-left",
                "text-sm text-[var(--bb-color-text-primary)]",
                "hover:bg-[var(--bb-color-bg-surface)]",
                "transition-colors"
              )}
            >
              <FileCode size={18} className="text-[var(--bb-color-text-secondary)]" />
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
                "w-full px-4 py-2.5 flex items-center gap-3 text-left",
                "text-sm text-[var(--bb-color-text-primary)]",
                "hover:bg-[var(--bb-color-bg-surface)]",
                "transition-colors"
              )}
            >
              <Layout size={18} className="text-[var(--bb-color-text-secondary)]" />
              <div>
                <div className="font-medium">From template</div>
                <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                  Start with a pre-built workflow
                </div>
              </div>
            </button>

            <button
              disabled
              className={cn(
                "w-full px-4 py-2.5 flex items-center gap-3 text-left",
                "text-sm text-[var(--bb-color-text-tertiary)]",
                "opacity-50 cursor-not-allowed"
              )}
            >
              <Sparkles size={18} />
              <div>
                <div className="font-medium">With AI</div>
                <div className="text-xs">
                  Coming soon
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
