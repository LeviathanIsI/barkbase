/**
 * MenuBar - enterprise menu bar for the workflow builder
 * Provides File, Edit, Settings, View, and Help menus
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';

export default function MenuBar({
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onOpenSettings,
  onResetZoom,
  onFitToScreen,
  onShowShortcuts,
  onExportPNG,
  onCleanup,
  onAddAction,
  onManualEnroll,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const { selectStep, workflow } = useWorkflowBuilderStore();
  const workflowId = workflow?.id;

  // Export as PNG handler
  const handleExportPNG = () => {
    onExportPNG?.();
    setOpenMenu(null);
  };

  // Handle new workflow
  const handleNew = () => {
    window.open('/workflows/new', '_blank');
    setOpenMenu(null);
  };

  // Handle clone
  const handleClone = () => {
    onDuplicate?.();
    setOpenMenu(null);
  };

  // Handle delete
  const handleDelete = () => {
    onDelete?.();
    setOpenMenu(null);
  };

  // Handle edit trigger
  const handleEditTrigger = () => {
    selectStep('trigger');
    setOpenMenu(null);
  };

  // Handle settings - just opens settings panel
  const handleOpenSettings = () => {
    onOpenSettings?.();
    setOpenMenu(null);
  };

  const menus = {
    file: {
      label: 'File',
      items: [
        { label: 'New', onClick: handleNew, external: true },
        { label: 'Clone', onClick: handleClone, external: true },
        { label: 'Export as .PNG', onClick: handleExportPNG },
        {
          label: 'Organize',
          submenu: [
            { label: 'Move to folder', onClick: () => {} },
            { label: 'Add tags', onClick: () => {} },
          ],
        },
        { type: 'separator' },
        { label: 'Delete', onClick: handleDelete, danger: true },
      ],
    },
    edit: {
      label: 'Edit',
      items: [
        { label: 'Edit enrollment trigger', onClick: handleEditTrigger, shortcut: 'Ctrl + Shift + E' },
        { label: 'Add action', onClick: onAddAction, shortcut: 'Ctrl + Shift + A' },
        { label: 'Edit available records', onClick: () => {} },
        { label: 'Edit goal', onClick: () => onOpenSettings?.('goals') },
        { label: 'Clean up workflow', onClick: onCleanup, disabled: true },
        { type: 'separator' },
        { label: 'Undo', onClick: onUndo, shortcut: 'Ctrl + Z', disabled: !canUndo },
        { label: 'Redo', onClick: onRedo, shortcut: 'Ctrl + Shift + Z', disabled: !canRedo },
        { type: 'separator' },
        { label: 'Manually enroll contact', onClick: onManualEnroll },
      ],
    },
    settings: {
      label: 'Settings',
      isButton: true,
      onClick: handleOpenSettings,
    },
    view: {
      label: 'View',
      items: [
        { label: 'Comments', onClick: () => {}, shortcut: 'Alt + Shift + C' },
        {
          label: 'Zoom',
          submenu: [
            { label: '50%', onClick: () => {} },
            { label: '75%', onClick: () => {} },
            { label: '100%', onClick: onResetZoom },
            { label: '125%', onClick: () => {} },
            { label: '150%', onClick: () => {} },
            { type: 'separator' },
            { label: 'Fit to screen', onClick: onFitToScreen },
          ],
        },
        { label: 'Test', onClick: () => {} },
        { label: 'Connections', onClick: () => {} },
        { type: 'separator' },
        { label: 'Revision history', onClick: () => {} },
        { label: 'Performance', onClick: () => workflowId && window.open(`/workflows/${workflowId}/details`, '_blank'), external: true, disabled: !workflowId },
        { label: 'Enrollment history', onClick: () => workflowId && window.open(`/workflows/${workflowId}/details`, '_blank'), external: true, disabled: !workflowId },
        { label: 'Metrics', onClick: () => {} },
        { label: 'Action logs', onClick: () => workflowId && window.open(`/workflows/${workflowId}/logs`, '_blank'), external: true, disabled: !workflowId },
      ],
    },
    help: {
      label: 'Help',
      items: [
        { label: 'Knowledge base', onClick: () => window.open('/docs/workflows', '_blank'), external: true },
        { type: 'separator' },
        { label: 'Troubleshoot actions', onClick: () => {} },
        { label: 'Troubleshoot enrollment', onClick: () => {} },
        { label: 'Keyboard shortcuts', onClick: onShowShortcuts, shortcut: 'Ctrl + /' },
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
          isButton={menu.isButton}
          buttonOnClick={menu.onClick}
          isOpen={openMenu === key}
          onOpen={() => setOpenMenu(openMenu === key ? null : key)}
          onClose={() => setOpenMenu(null)}
          onHover={() => openMenu && !menu.isButton && setOpenMenu(key)}
        />
      ))}
    </div>
  );
}

function MenuDropdown({
  label,
  items,
  isButton,
  buttonOnClick,
  isOpen,
  onOpen,
  onClose,
  onHover,
}) {
  const ref = useRef(null);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
        setActiveSubmenu(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Reset submenu when menu closes
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  // If this is a button-style menu item (like Settings)
  if (isButton) {
    return (
      <button
        onClick={buttonOnClick}
        onMouseEnter={onHover}
        className={cn(
          'px-3 py-1.5 text-sm transition-colors',
          'text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]'
        )}
      >
        {label}
      </button>
    );
  }

  const handleSubmenuHover = (item, itemRef) => {
    if (item.submenu && itemRef) {
      const rect = itemRef.getBoundingClientRect();
      setSubmenuPosition({
        top: rect.top,
        left: rect.right + 2,
      });
      setActiveSubmenu(item.label);
    } else {
      setActiveSubmenu(null);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onOpen}
        onMouseEnter={onHover}
        className={cn(
          'px-3 py-1.5 text-sm transition-colors flex items-center gap-1',
          isOpen
            ? 'bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]'
            : 'text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]'
        )}
      >
        {label}
        <ChevronRight
          size={12}
          className={cn(
            'transition-transform',
            isOpen ? 'rotate-90' : ''
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-0.5 w-64 z-50',
            'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
            'rounded-lg shadow-xl py-1'
          )}
        >
          {/* Menu items */}
          {items?.map((item, index) =>
            item.type === 'separator' ? (
              <div key={index} className="my-1 border-t border-[var(--bb-color-border-subtle)]" />
            ) : (
              <MenuItem
                key={index}
                item={item}
                onClose={onClose}
                onSubmenuHover={handleSubmenuHover}
                isSubmenuActive={activeSubmenu === item.label}
              />
            )
          )}

          {/* Submenu portal */}
          {activeSubmenu &&
            items?.find((item) => item.label === activeSubmenu)?.submenu &&
            createPortal(
              <div
                className={cn(
                  'fixed w-48 z-[60]',
                  'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
                  'rounded-lg shadow-xl py-1'
                )}
                style={{
                  top: submenuPosition.top,
                  left: submenuPosition.left,
                }}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                {items
                  .find((item) => item.label === activeSubmenu)
                  ?.submenu.map((subItem, subIndex) =>
                    subItem.type === 'separator' ? (
                      <div key={subIndex} className="my-1 border-t border-[var(--bb-color-border-subtle)]" />
                    ) : (
                      <button
                        key={subIndex}
                        onClick={() => {
                          subItem.onClick?.();
                          onClose();
                          setActiveSubmenu(null);
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-left text-sm flex items-center',
                          'text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]'
                        )}
                      >
                        {subItem.label}
                      </button>
                    )
                  )}
              </div>,
              document.body
            )}
        </div>
      )}
    </div>
  );
}

