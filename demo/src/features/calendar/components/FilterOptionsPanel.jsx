import Button from '@/components/ui/Button';
import SlidePanel from '@/components/ui/SlidePanel';

const FilterOptionsPanel = ({ isOpen, onClose, filters, onFiltersChange }) => {
  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title="Filter & View Options"
      width="w-full md:w-96"
    >
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Show Services</h4>
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
          <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Highlight</h4>
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

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-surface-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            Apply Filters
          </Button>
        </div>
      </div>
    </SlidePanel>
  );
};

export default FilterOptionsPanel;
