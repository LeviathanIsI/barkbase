import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const FilterSortPanel = ({ isOpen, onClose, filters, onFiltersChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Filters & Sorting</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Advanced Filters</h3>
            <p className="text-gray-600 dark:text-text-secondary">Comprehensive filtering and sorting options coming soon...</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
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
