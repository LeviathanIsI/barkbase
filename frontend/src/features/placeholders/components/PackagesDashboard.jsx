import { useState } from 'react';
import { Search, Filter, DollarSign, Package, CreditCard, TrendingUp, Calendar, AlertTriangle, BarChart3 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import PackageCard from './PackageCard';
import PackageDetailModal from './PackageDetailModal';

const PackagesDashboard = ({ onCreatePackage, onShowAnalytics }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [sortBy, setSortBy] = useState('best-selling');
  const [selectedPackage, setSelectedPackage] = useState(null);

  // Mock data
  const performanceMetrics = {
    packageRevenue: 18450,
    packageRevenuePeriod: 'This month',
    activePackages: 67,
    redeemedVisits: 234,
    redeemedPeriod: 'This month',
    revenueGrowth: 32,
    recurringRevenue: 8927,
    recurringPeriod: '/mo',
    expiringSoon: 12,
    expiringPeriod: 'Next 30 days',
    avgValue: 275,
    attachRate: 47,
    attachPeriod: 'Of bookings'
  };

  const mockPackages = [
    {
      id: '1',
      name: '10-Day Boarding Pass',
      type: 'Multi-Visit Package',
      status: 'active',
      price: 450,
      regularPrice: 650,
      savings: 200,
      performance: {
        soldLast30Days: 23,
        revenueLast30Days: 10350,
        totalActive: 67,
        visitsRedeemed: 124,
        rating: 4.9,
        reviews: 18,
        profitPerPackage: 287
      },
      flags: {
        bestSeller: true,
        featured: true,
        mostPopular: true
      },
      expiringSoon: 8
    },
    {
      id: '2',
      name: '5-Visit Daycare Card',
      type: 'Punch Card',
      status: 'active',
      price: 175,
      regularPrice: 200,
      savings: 25,
      performance: {
        soldLast30Days: 18,
        revenueLast30Days: 3150,
        totalActive: 34,
        visitsRedeemed: 67,
        rating: 4.7,
        reviews: 12,
        profitPerPackage: 98
      },
      flags: {},
      expiringSoon: 3
    },
    {
      id: '3',
      name: 'Unlimited Daycare Membership',
      type: 'Monthly Membership',
      status: 'active',
      price: 399,
      regularPrice: null,
      recurring: true,
      performance: {
        activeMembers: 18,
        recurringRevenue: 7182,
        avgTenure: 8.3,
        visitsThisMonth: 142,
        rating: 4.8,
        reviews: 24
      },
      flags: {
        recurring: true
      },
      churnAlert: 2
    },
    {
      id: '4',
      name: 'VIP Club Membership',
      type: 'VIP Membership',
      status: 'active',
      price: 49,
      regularPrice: null,
      recurring: true,
      benefits: '10% off all services + perks',
      performance: {
        activeMembers: 47,
        recurringRevenue: 2303,
        avgMemberSpend: 287,
        totalMemberValue: 13489,
        rating: 4.9,
        reviews: 38
      },
      flags: {
        recurring: true
      },
      newMembers: 8
    }
  ];

  const filteredPackages = mockPackages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || pkg.type.toLowerCase().includes(typeFilter);
    const matchesStatus = statusFilter === 'all' || pkg.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">PACKAGE PERFORMANCE OVERVIEW</h3>
          <Select
            value="last30"
            onChange={() => {}}
            className="w-40"
          >
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="last90">Last 90 days</option>
            <option value="ytd">Year to date</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-surface-primary dark:to-surface-secondary rounded-lg border border-blue-200 dark:border-blue-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100 uppercase">Package Revenue</p>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">${performanceMetrics.packageRevenue.toLocaleString()}</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">{performanceMetrics.packageRevenuePeriod}</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-lg border border-green-200 dark:border-green-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-xs font-medium text-green-900 dark:text-green-100 uppercase">Active Packages</p>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{performanceMetrics.activePackages}</p>
            <p className="text-xs text-green-700 dark:text-green-300">Customers</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 dark:border-purple-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <p className="text-xs font-medium text-purple-900 dark:text-purple-100 uppercase">Redeemed Visits</p>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{performanceMetrics.redeemedVisits}</p>
            <p className="text-xs text-purple-700 dark:text-purple-300">{performanceMetrics.redeemedPeriod}</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <p className="text-xs font-medium text-orange-900 dark:text-orange-100 uppercase">Revenue Growth</p>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">+{performanceMetrics.revenueGrowth}%</p>
            <p className="text-xs text-orange-700 dark:text-orange-300">vs last mo</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <p className="text-xs font-medium text-indigo-900 dark:text-indigo-100 uppercase">Recurring Revenue</p>
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">${performanceMetrics.recurringRevenue.toLocaleString()}{performanceMetrics.recurringPeriod}</p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">Memberships</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 uppercase">Expiring Soon</p>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{performanceMetrics.expiringSoon}</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">{performanceMetrics.expiringPeriod}</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/20 dark:to-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <p className="text-xs font-medium text-pink-900 dark:text-pink-100 uppercase">Avg Value</p>
            </div>
            <p className="text-2xl font-bold text-pink-900 dark:text-pink-100">${performanceMetrics.avgValue}</p>
            <p className="text-xs text-pink-700 dark:text-pink-300">Per package</p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/20 dark:to-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-900/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <p className="text-xs font-medium text-teal-900 dark:text-teal-100 uppercase">Attach Rate</p>
            </div>
            <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{performanceMetrics.attachRate}%</p>
            <p className="text-xs text-teal-700 dark:text-teal-300">{performanceMetrics.attachPeriod}</p>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 INSIGHT:</strong> Package revenue up 32% this month! Top performer: "10-Day Boarding Pass" 
            with 23 sales ($10,350 revenue)
          </p>
        </div>
      </Card>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-tertiary" />
              <Input
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-40"
            >
              <option value="all">All Types</option>
              <option value="multi-visit">Multi-Visit</option>
              <option value="punch">Punch Card</option>
              <option value="membership">Membership</option>
              <option value="vip">VIP</option>
              <option value="gift">Gift Certificate</option>
            </Select>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-32"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </Select>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-40"
            >
              <option value="best-selling">Best Selling</option>
              <option value="highest-revenue">Highest Revenue</option>
              <option value="newest">Newest First</option>
              <option value="name">Name A-Z</option>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Reset Filters
            </Button>
          </div>
        </div>

        <div className="mt-2 text-sm text-gray-600 dark:text-text-secondary">
          Showing {filteredPackages.length} of {mockPackages.length} packages
        </div>
      </Card>

      {/* Packages List */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-text-primary mb-4">YOUR PACKAGES</h3>
        <div className="space-y-4">
          {filteredPackages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              package={pkg}
              onViewDetails={() => setSelectedPackage(pkg)}
            />
          ))}
        </div>
      </div>

      {/* Package Detail Modal */}
      {selectedPackage && (
        <PackageDetailModal
          package={selectedPackage}
          isOpen={!!selectedPackage}
          onClose={() => setSelectedPackage(null)}
        />
      )}
    </div>
  );
};

export default PackagesDashboard;

