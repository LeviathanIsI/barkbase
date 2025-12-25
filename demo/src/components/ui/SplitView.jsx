import React from 'react';
import { cn } from '@/lib/utils';

/**
 * enterprise split view
 * Left: Compact list, Right: Selected item details
 *
 * CRITICAL: Uses REAL data. Does NOT create mock data.
 *
 * @param {Array} items - Items to display (REAL data from API)
 * @param {Object} selectedItem - Currently selected item
 * @param {function} onItemSelect - Selection handler
 * @param {function} renderListItem - Custom list item renderer
 * @param {function} renderDetail - Custom detail panel renderer
 *
 * @example
 * <SplitView
 *   items={pets} // REAL data
 *   selectedItem={selectedPet}
 *   onItemSelect={setSelectedPet}
 *   renderListItem={(pet) => <PetListItem pet={pet} />}
 *   renderDetail={(pet) => <PetDetail pet={pet} />}
 * />
 */
export function SplitView({
  items,
  selectedItem,
  onItemSelect,
  renderListItem,
  renderDetail,
  emptyMessage = "No items to display",
  emptyDetailMessage = "Select an item to view details",
  className
}) {
  return (
    <div className={cn("flex h-full min-h-0", className)}>
      {/* Left: Compact List */}
      <div className="w-96 flex-shrink-0 border-r border-[var(--bb-color-border-subtle)] overflow-y-auto bg-[var(--bb-color-bg-surface)]">
        {items && items.length > 0 ? (
          <div className="divide-y divide-[var(--bb-color-border-subtle)]">
            {items.map(item => (
              <div
                key={item.id || item.recordId}
                onClick={() => onItemSelect(item)}
                className={cn(
                  "p-[var(--bb-space-4)] cursor-pointer transition-colors",
                  "hover:bg-[var(--bb-color-bg-elevated)]",
                  (selectedItem?.id === item.id || selectedItem?.recordId === item.recordId) && 
                    "bg-[var(--bb-color-accent-soft)] border-l-2 border-[var(--bb-color-accent)]"
                )}
              >
                {renderListItem ? renderListItem(item) : (
                  <div>
                    <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-1)]">
                      {item.name || item.title || item.id}
                    </h4>
                    <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                      {item.subtitle || item.description || ''}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-[var(--bb-space-8)] text-center">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-[var(--bb-color-bg-base)]">
        {selectedItem && renderDetail ? (
          renderDetail(selectedItem)
        ) : (
          <div className="flex items-center justify-center h-full p-[var(--bb-space-8)] text-center">
            <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">{emptyDetailMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

SplitView.displayName = 'SplitView';
