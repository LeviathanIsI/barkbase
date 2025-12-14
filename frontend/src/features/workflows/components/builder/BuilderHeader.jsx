/**
 * BuilderHeader - Header component for the workflow builder
 * Includes back button, editable workflow name, menu bar, and primary CTA
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Save,
  Undo,
  Redo,
  Settings,
  Eye,
  HelpCircle,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { useWorkflowBuilderStore } from '../../stores/builderStore';

export default function BuilderHeader({
  onSave,
  onActivate,
  isSaving = false,
}) {
  const navigate = useNavigate();
  const {
    workflow,
    isDirty,
    setWorkflowName,
    hasTrigger,
  } = useWorkflowBuilderStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflow.name);
  const nameInputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Update edited name when workflow name changes
  useEffect(() => {
    setEditedName(workflow.name);
  }, [workflow.name]);

  const handleNameSubmit = () => {
    if (editedName.trim()) {
      setWorkflowName(editedName.trim());
    } else {
      setEditedName(workflow.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(workflow.name);
      setIsEditingName(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/workflows');
      }
    } else {
      navigate('/workflows');
    }
  };

  const canActivate = hasTrigger();

  return (
    <div className="flex flex-col border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left side - Back button */}
        <button
          onClick={handleBack}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded",
            "text-sm font-medium text-[var(--bb-color-text-primary)]",
            "hover:bg-[var(--bb-color-bg-elevated)]",
            "transition-colors"
          )}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Center - Workflow name */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                className={cn(
                  "px-2 py-1 text-lg font-semibold text-center",
                  "bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-accent)]",
                  "rounded focus:outline-none",
                  "text-[var(--bb-color-text-primary)]"
                )}
                style={{ width: `${Math.max(editedName.length, 10)}ch` }}
              />
              <button
                onClick={handleNameSubmit}
                className="p-1 text-[var(--bb-color-status-positive)] hover:bg-[var(--bb-color-bg-elevated)] rounded"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setEditedName(workflow.name);
                  setIsEditingName(false);
                }}
                className="p-1 text-[var(--bb-color-text-tertiary)] hover:bg-[var(--bb-color-bg-elevated)] rounded"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded",
                "hover:bg-[var(--bb-color-bg-elevated)]",
                "transition-colors group"
              )}
            >
              <span className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
                {workflow.name}
              </span>
              <Pencil
                size={14}
                className="text-[var(--bb-color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          )}

          {isDirty && (
            <span className="text-xs text-[var(--bb-color-text-tertiary)]">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onSave}
            loading={isSaving}
            disabled={!isDirty}
            leftIcon={<Save size={16} />}
          >
            Save
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onActivate}
            disabled={!canActivate}
          >
            Review and turn on
          </Button>
        </div>
      </div>

      {/* Menu bar row */}
      <div className="flex items-center gap-1 px-4 h-9 border-t border-[var(--bb-color-border-subtle)]">
        <MenuDropdown label="File">
          <MenuItem icon={<Save size={14} />} label="Save" shortcut="Ctrl+S" onClick={onSave} />
          <MenuDivider />
          <MenuItem label="Exit" onClick={handleBack} />
        </MenuDropdown>

        <MenuDropdown label="Edit">
          <MenuItem icon={<Undo size={14} />} label="Undo" shortcut="Ctrl+Z" disabled />
          <MenuItem icon={<Redo size={14} />} label="Redo" shortcut="Ctrl+Y" disabled />
        </MenuDropdown>

        <MenuDropdown label="Settings">
          <MenuItem icon={<Settings size={14} />} label="Workflow settings" disabled />
        </MenuDropdown>

        <MenuDropdown label="View">
          <MenuItem icon={<Eye size={14} />} label="Zoom to fit" disabled />
        </MenuDropdown>

        <MenuDropdown label="Help">
          <MenuItem icon={<HelpCircle size={14} />} label="Documentation" disabled />
        </MenuDropdown>
      </div>
    </div>
  );
}

// Menu dropdown component
function MenuDropdown({ label, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-3 py-1 text-sm text-[var(--bb-color-text-secondary)] rounded",
          "hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]",
          isOpen && "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]"
        )}
      >
        {label}
      </button>

      {isOpen && (
        <div className={cn(
          "absolute left-0 mt-1 w-48 z-50",
          "bg-[var(--bb-color-bg-elevated)] rounded-md",
          "border border-[var(--bb-color-border-subtle)]",
          "shadow-lg py-1"
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

// Menu item component
function MenuItem({ icon, label, shortcut, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full px-3 py-1.5 flex items-center justify-between",
        "text-sm text-left",
        disabled
          ? "text-[var(--bb-color-text-tertiary)] cursor-not-allowed"
          : "text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]"
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {shortcut && (
        <span className="text-xs text-[var(--bb-color-text-tertiary)]">
          {shortcut}
        </span>
      )}
    </button>
  );
}

// Menu divider component
function MenuDivider() {
  return <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />;
}
