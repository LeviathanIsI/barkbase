import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, BarChart3, Download, Upload, Settings, Eye, EyeOff, ExternalLink, MessageSquare, Star } from 'lucide-react';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import IntegrationCard from './components/IntegrationCard';
import IntegrationSetupModal from './components/IntegrationSetupModal';
import IntegrationManagementModal from './components/IntegrationManagementModal';
import DeveloperAPISection from './components/DeveloperAPISection';
import IntegrationAnalytics from './components/IntegrationAnalytics';
import IntegrationRecipes from './components/IntegrationRecipes';
import RequestIntegrationModal from './components/RequestIntegrationModal';

const INTEGRATIONS = [
  // Accounting & Finance
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'accounting',
    description: 'Automatically sync invoices, payments, and expenses',
    icon: '💰',
    status: 'available',
    popular: true,
    highlyRecommended: false,
    features: [
      '✓ Invoices (as they\'re created)',
      '✓ Payments (real-time sync)',
      '✓ Refunds and credits',
      '✓ Customer profiles',
      '✓ Product/service catalog',
      '✓ Sales tax rates'
    ],
    competitiveAdvantage: 'Bidirectional sync (not just one-way), No transaction double-posting bugs, Maps to correct accounts automatically',
    testimonial: '"Finally! QuickBooks integration that actually works. No more manual reconciliation." - Sarah M.',
    userCount: 1247,
    rating: 4.9,
    setupSteps: ['authorize', 'map-accounts', 'sync-settings', 'initial-sync']
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'accounting',
    description: 'Cloud accounting for small businesses',
    icon: '📊',
    status: 'available',
    features: [
      '✓ Invoices',
      '✓ Payments',
      '✓ Customers',
      '✓ Products'
    ],
    userCount: 423,
    rating: 4.8
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'accounting',
    description: 'Accept credit cards, ACH, and digital wallets',
    icon: '💳',
    status: 'connected',
    connectedDate: 'Jan 15, 2025',
    monthlyVolume: '$12,450',
    monthlyTransactions: 287
  },
  {
    id: 'square',
    name: 'Square',
    category: 'accounting',
    description: 'Payment processing and POS hardware',
    icon: '📱',
    status: 'available',
    userCount: 892,
    rating: 4.7
  },

  // Marketing & Communication
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'marketing',
    description: 'Email marketing and automation',
    icon: '📧',
    status: 'available',
    features: [
      '✓ Customer email lists (auto-updated)',
      '✓ Booking confirmations trigger campaigns',
      '✓ Birthday wishes and re-engagement emails',
      '✓ Customer segments (VIP, inactive, new)'
    ],
    userCount: 634,
    rating: 4.6
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'marketing',
    description: 'SMS/text messaging for reminders and updates',
    icon: '📱',
    status: 'available',
    pricing: '~1¢ per message',
    features: [
      'Send booking confirmations',
      'Reminders and alerts',
      'Two-way customer communication'
    ],
    userCount: 1089,
    rating: 4.8
  },
  {
    id: 'constant-contact',
    name: 'Constant Contact',
    category: 'marketing',
    description: 'Email marketing for small businesses',
    icon: '📧',
    status: 'available',
    userCount: 287,
    rating: 4.5
  },

  // Veterinary & Health
  {
    id: 'vetverify',
    name: 'VetVerify',
    category: 'veterinary',
    description: 'Automatically verify vaccination records from vets',
    icon: '🏥',
    status: 'available',
    highlyRecommended: true,
    timeSavings: '15+ hours per month',
    features: [
      '✓ Pull vaccination records directly from vet clinics',
      '✓ Automatic expiration alerts (60 days before)',
      '✓ Digital verification (no more calling vets)',
      '✓ Compliance dashboard'
    ],
    testimonial: '"This integration alone saves us countless hours every month." - Mike T., Downtown Dog Daycare',
    userCount: 456,
    rating: 4.9
  },
  {
    id: 'petdesk',
    name: 'PetDesk',
    category: 'veterinary',
    description: 'Client communication platform for vet clinics',
    icon: '📋',
    status: 'available',
    userCount: 234,
    rating: 4.7
  },

  // Calendar & Scheduling
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    description: 'Sync bookings to your personal Google Calendar',
    icon: '📅',
    status: 'available',
    features: [
      'See upcoming check-ins, check-outs',
      'Grooming appointments',
      'Personal calendar integration'
    ],
    userCount: 2134,
    rating: 4.8
  },
  {
    id: 'apple-calendar',
    name: 'Apple Calendar',
    category: 'calendar',
    description: 'Sync bookings to iCloud Calendar',
    icon: '📅',
    status: 'available',
    userCount: 1456,
    rating: 4.7
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    category: 'calendar',
    description: 'Sync bookings to Outlook/Office 365 calendar',
    icon: '📅',
    status: 'available',
    userCount: 823,
    rating: 4.6
  },

  // Cameras & Monitoring
  {
    id: 'furbo',
    name: 'Furbo Dog Camera',
    category: 'cameras',
    description: 'Share live camera feeds with pet parents',
    icon: '📹',
    status: 'available',
    userCount: 145,
    rating: 4.8
  },
  {
    id: 'nest-cameras',
    name: 'Nest/Google Cameras',
    category: 'cameras',
    description: 'Integrate facility security cameras',
    icon: '📹',
    status: 'available',
    userCount: 267,
    rating: 4.6
  },

  // Automation & Workflows
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'automation',
    description: 'Connect to 5,000+ apps without coding',
    icon: '🔧',
    status: 'available',
    popular: true,
    features: [
      '• New booking → Slack notification',
      '• Payment received → Add to Google Sheets',
      '• Vaccination expiring → Send SMS reminder',
      '• New customer → Add to Facebook Custom Audience',
      '• Daily summary → Email to owner'
    ],
    userCount: 892,
    rating: 4.9
  },
  {
    id: 'make',
    name: 'Make (formerly Integromat)',
    category: 'automation',
    description: 'Advanced automation platform for complex workflows',
    icon: '🔧',
    status: 'available',
    userCount: 234,
    rating: 4.8
  },

  // Team Communication
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Get instant notifications in your team\'s Slack workspace',
    icon: '💬',
    status: 'available',
    notifications: [
      '✓ New bookings',
      '✓ Cancellations',
      '✓ Payment failures',
      '✓ Customer messages',
      '✓ Vaccination expirations'
    ],
    userCount: 623,
    rating: 4.7
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'communication',
    description: 'Notifications and updates in Microsoft Teams',
    icon: '💬',
    status: 'available',
    userCount: 387,
    rating: 4.6
  },

  // Analytics & Reporting
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'analytics',
    description: 'Auto-export bookings, customers, and revenue data',
    icon: '📊',
    status: 'available',
    userCount: 1234,
    rating: 4.7
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'analytics',
    description: 'Track booking funnel and website performance',
    icon: '📊',
    status: 'available',
    userCount: 456,
    rating: 4.5
  },

  // Website & Booking
  {
    id: 'wordpress',
    name: 'WordPress',
    category: 'website',
    description: 'Add booking widget to your WordPress site',
    icon: '🌐',
    status: 'available',
    userCount: 1567,
    rating: 4.8
  },
  {
    id: 'squarespace',
    name: 'Squarespace',
    category: 'website',
    description: 'Embed booking directly on Squarespace sites',
    icon: '🌐',
    status: 'available',
    userCount: 423,
    rating: 4.6
  },
  {
    id: 'wix',
    name: 'Wix',
    category: 'website',
    description: 'Add booking widget to Wix websites',
    icon: '🌐',
    status: 'available',
    userCount: 345,
    rating: 4.5
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Categories', count: INTEGRATIONS.length },
  { id: 'accounting', label: 'Accounting & Finance', count: INTEGRATIONS.filter(i => i.category === 'accounting').length },
  { id: 'marketing', label: 'Marketing & Communication', count: INTEGRATIONS.filter(i => i.category === 'marketing').length },
  { id: 'veterinary', label: 'Veterinary & Health', count: INTEGRATIONS.filter(i => i.category === 'veterinary').length },
  { id: 'calendar', label: 'Calendar & Scheduling', count: INTEGRATIONS.filter(i => i.category === 'calendar').length },
  { id: 'cameras', label: 'Cameras & Monitoring', count: INTEGRATIONS.filter(i => i.category === 'cameras').length },
  { id: 'automation', label: 'Automation & Workflows', count: INTEGRATIONS.filter(i => i.category === 'automation').length },
  { id: 'communication', label: 'Team Communication', count: INTEGRATIONS.filter(i => i.category === 'communication').length },
  { id: 'analytics', label: 'Analytics & Reporting', count: INTEGRATIONS.filter(i => i.category === 'analytics').length },
  { id: 'website', label: 'Website & Booking', count: INTEGRATIONS.filter(i => i.category === 'website').length }
];

