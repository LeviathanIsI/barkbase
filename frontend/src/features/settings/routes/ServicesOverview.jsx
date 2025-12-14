import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Upload, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import ActionableEmptyState from './components/ActionableEmptyState';
import IndustryTemplatesModal from './components/IndustryTemplatesModal';
import ServiceListView from './components/ServiceListView';
import ServiceCreationModal from './components/ServiceCreationModal';
import BulkImportModal from './components/BulkImportModal';
import { useServicesQuery } from '../api';

const OBJECT_TYPES = [
  { recordId: 'boarding', label: 'Boarding' },
  { recordId: 'daycare', label: 'Daycare' },
  { recordId: 'grooming', label: 'Grooming' },
  { recordId: 'training', label: 'Training' },
  { recordId: 'add-ons', label: 'Add-ons' },
  { recordId: 'memberships', label: 'Memberships' },
];

const ServicesOverview = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [selectedCategory, setSelectedCategory] = useState(
    tabParam && OBJECT_TYPES.find(t => t.recordId === tabParam) ? tabParam : 'boarding'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Real API data
  const { data: servicesData, isLoading: servicesLoading } = useServicesQuery();

  const handleBrowseTemplates = () => {
    setIsTemplatesModalOpen(true);
  };

  const handleCreateService = () => {
    setIsCreateModalOpen(true);
  };

  const handleImportServices = () => {
    setIsImportModalOpen(true);
  };

  const handleWatchTutorial = () => {
    // TODO: Open tutorial video
  };

  // Process and filter services from API
  const { filteredServices, categoryStats, hasServices } = useMemo(() => {
    if (!servicesData || servicesLoading) {
      return {
        filteredServices: [],
        categoryStats: { totalRevenue: 0, totalBookings: 0, serviceCount: 0 },
        hasServices: false
      };
    }

    // Filter services by selected category
    let categoryServices = servicesData;
    if (selectedCategory !== 'all') {
      // Map selectedCategory to actual category names (case-insensitive)
      const categoryMap = {
        boarding: 'BOARDING',
        daycare: 'DAYCARE',
        grooming: 'GROOMING',
        training: 'TRAINING',
        'add-ons': 'ADD_ONS',
        memberships: 'MEMBERSHIPS'
      };
      const apiCategory = categoryMap[selectedCategory] || selectedCategory.toUpperCase();
      categoryServices = servicesData.filter(service => service.category === apiCategory);
    }

    // Apply search filter
    let filtered = categoryServices;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.name?.toLowerCase().includes(query) ||
          service.description?.toLowerCase().includes(query)
      );
    }

    // Calculate stats (these would need to be calculated from actual data or come from separate API)
    const totalRevenue = 0; // Would need separate API for revenue stats
    const totalBookings = 0; // Would need separate API for booking stats

    return {
      filteredServices: filtered,
      categoryStats: {
        totalRevenue,
        totalBookings,
        serviceCount: filtered.length
      },
      hasServices: categoryServices.length > 0
    };
  }, [servicesData, servicesLoading, selectedCategory, searchQuery]);

  if (servicesLoading) {
    return <LoadingState label="Loading services..." />;
  }

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={handleImportServices}>
          <Upload className="w-4 h-4 mr-2" />
          Import
        </Button>
        <Button variant="secondary" size="sm" onClick={handleBrowseTemplates}>
          <BookOpen className="w-4 h-4 mr-2" />
          Templates
        </Button>
        <Button onClick={handleCreateService}>
          <Plus className="h-4 w-4 mr-2" />
          Create Service
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="border-b border-border w-full justify-start gap-6 bg-transparent px-0 mb-6">
          {OBJECT_TYPES.map((type) => (
            <TabsTrigger
              key={type.recordId}
              value={type.recordId}
              className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent"
            >
              {type.label}
              {selectedCategory === type.recordId && categoryStats.serviceCount > 0 && ` (${categoryStats.serviceCount})`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content based on state */}
      {!hasServices ? (
        <ActionableEmptyState
          category={selectedCategory}
          onCreateService={handleCreateService}
        />
      ) : (
        <>
          {/* Filters and Search */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary py-2 pl-9 pr-4 text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Service count */}
              <div className="ml-auto text-sm text-gray-500 dark:text-text-secondary">
                {filteredServices.length} {filteredServices.length === 1 ? 'service' : 'services'}
              </div>
            </div>
          </div>

          {/* Service List View */}
          <ServiceListView
            services={filteredServices}
            category={selectedCategory}
            onEdit={(service) => {
              setEditingService(service);
              setIsCreateModalOpen(true);
            }}
          />
        </>
      )}

      {/* Modals */}
      <IndustryTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onImportTemplates={(templates) => {
          setIsTemplatesModalOpen(false);
        }}
      />

      <ServiceCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        category={selectedCategory}
        existingService={editingService}
        onSubmit={(serviceData) => {
          setIsCreateModalOpen(false);
          setEditingService(null);
        }}
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(data) => {
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
};

export default ServicesOverview;
