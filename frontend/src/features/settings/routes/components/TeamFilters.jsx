import { Search, Filter, X } from 'lucide-react';
import Button from '@/components/ui/Button';

const TeamFilters = ({ filters, onFiltersChange }) => {
  const updateFilter = (key, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      role: 'all',
      status: 'all',
      location: 'all',
      sortBy: 'name'
    });
  };

  const hasActiveFilters = filters.search || filters.role !== 'all' || filters.status !== 'all' || filters.location !== 'all';

  return (
    <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filters.role}
            onChange={(e) => updateFilter('role', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="groomer">Groomer</option>
            <option value="trainer">Trainer</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending Invite</option>
          </select>

          <select
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Locations</option>
            <option value="building-a">Building A</option>
            <option value="building-b">Building B</option>
            <option value="mobile">Mobile</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="role">Sort by Role</option>
            <option value="recently-added">Recently Added</option>
            <option value="last-active">Last Active</option>
          </select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200 rounded-full">
              Search: "{filters.search}"
              <button
                onClick={() => updateFilter('search', '')}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.role !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-surface-secondary text-green-800 rounded-full">
              Role: {filters.role}
              <button
                onClick={() => updateFilter('role', 'all')}
                className="hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-surface-secondary text-purple-800 dark:text-purple-200 rounded-full">
              Status: {filters.status}
              <button
                onClick={() => updateFilter('status', 'all')}
                className="hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.location !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 dark:bg-surface-secondary text-orange-800 rounded-full">
              Location: {filters.location.replace('-', ' ')}
              <button
                onClick={() => updateFilter('location', 'all')}
                className="hover:bg-orange-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamFilters;
