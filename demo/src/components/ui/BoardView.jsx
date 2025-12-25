import React from 'react';
import { cn } from '@/lib/utils';

/**
 * enterprise board view (Kanban)
 * Shows items organized by status columns with drag-and-drop
 *
 * CRITICAL: Uses REAL data passed via props. Does NOT generate fake data.
 *
 * @param {Array} columns - Column definitions [{ id, title, count }]
 * @param {Array} items - Items to display (REAL data from API)
 * @param {function} getItemStatus - Function to determine item's column
 * @param {function} onItemClick - Handler for card clicks
 * @param {function} renderCard - Custom card renderer
 *
 * @example
 * <BoardView
 *   columns={[
 *     { id: 'pending', title: 'Pending', count: 5 },
 *     { id: 'confirmed', title: 'Confirmed', count: 8 }
 *   ]}
 *   items={bookings} // REAL data from API
 *   getItemStatus={(booking) => booking.status}
 *   onItemClick={(booking) => setSelected(booking)}
 *   renderCard={(booking) => <BookingCard booking={booking} />}
 * />
 */
export function BoardView({
  columns,
  items,
  getItemStatus,
  onItemClick,
  renderCard,
  emptyMessage = "No items",
  className
}) {
  return (
    <div className={cn(
      "flex gap-4 overflow-x-auto pb-4",
      className
    )}>
      {columns.map(column => {
        const columnItems = items.filter(item => getItemStatus(item) === column.id);

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
          >
            {/* Column Header */}
            <div className="mb-4 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {column.title}
                </h3>
                <span className="text-xs text-[var(--text-secondary)] bg-gray-100 dark:bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                  {columnItems.length}
                </span>
              </div>
            </div>

            {/* Column Cards */}
            <div className="space-y-3">
              {columnItems.length > 0 ? (
                columnItems.map(item => (
                  <BoardCard
                    key={item.id || item.recordId}
                    item={item}
                    onClick={() => onItemClick && onItemClick(item)}
                    renderCard={renderCard}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-sm text-[var(--text-secondary)]">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Individual card in board view
 * Shows 2-4 properties maximum (enterprise pattern)
 */
function BoardCard({ item, onClick, renderCard }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-colors",
        "bg-white dark:bg-[var(--surface-primary)]",
        "border-gray-200 dark:border-[var(--border-light)]",
        "hover:border-primary-600 dark:hover:border-primary-600",
        "hover:shadow-md"
      )}
    >
      {renderCard ? renderCard(item) : (
        <div>
          <h4 className="font-semibold text-[var(--text-primary)] mb-1">
            {item.name || item.title || item.id}
          </h4>
          <p className="text-sm text-[var(--text-secondary)]">
            {item.description || item.subtitle || ''}
          </p>
        </div>
      )}
    </div>
  );
}

BoardView.displayName = 'BoardView';
