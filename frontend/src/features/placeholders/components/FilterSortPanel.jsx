import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const FilterSortPanel = ({ isOpen, onClose, filters, onFiltersChange }) => {
  if (!isOpen) return null;

  const handleFilterChange = (category, value) => {
    onFiltersChange({
      ...filters,
      [category]: value
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Filters & Sorting</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Status</h4>
            <div className="space-y-2">
              {['scheduled', 'checked_in', 'checked_out'].map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={(e) => {
                      const newStatus = e.target.checked
                        ? [...filters.status, status]
                        : filters.status.filter(s => s !== status);
                      handleFilterChange('status', newStatus);
                    }}
                    className="mr-2"
                  />
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Sort by</h4>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md"
            >
              <option value="scheduled_time">Scheduled Time</option>
              <option value="check_in_time">Check-in Time</option>
              <option value="pet_name">Pet Name</option>
              <option value="owner_name">Owner Name</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Reset
          </Button>
          <Button onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterSortPanel;
