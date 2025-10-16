import { X } from 'lucide-react';
import Button from '@/components/ui/Button';

const FilterOptionsPanel = ({ isOpen, onClose, filters, onFiltersChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filter & View Options</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Show Services</h4>
            <div className="space-y-2">
              {['boarding', 'daycare', 'grooming', 'training'].map(service => (
                <label key={service} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.services.includes(service)}
                    onChange={(e) => {
                      const newServices = e.target.checked
                        ? [...filters.services, service]
                        : filters.services.filter(s => s !== service);
                      onFiltersChange({ ...filters, services: newServices });
                    }}
                    className="mr-2"
                  />
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Highlight</h4>
            <div className="space-y-2">
              {[
                'check-in-today',
                'check-out-today',
                'medication-required',
                'behavioral-flags',
                'first-time-customers',
                'vip-customers'
              ].map(option => (
                <label key={option} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.highlights.includes(option)}
                    onChange={(e) => {
                      const newHighlights = e.target.checked
                        ? [...filters.highlights, option]
                        : filters.highlights.filter(h => h !== option);
                      onFiltersChange({ ...filters, highlights: newHighlights });
                    }}
                    className="mr-2"
                  />
                  {option.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterOptionsPanel;
