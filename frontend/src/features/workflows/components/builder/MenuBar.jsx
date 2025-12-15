/**
 * MenuBar - Menu bar component for the workflow builder
 * Provides File, Edit, View, Settings, and Help menus with keyboard shortcuts
 */
import { useState, useRef, useEffect } from 'react';
import {
  Save,
  Upload,
  Download,
  Copy,
  Trash2,
  Undo,
  Redo,
  Settings,
  Eye,
  EyeOff,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Keyboard,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export default function MenuBar({
  workflow,
  onSave,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenSettings,
  onToggleLeftPanel,
  showLeftPanel = true,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExit,
  onShowShortcuts,
}) {
  const [openMenu, setOpenMenu] = useState(null);

  const handleExport = () => {
    const data = JSON.stringify(workflow, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflow.name || 'workflow'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          JSON.parse(text);
          // Import logic would go here - data is parsed but not used yet
        } catch {
          // Invalid JSON - silently ignore
        }
      }
    };
    input.click();
    setOpenMenu(null);
  };

  const menus = {
    file: {
      label: 'File',
      items: [
        { label: 'Save', icon: Save, onClick: onSave, shortcut: 'Ctrl+S' },
        { type: 'separator' },
        { label: 'Duplicate workflow', icon: Copy, onClick: onDuplicate },
        { label: 'Export as JSON', icon: Download, onClick: handleExport },
        { label: 'Import from JSON', icon: Upload, onClick: handleImport },
        { type: 'separator' },
        { label: 'Exit builder', icon: LogOut, onClick: onExit },
        { type: 'separator' },
        { label: 'Delete workflow', icon: Trash2, onClick: onDelete, danger: true },
      ],
    },
    edit: {
      label: 'Edit',
      items: [
        { label: 'Undo', icon: Undo, onClick: onUndo, shortcut: 'Ctrl+Z', disabled: !canUndo },
        { label: 'Redo', icon: Redo, onClick: onRedo, shortcut: 'Ctrl+Shift+Z', disabled: !canRedo },
        { type: 'separator' },
        { label: 'Workflow settings', icon: Settings, onClick: () => onOpenSettings?.('general') },
      ],
    },
    view: {
      label: 'View',
      items: [
        {
          label: showLeftPanel ? 'Hide left panel' : 'Show left panel',
          icon: showLeftPanel ? EyeOff : Eye,
          onClick: onToggleLeftPanel,
          shortcut: 'Ctrl+\\',
        },
        { type: 'separator' },
        { label: 'Zoom in', icon: ZoomIn, onClick: onZoomIn, shortcut: 'Ctrl++' },
        { label: 'Zoom out', icon: ZoomOut, onClick: onZoomOut, shortcut: 'Ctrl+-' },
        { label: 'Reset zoom', icon: Maximize2, onClick: onResetZoom, shortcut: 'Ctrl+0' },
      ],
    },
    settings: {
      label: 'Settings',
      items: [
        { label: 'Re-enrollment', onClick: () => onOpenSettings?.('reenrollment') },
        { label: 'Suppression list', onClick: () => onOpenSettings?.('suppression') },
        { label: 'Goals', onClick: () => onOpenSettings?.('goals') },
        { label: 'Timing', onClick: () => onOpenSettings?.('timing') },
        { label: 'Unenrollment', onClick: () => onOpenSettings?.('unenrollment') },
      ],
    },
    help: {
      label: 'Help',
      items: [
        {
          label: 'Documentation',
          icon: BookOpen,
          onClick: () => window.open('/docs/workflows', '_blank'),
        },
        { label: 'Keyboard shortcuts', icon: Keyboard, onClick: onShowShortcuts, shortcut: 'Ctrl+/' },
        { type: 'separator' },
        { label: 'Send feedback', icon: MessageSquare, onClick: () => {} },
      ],
    },
  };

  return (
    <div className="flex items-center border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]">
      {Object.entries(menus).map(([key, menu]) => (
        <MenuDropdown
          key={key}
          label={menu.label}
          items={menu.items}
          isOpen={openMenu === key}
          onOpen={() => setOpenMenu(openMenu === key ? null : key)}
          onClose={() => setOpenMenu(null)}
          onHover={() => openMenu && setOpenMenu(key)}
        />
      ))}
    </div>
  );
}

function MenuDropdown({ label, items, isOpen, onOpen, onClose, onHover }) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onOpen}
        onMouseEnter={onHover}
        className={cn(
          'px-3 py-1.5 text-sm transition-colors',
          isOpen
            ? 'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]'
            : 'text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]'
        )}
      >
        {label}
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-0.5 w-56 z-50',
            'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
            'rounded-lg shadow-xl py-1'
          )}
        >
          {items.map((item, index) =>
            item.type === 'separator' ? (
              <div key={index} className="my-1 border-t border-[var(--bb-color-border-subtle)]" />
            ) : (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2',
                  item.disabled
                    ? 'text-[var(--bb-color-text-tertiary)] cursor-not-allowed'
                    : item.danger
                      ? 'text-[var(--bb-color-status-negative)] hover:bg-[rgba(239,68,68,0.1)]'
                      : 'text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]'
                )}
              >
                {item.icon && <item.icon size={14} />}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && (
                  <span className="text-xs text-[var(--bb-color-text-tertiary)]">{item.shortcut}</span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