function MenuItem({ item, onClose, onSubmenuHover, isSubmenuActive }) {
  const itemRef = useRef(null);

  const handleClick = () => {
    if (item.disabled) return;
    if (item.submenu) return; // Don't close for submenu items
    item.onClick?.();
    onClose();
  };

  const handleMouseEnter = () => {
    onSubmenuHover(item, itemRef.current);
  };

  return (
    <button
      ref={itemRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      disabled={item.disabled}
      className={cn(
        'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2',
        item.disabled
          ? 'text-[var(--bb-color-text-tertiary)] cursor-not-allowed'
          : item.danger
            ? 'text-[var(--bb-color-status-negative)] hover:bg-[rgba(239,68,68,0.1)]'
            : 'text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]',
        isSubmenuActive && 'bg-[var(--bb-color-bg-surface)]'
      )}
    >
      {item.danger && <Trash2 size={14} />}
      <span className="flex-1">{item.label}</span>
      {item.external && <ExternalLink size={12} className="text-[var(--bb-color-text-tertiary)]" />}
      {item.submenu && <ChevronRight size={14} className="text-[var(--bb-color-text-tertiary)]" />}
      {item.shortcut && (
        <span className="text-xs text-[var(--bb-color-text-tertiary)]">{item.shortcut}</span>
      )}
    </button>
  );
}
