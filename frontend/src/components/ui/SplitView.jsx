import React from 'react';
import { cn } from '@/lib/utils';

/**
 * HubSpot-style split view
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
      <div className="w-96 flex-shrink-0 border-r border-gray-200 dark:border-[var(--border-light)] overflow-y-auto bg-white dark:bg-[var(--surface-primary)]">
        {items && items.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-[var(--border-light)]">
            {items.map(item => (
              <div
                key={item.id || item.recordId}
                onClick={() => onItemSelect(item)}
                className={cn(
                  "p-4 cursor-pointer transition-colors",
                  "hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)]",
                  (selectedItem?.id === item.id || selectedItem?.recordId === item.recordId) && "bg-primary-50 dark:bg-primary-900/10 border-l-2 border-primary-600"
                )}
              >
                {renderListItem ? renderListItem(item) : (
                  <div>
                    <h4 className="font-medium text-[var(--text-primary)] mb-1">
                      {item.name || item.title || item.id}
                    </h4>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {item.subtitle || item.description || ''}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Right: Detail Panel */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[var(--bg-primary)]">
        {selectedItem && renderDetail ? (
          renderDetail(selectedItem)
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{emptyDetailMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

SplitView.displayName = 'SplitView';
