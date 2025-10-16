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
  const [services, setServices] = useState({});
  const [loading, setLoading] = useState({});
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Mock data for demonstration
  const mockServices = {
    boarding: {
      total_revenue: 13450,
      total_bookings: 178,
      services: [
        {
          recordId: 'standard-boarding',
          name: 'Standard Boarding',
          description: 'Overnight accommodations in standard runs',
          category: 'Boarding',
          basePrice: 45,
          unit: 'per night',
          sizePricing: {
            small: 45,
            medium: 50,
            large: 55
          },
          discounts: [
            { nights: 7, discount: 10 },
            { nights: 14, discount: 15 }
          ],
          addOns: ['Extra playtime', 'Webcam access'],
          bookingsThisMonth: 89,
          revenueThisMonth: 3960,
          avgStay: 3.2,
          rating: 4.8,
          multiPetDiscount: { discount: 5, unit: 'per additional pet' }
        },
        {
          recordId: 'suite-boarding',
          name: 'Suite Boarding (Premium)',
          description: 'Luxury accommodations with extra space',
          category: 'Boarding',
          basePrice: 75,
          unit: 'per night',
          flatRate: true,
          amenities: [
            '2x space of standard run',
            'Elevated bed & comfort items',
            'Daily report card with photos',
            '24/7 webcam access'
          ],
          bookingsThisMonth: 34,
          revenueThisMonth: 2550,
          growth: 35,
          rating: 5.0
        }
      ]
    },
    daycare: {
      total_revenue: 5460,
      total_bookings: 156,
      services: [
        {
          recordId: 'full-day-daycare',
          name: 'Full Day Daycare',
          description: 'Drop off by 9am, pick up by 6pm',
          category: 'Daycare',
          basePrice: 35,
          unit: 'per day',
          packages: [
            { name: '5-day pass', price: 160, savings: 15 },
            { name: '10-day pass', price: 300, savings: 50 },
            { name: '20-day pass', price: 560, savings: 140 }
          ],
          unlimitedMembership: { monthlyPrice: 450, avgVisits: 20 },
          bookingsThisMonth: 156,
          revenueThisMonth: 5460,
          isMostPopular: true
        }
      ]
    },
    grooming: {
      total_revenue: 3375,
      total_bookings: 45,
      services: [
        {
          recordId: 'full-groom',
          name: 'Full Groom',
          description: 'Bath, haircut, nails, ears, and teeth brushing',
          category: 'Grooming',
          sizePricing: {
            small: 55,
            medium: 70,
            large: 85,
            xlarge: 100
          },
          breedSurcharges: [
            { breeds: ['Doodles', 'Poodles'], surcharge: 15 },
            { breeds: ['Double-coated'], surcharge: 10 }
          ],
          duration: '2-4 hours',
          bookingsThisMonth: 45,
          revenueThisMonth: 3375
        }
      ]
    },
    'add-ons': {
      total_revenue: 372,
      total_bookings: 124,
      services: [
        {
          recordId: 'daily-photos',
          name: 'Daily Photo Updates',
          description: 'Photos sent throughout the day',
          category: 'Add-ons',
          basePrice: 5,
          unit: 'per day',
          bundledWith: ['Suite Boarding'],
          bookingsThisMonth: 67,
          revenueThisMonth: 335
        },
        {
          recordId: 'medication-admin',
          name: 'Medication Administration',
          description: 'Professional medication dosing',
          category: 'Add-ons',
          basePrice: 3,
          unit: 'per dose',
          bookingsThisMonth: 124,
          revenueThisMonth: 372
        }
      ]
    }
  };

  // Initialize mock data
  useEffect(() => {
    if (!services[selectedCategory]) {
      setServices(prev => ({ ...prev, [selectedCategory]: mockServices[selectedCategory] || { services: [] } }));
    }
  }, [selectedCategory]);

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

  // Flatten and filter services
  const { filteredServices, categoryStats } = useMemo(() => {
    const currentData = services[selectedCategory];
    if (!currentData || !currentData.services) {
      return { filteredServices: [], categoryStats: {} };
    }

    let filtered = currentData.services;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.name.toLowerCase().includes(query) ||
          service.description.toLowerCase().includes(query)
      );
    }

    return {
      filteredServices: filtered,
      categoryStats: {
        totalRevenue: currentData.total_revenue || 0,
        totalBookings: currentData.total_bookings || 0,
        serviceCount: filtered.length
      }
    };
  }, [services, selectedCategory, searchQuery]);

  const currentData = services[selectedCategory];
  const hasServices = currentData && currentData.services && currentData.services.length > 0;

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
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
