/**
 * AssociationCard Component
 * Card for displaying related records in the right sidebar of detail pages
 * Shows a list of associated items with optional add/view all functionality
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, PawPrint, User, Calendar, FileText, Tag, Home, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from './Button';
import Badge from './Badge';

// Icon map for different association types
const ICON_MAP = {
  pet: PawPrint,
  pets: PawPrint,
  owner: User,
  owners: User,
  customer: User,
  customers: User,
  booking: Calendar,
  bookings: Calendar,
  invoice: FileText,
  invoices: FileText,
  segment: Tag,
  segments: Tag,
  kennel: Home,
  kennels: Home,
  service: CreditCard,
  services: CreditCard,
};

/**
 * AssociationCard - Container for related records
 * @param {string} title - Section title (e.g., "Pets", "Bookings")
 * @param {number} count - Total count of associations
 * @param {function} onAdd - Callback when Add button is clicked
 * @param {string} viewAllLink - URL for View All link
 * @param {function} onViewAll - Callback when View All is clicked (alternative to link)
 * @param {React.ReactNode} children - AssociationItem components
 * @param {string} type - Association type for icon (pet, owner, booking, etc.)
 * @param {React.ReactNode} icon - Custom icon component
 * @param {boolean} showAdd - Whether to show Add button (default true)
 * @param {string} emptyMessage - Message when no items
 */
export function AssociationCard({
  title,
  count,
  onAdd,
  viewAllLink,
  onViewAll,
  children,
  type,
  icon: CustomIcon,
  showAdd = true,
  emptyMessage = "None yet",
  className
}) {
  const Icon = CustomIcon || ICON_MAP[type?.toLowerCase()] || Tag;
  const hasItems = React.Children.count(children) > 0;

  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden",
        className
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {title}
          </span>
          {typeof count === 'number' && (
            <span
              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'var(--bb-color-bg-elevated)',
                color: 'var(--bb-color-text-muted)'
              }}
            >
              {count}
            </span>
          )}
        </div>
        {showAdd && onAdd && (
          <button
            onClick={onAdd}
            className="p-1 rounded-md transition-colors hover:bg-[var(--bb-color-bg-elevated)]"
            title={`Add ${title?.slice(0, -1) || 'item'}`}
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        {hasItems ? (
          <div className="space-y-1">
            {children}
          </div>
        ) : (
          <p
            className="text-sm text-center py-4"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            {emptyMessage}
          </p>
        )}
      </div>

      {/* View All Footer */}
      {hasItems && (viewAllLink || onViewAll) && count > React.Children.count(children) && (
        <div className="px-4 pb-3">
          {viewAllLink ? (
            <Link
              to={viewAllLink}
              className="text-sm font-medium hover:underline flex items-center gap-1"
              style={{ color: 'var(--bb-color-accent)' }}
            >
              View all {count}
              <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              onClick={onViewAll}
              className="text-sm font-medium hover:underline flex items-center gap-1"
              style={{ color: 'var(--bb-color-accent)' }}
            >
              View all {count}
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * AssociationItem - Single item within AssociationCard
 * @param {string} name - Primary display text
 * @param {string} subtitle - Secondary text
 * @param {string} href - Link destination
 * @param {function} onClick - Click handler (alternative to href)
 * @param {string} avatar - Avatar image URL
 * @param {React.ReactNode} icon - Icon component or element
 * @param {string} type - Item type for default icon
 * @param {string} status - Status for badge
 * @param {string} statusVariant - Badge variant (success, warning, danger, etc.)
 * @param {React.ReactNode} rightContent - Custom content on the right
 */
export function AssociationItem({
  name,
  subtitle,
  href,
  onClick,
  avatar,
  icon: CustomIcon,
  type,
  status,
  statusVariant = 'neutral',
  rightContent,
  className
}) {
  const navigate = useNavigate();
  const Icon = CustomIcon || ICON_MAP[type?.toLowerCase()] || null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  const isClickable = onClick || href;

  const content = (
    <>
      {/* Avatar or Icon */}
      {(avatar || Icon) && (
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full overflow-hidden"
          style={{
            backgroundColor: avatar ? 'transparent' : 'var(--bb-color-accent-soft)',
            color: 'var(--bb-color-accent)'
          }}
        >
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : Icon ? (
            <Icon className="w-4 h-4" />
          ) : null}
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--bb-color-text-primary)' }}
          title={name}
        >
          {name}
        </p>
        {subtitle && (
          <p
            className="text-xs truncate"
            style={{ color: 'var(--bb-color-text-muted)' }}
            title={subtitle}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Content or Status */}
      {rightContent || (status && (
        <Badge variant={statusVariant} size="sm">
          {status}
        </Badge>
      ))}

      {/* Chevron for clickable items */}
      {isClickable && (
        <ChevronRight
          className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--bb-color-text-muted)' }}
        />
      )}
    </>
  );

  const baseClasses = cn(
    "flex items-center gap-3 p-2 rounded-lg transition-colors group",
    isClickable && "cursor-pointer hover:bg-[var(--bb-color-bg-elevated)]",
    className
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(baseClasses, "w-full text-left")}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
}

/**
 * AssociationSingleItem - For single associations (e.g., Owner on Pet page)
 * Larger display with more prominent styling
 */
export function AssociationSingleItem({
  name,
  subtitle,
  href,
  onClick,
  avatar,
  icon: CustomIcon,
  type,
  actions,
  className
}) {
  const navigate = useNavigate();
  const Icon = CustomIcon || ICON_MAP[type?.toLowerCase()] || User;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        className
      )}
      style={{
        backgroundColor: 'var(--bb-color-bg-surface)',
        borderColor: 'var(--bb-color-border-subtle)'
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full overflow-hidden"
          style={{
            backgroundColor: avatar ? 'transparent' : 'var(--bb-color-purple-soft)',
            color: 'var(--bb-color-purple)'
          }}
        >
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-medium truncate"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {name}
          </p>
          {subtitle && (
            <p
              className="text-xs truncate"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {actions ? (
        <div className="flex gap-2">
          {actions}
        </div>
      ) : (href || onClick) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleClick}
        >
          View Profile
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  );
}

AssociationCard.displayName = 'AssociationCard';
AssociationItem.displayName = 'AssociationItem';
AssociationSingleItem.displayName = 'AssociationSingleItem';

export default AssociationCard;
