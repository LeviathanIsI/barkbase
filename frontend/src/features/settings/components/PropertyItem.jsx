import { Lock, MoreVertical, Edit2, Trash2, Link as LinkIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const TYPE_ICONS = {
  string: '📝',
  text: '📄',
  number: '🔢',
  currency: '💰',
  date: '📅',
  datetime: '🕒',
  boolean: '✓',
  enum: '📋',
  multi_enum: '☑️',
  email: '📧',
  phone: '📞',
  url: '🔗',
  association: '🔗',
  file: '📎',
  uuid: '🔑',
};

const TYPE_COLORS = {
  string: 'bg-blue-100 dark:bg-surface-secondary text-blue-700 dark:text-blue-300',
  text: 'bg-blue-100 dark:bg-surface-secondary text-blue-700 dark:text-blue-300',
  number: 'bg-purple-100 dark:bg-surface-secondary text-purple-700 dark:text-purple-300',
  currency: 'bg-green-100 dark:bg-surface-secondary text-green-700',
  date: 'bg-orange-100 dark:bg-surface-secondary text-orange-700',
  datetime: 'bg-orange-100 dark:bg-surface-secondary text-orange-700',
  boolean: 'bg-teal-100 dark:bg-surface-secondary text-teal-700',
  enum: 'bg-indigo-100 dark:bg-surface-secondary text-indigo-700',
  multi_enum: 'bg-indigo-100 dark:bg-surface-secondary text-indigo-700',
  email: 'bg-pink-100 dark:bg-surface-secondary text-pink-700',
  phone: 'bg-pink-100 dark:bg-surface-secondary text-pink-700',
  url: 'bg-cyan-100 dark:bg-surface-secondary text-cyan-700',
  association: 'bg-violet-100 dark:bg-surface-secondary text-violet-700',
  file: 'bg-amber-100 dark:bg-surface-secondary text-amber-700',
  uuid: 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary',
};

const PropertyItem = ({ property, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const typeColor = TYPE_COLORS[property.type] || 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary';
  const typeIcon = TYPE_ICONS[property.type] || '📦';

  return (
    <div className="group flex items-center gap-4 px-6 py-4 hover:bg-surface/50 transition-colors">
      {/* Icon */}
      <div className="flex-shrink-0 text-2xl">{typeIcon}</div>

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-text">{property.label}</h4>
          {property.system && <Lock className="h-3.5 w-3.5 text-muted" />}
          {property.required && (
            <Badge variant="danger" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <code className="rounded bg-surface/80 px-1.5 py-0.5 font-mono">{property.name}</code>
          {property.description && (
            <>
              <span>·</span>
              <span className="truncate">{property.description}</span>
            </>
          )}
        </div>
      </div>

      {/* Type Badge */}
      <div className={cn('rounded-md px-2.5 py-1 text-xs font-medium', typeColor)}>
        {property.type}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {property.system ? (
          <div className="flex h-8 w-8 items-center justify-center">
            <Lock className="h-4 w-4 text-muted" />
          </div>
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted opacity-0 transition hover:bg-surface group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-surface shadow-lg">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit(property);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text hover:bg-surface/80 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit property
                  </button>
                  <button
                    onClick={() => {
                      onDelete(property);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:bg-surface-primary transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete property
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyItem;
