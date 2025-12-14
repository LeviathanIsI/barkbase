import { memo } from 'react';

export const TableRow = memo(function TableRow({
  data,
  columns,
  isSelected,
  onClick,
  onSelect,
  className = '',
}) {
  return (
    <tr
      className={`
        border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800
        cursor-pointer transition-colors
        ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
        ${className}
      `}
      onClick={() => onClick?.(data)}
      role="row"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(data);
        }
      }}
    >
      {onSelect && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(data);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 dark:border-gray-600"
            aria-label={`Select row`}
          />
        </td>
      )}
      {columns.map((column) => (
        <td
          key={column.key}
          className={`px-4 py-3 ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}`}
          style={{ minWidth: column.minWidth, maxWidth: column.maxWidth }}
        >
          {column.render ? column.render(data) : data[column.key]}
        </td>
      ))}
    </tr>
  );
});

// Memoized card component for grid views
export const EntityCard = memo(function EntityCard({
  data,
  title,
  subtitle,
  image,
  badges,
  onClick,
  actions,
  className = '',
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={() => onClick?.(data)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(data);
        }
      }}
    >
      <div className="flex items-start gap-3">
        {image && (
          <img
            src={image}
            alt=""
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
          )}
          {badges && (
            <div className="mt-2 flex flex-wrap gap-1">
              {badges}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});