const IntegrationsOverview = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionFilter, setConnectionFilter] = useState('all');
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  // Set document title
  useEffect(() => {
    document.title = 'Integrations | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleConnect = (integration) => {
    setSelectedIntegration(integration);
    setIsSetupModalOpen(true);
  };

  const handleManage = (integration) => {
    setSelectedIntegration(integration);
    setIsManagementModalOpen(true);
  };

  const handleRequestIntegration = () => {
    setIsRequestModalOpen(true);
  };

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    let filtered = INTEGRATIONS;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(integration => integration.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(integration =>
        integration.name.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query)
      );
    }

    // Connection status filter
    if (connectionFilter === 'connected') {
      filtered = filtered.filter(integration => integration.status === 'connected');
    } else if (connectionFilter === 'available') {
      filtered = filtered.filter(integration => integration.status === 'available');
    }

    return filtered;
  }, [selectedCategory, searchQuery, connectionFilter]);

  // Group integrations by category for display
  const groupedIntegrations = useMemo(() => {
    const groups = {};

    filteredIntegrations.forEach(integration => {
      if (!groups[integration.category]) {
        groups[integration.category] = [];
      }
      groups[integration.category].push(integration);
    });

    return groups;
  }, [filteredIntegrations]);

  const getCategoryTitle = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category ? category.label : categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
  };

  const connectedCount = INTEGRATIONS.filter(i => i.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-text-primary">Integrations</h1>
          <p className="mt-1 text-gray-600 dark:text-text-secondary">
            Connect third-party apps and services to automate workflows and eliminate manual data entry
          </p>
        </div>
      </div>

      {/* Integration Analytics */}
      <IntegrationAnalytics />

      {/* Filters and Search */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Available Integrations</h2>
          <span className="text-sm text-gray-600 dark:text-text-secondary">{filteredIntegrations.length} integrations</span>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200'
                    : 'bg-gray-100 dark:bg-surface-secondary text-gray-700 dark:text-text-primary hover:bg-gray-200 dark:hover:bg-surface-border'
                }`}
              >
                {category.label} ({category.count})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          {/* Connection Status Filter */}
          <div className="min-w-[180px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'connected', label: `Connected (${connectedCount})` },
                { value: 'available', label: 'Available' },
              ]}
              value={connectionFilter}
              onChange={(opt) => setConnectionFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Integration Groups */}
      <div className="space-y-8">
        {Object.entries(groupedIntegrations).map(([categoryId, integrations]) => (
          <div key={categoryId}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-4 flex items-center gap-2">
              {getCategoryIcon(categoryId)} {getCategoryTitle(categoryId)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={() => handleConnect(integration)}
                  onManage={() => handleManage(integration)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Request Integration Section */}
      <div className="bg-primary-50 dark:bg-surface-primary border border-purple-200 dark:border-purple-900/30 rounded-lg p-6">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Don't See What You Need?
          </h3>
          <p className="text-purple-700 dark:text-purple-300 mb-4">
            We're constantly adding new integrations based on customer feedback. Let us know what you'd like to connect.
          </p>

          <Button onClick={handleRequestIntegration} className="mr-4">
            Request New Integration
          </Button>

          <div className="mt-4 text-sm text-purple-700 dark:text-purple-300">
            <p className="mb-2">Most requested integrations:</p>
            <div className="flex justify-center gap-4 text-xs">
              <span>1. PetDesk (23 votes) - In progress ✓</span>
              <span>2. enterprise (18 votes)</span>
              <span>3. Salesforce (12 votes)</span>
            </div>
            <p className="mt-2">
              <a href="#" className="text-purple-600 dark:text-purple-400 hover:underline">View All Requests & Vote</a>
            </p>
          </div>
        </div>
      </div>

      {/* Developer API Section */}
      <DeveloperAPISection />

      {/* Integration Recipes */}
      <IntegrationRecipes />

      {/* Modals */}
      <IntegrationSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        integration={selectedIntegration}
      />

      <IntegrationManagementModal
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        integration={selectedIntegration}
      />

      <RequestIntegrationModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
};

const getCategoryIcon = (categoryId) => {
  const icons = {
    accounting: '💰',
    marketing: '📧',
    veterinary: '🏥',
    calendar: '📅',
    cameras: '📹',
    automation: '🔧',
    communication: '💬',
    analytics: '📊',
    website: '🌐'
  };
  return icons[categoryId] || '🔗';
};

export default IntegrationsOverview;
