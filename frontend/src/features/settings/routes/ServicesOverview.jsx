import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, BarChart3, Download, Upload, Settings, Eye, EyeOff, BookOpen, Play, FileText } from 'lucide-react';
import Button from '@/components/ui/Button';
import ActionableEmptyState from './components/ActionableEmptyState';
import IndustryTemplatesModal from './components/IndustryTemplatesModal';
import ServiceListView from './components/ServiceListView';
import ServiceCreationModal from './components/ServiceCreationModal';
import ServiceAnalyticsDashboard from './components/ServiceAnalyticsDashboard';
import SmartRecommendations from './components/SmartRecommendations';
import CompetitorPricingIntelligence from './components/CompetitorPricingIntelligence';
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
    console.log('Watch tutorial');
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services & Pricing</h1>
          <p className="mt-1 text-gray-600">
            Configure boarding, daycare, grooming, and training services with flexible pricing
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleImportServices}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleBrowseTemplates}>
            <BookOpen className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button onClick={handleCreateService} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Service
          </Button>
        </div>
      </div>

      {/* Service Analytics Dashboard */}
      {hasServices && <ServiceAnalyticsDashboard data={currentData} />}

      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {OBJECT_TYPES.map((type) => (
            <button
              key={type.recordId}
              onClick={() => setSelectedCategory(type.recordId)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                selectedCategory === type.recordId
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {type.label}
              {selectedCategory === type.recordId && categoryStats.serviceCount > 0 && ` (${categoryStats.serviceCount})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on state */}
      {!hasServices ? (
        <ActionableEmptyState
          category={selectedCategory}
          onBrowseTemplates={handleBrowseTemplates}
          onCreateService={handleCreateService}
          onImportServices={handleImportServices}
          onWatchTutorial={handleWatchTutorial}
        />
      ) : (
        <>
          {/* Filters and Search */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-600 placeholder:opacity-75 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Service count */}
              <div className="ml-auto text-sm text-gray-500">
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

          {/* Smart Recommendations */}
          {hasServices && <SmartRecommendations services={currentData.services} />}

          {/* Competitor Pricing Intelligence */}
          {hasServices && <CompetitorPricingIntelligence services={currentData.services} />}
        </>
      )}

      {/* Modals */}
      <IndustryTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onImportTemplates={(templates) => {
          console.log('Importing templates:', templates);
          setIsTemplatesModalOpen(false);
        }}
      />

      <ServiceCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        category={selectedCategory}
        existingService={editingService}
        onSubmit={(serviceData) => {
          console.log('Creating service:', serviceData);
          setIsCreateModalOpen(false);
          setEditingService(null);
        }}
      />

      <BulkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={(data) => {
          console.log('Importing services:', data);
          setIsImportModalOpen(false);
        }}
      />
    </div>
  );
};

export default ServicesOverview;
