import { Package, Star, TrendingUp, AlertTriangle, MoreVertical, Eye, Edit, Copy, Pause, Archive, Mail, BarChart3, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

const PackageCard = ({ package: pkg, onViewDetails }) => {
  const renderPerformanceSection = () => {
    if (pkg.recurring) {
      return (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Active Members</p>
              <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{pkg.performance.activeMembers}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Monthly Revenue</p>
              <p className="text-lg font-bold text-gray-900 dark:text-text-primary">${pkg.performance.recurringRevenue.toLocaleString()}/mo</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Avg Tenure</p>
              <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{pkg.performance.avgTenure} mo</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Rating</p>
              <p className="text-lg font-bold text-gray-900 dark:text-text-primary flex items-center gap-1">
                {pkg.performance.rating}
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </p>
            </div>
          </div>

          {pkg.type === 'VIP Membership' && (
            <div className="mb-3">
              <p className="text-xs text-gray-600 dark:text-text-secondary uppercase mb-1">Member Value</p>
              <p className="text-sm text-gray-700 dark:text-text-primary">
                Members spend avg <strong>${pkg.performance.avgMemberSpend}/month</strong> on services
              </p>
              <p className="text-sm text-gray-700 dark:text-text-primary">
                Total member value: <strong className="text-green-700">${pkg.performance.totalMemberValue.toLocaleString()}/month 🔥</strong>
              </p>
            </div>
          )}

          {pkg.churnAlert && (
            <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">CHURN ALERT: {pkg.churnAlert} cancellations this month</p>
                  <Button variant="link" className="text-xs p-0 h-auto text-yellow-700 hover:text-yellow-900">
                    View Churn Analysis
                  </Button>
                </div>
              </div>
            </div>
          )}

          {pkg.newMembers && (
            <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-3 mb-3">
              <p className="text-sm font-medium text-green-900">
                NEW MEMBERS: {pkg.newMembers} joined this month! (+20%)
              </p>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
          <div>
            <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Sold (30d)</p>
            <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{pkg.performance.soldLast30Days} 🔥</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Revenue (30d)</p>
            <p className="text-lg font-bold text-gray-900 dark:text-text-primary">${pkg.performance.revenueLast30Days.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Total Active</p>
            <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{pkg.performance.totalActive}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Redeemed</p>
            <p className="text-lg font-bold text-gray-900 dark:text-text-primary">{pkg.performance.visitsRedeemed}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-text-secondary uppercase">Rating</p>
            <p className="text-lg font-bold text-gray-900 dark:text-text-primary flex items-center gap-1">
              {pkg.performance.rating}
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </p>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-text-primary">
            {pkg.performance.reviews} reviews • Profit: <strong className="text-green-700">${pkg.performance.profitPerPackage}</strong> per package
          </p>
        </div>

        {pkg.expiringSoon > 0 && (
          <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  EXPIRING SOON: {pkg.expiringSoon} packages expire in next 30 days
                </p>
                <Button variant="link" className="text-xs p-0 h-auto text-yellow-700 hover:text-yellow-900">
                  Send Reminder Emails
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-xl font-bold text-gray-900 dark:text-text-primary">{pkg.name}</h4>
              {pkg.flags.bestSeller && (
                <Badge variant="success" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  BEST SELLER
                </Badge>
              )}
              {pkg.flags.mostPopular && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  MOST POPULAR
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">{pkg.type} • {pkg.status === 'active' ? '✅ Active' : '⏸️ Paused'}</p>
          </div>
        </div>

        <div className="relative group">
          <Button variant="ghost" size="sm" className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary">
            <MoreVertical className="w-5 h-5" />
          </Button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-48 bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg shadow-lg z-10">
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View Details
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary flex items-center gap-2">
              <Users className="w-4 h-4" />
              View Customers
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Duplicate
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-text-primary hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Pause Sales
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:bg-surface-primary flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Archive
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-text-primary">
            ${pkg.price}{pkg.recurring && <span className="text-base font-normal text-gray-600 dark:text-text-secondary">/month</span>}
          </span>
          {pkg.regularPrice && (
            <>
              <span className="text-lg text-gray-400 dark:text-text-tertiary line-through">${pkg.regularPrice}</span>
              <span className="text-sm font-semibold text-green-700">Save ${pkg.savings}</span>
            </>
          )}
        </div>
        {pkg.benefits && (
          <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">{pkg.benefits}</p>
        )}
      </div>

      {/* Performance */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-2 uppercase">Performance (Last 30 Days):</p>
        {renderPerformanceSection()}
      </div>

      {/* Status */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-2 uppercase">Status:</p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <span className="text-gray-700 dark:text-text-primary">Available for purchase</span>
          </div>
          {pkg.flags.featured && (
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-gray-700 dark:text-text-primary">Featured on customer portal</span>
            </div>
          )}
          {pkg.flags.mostPopular && (
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span className="text-gray-700 dark:text-text-primary">"Most Popular" badge enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-surface-border">
        <Button variant="primary" size="sm" onClick={onViewDetails}>
          <Eye className="w-4 h-4 mr-1" />
          View Details
        </Button>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-1" />
          View Customers
        </Button>
        <Button variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 mr-1" />
          Analytics
        </Button>
      </div>
    </Card>
  );
};

export default PackageCard;

