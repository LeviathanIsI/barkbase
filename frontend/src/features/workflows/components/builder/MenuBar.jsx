/**
 * MenuBar - HubSpot-style menu bar for the workflow builder
 * Provides File, Edit, Settings, View, and Help menus
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  ChevronRight,
  Search,
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
  const { selectStep } = useWorkflowBuilderStore();

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
        { label: 'Performance', onClick: () => window.open('/workflows/performance', '_blank'), external: true },
        { label: 'Enrollment history', onClick: () => {} },
        { label: 'Metrics', onClick: () => {} },
        { label: 'Action logs', onClick: () => window.open('/workflows/logs', '_blank'), external: true },
      ],
    },
    help: {
      label: 'Help',
      hasSearch: true,
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
          hasSearch={menu.hasSearch}
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
  hasSearch,
  isOpen,
  onOpen,
  onClose,
  onHover,
}) {
  const ref = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Reset search when menu closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setActiveSubmenu(null);
    }
  }, [isOpen]);

  // Filter items based on search
  const filteredItems = searchQuery
    ? items?.filter(
        (item) =>
          item.type !== 'separator' &&
          item.label?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

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
            'bg-white border border-gray-200',
            'rounded-lg shadow-xl py-1'
          )}
        >
          {/* Search input for Help menu */}
          {hasSearch && (
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menus Ctrl + K"
                  className={cn(
                    'w-full pl-3 pr-8 py-1.5 text-sm',
                    'bg-gray-50 border border-gray-200 rounded',
                    'text-gray-900 placeholder-gray-500',
                    'focus:outline-none focus:border-blue-400'
                  )}
                />
                <Search
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Menu items */}
          {filteredItems?.map((item, index) =>
            item.type === 'separator' ? (
              <div key={index} className="my-1 border-t border-gray-100" />
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
            filteredItems?.find((item) => item.label === activeSubmenu)?.submenu &&
            createPortal(
              <div
                className={cn(
                  'fixed w-48 z-[60]',
                  'bg-white border border-gray-200',
                  'rounded-lg shadow-xl py-1'
                )}
                style={{
                  top: submenuPosition.top,
                  left: submenuPosition.left,
                }}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                {filteredItems
                  .find((item) => item.label === activeSubmenu)
                  ?.submenu.map((subItem, subIndex) =>
                    subItem.type === 'separator' ? (
                      <div key={subIndex} className="my-1 border-t border-gray-100" />
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
                          'text-gray-700 hover:bg-gray-100'
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
          ? 'text-gray-400 cursor-not-allowed'
          : item.danger
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100',
        isSubmenuActive && 'bg-gray-100'
      )}
    >
      {item.danger && <Trash2 size={14} />}
      <span className="flex-1">{item.label}</span>
      {item.external && <ExternalLink size={12} className="text-gray-400" />}
      {item.submenu && <ChevronRight size={14} className="text-gray-400" />}
      {item.shortcut && (
        <span className="text-xs text-gray-400">{item.shortcut}</span>
      )}
    </button>
  );
}
