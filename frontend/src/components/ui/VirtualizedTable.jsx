import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualizedTable({
  data,
  columns,
  rowHeight = 52,
  overscan = 5,
  onRowClick,
  selectedRows,
  getRowId = (row) => row.recordId || row.id,
  context = {},
}) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 px-4 py-3 font-medium text-sm text-gray-600 dark:text-gray-300">
        {columns.map((column) => (
          <div
            key={column.key}
            style={{ width: column.width, flex: column.flex }}
            className="px-2"
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualRow) => {
            const row = data[virtualRow.index];
            const rowId = getRowId(row);
            const isSelected = selectedRows?.has(rowId);

            return (
              <div
                key={rowId}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={`
                  absolute top-0 left-0 w-full flex items-center border-b dark:border-gray-700
                  hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors px-4
                  ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-gray-900'}
                `}
                style={{
                  height: `${rowHeight}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    style={{ width: column.width, flex: column.flex }}
                    className="px-2 truncate"
                  >
                    {column.render
                      ? column.render(row, { isSelected, ...context })
                      : row[column.key]}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {data.length} {data.length === 1 ? 'item' : 'items'}
      </div>
    </div>
  );
}
