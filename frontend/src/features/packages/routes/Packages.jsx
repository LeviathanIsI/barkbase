import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  ShoppingBag,
  BarChart3,
  User,
  Clock,
  Zap,
  AlertTriangle,
  ChevronRight,
  Eye,
  Edit,
  History,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePackagesQuery } from '../api';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { differenceInDays, format } from 'date-fns';

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, subtext, variant = 'primary' }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      icon: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-4', styles.bg, styles.border)}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="text-2xl font-bold text-text leading-tight">{value}</p>
        {subtext && <p className="text-xs text-muted">{subtext}</p>}
      </div>
    </div>
  );
};

// Sidebar Component
const PackagesSidebar = ({ packages, onNewPackage, onViewExpiring, navigate }) => {
  // Calculate package performance (which packages have been sold most)
  const packagePerformance = useMemo(() => {
    // Group by package name/type and count
    const performance = {};
    packages.forEach(pkg => {
      // Package templates vs purchased packages - look at purchased ones with owners
      if (pkg.owner) {
        const name = pkg.name || 'Unknown Package';
        if (!performance[name]) {
          performance[name] = { name, sold: 0, revenue: 0 };
        }
        performance[name].sold += 1;
        performance[name].revenue += (pkg.priceCents || pkg.priceInCents || 0);
      }
    });

    return Object.values(performance)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [packages]);

  // Active holders - customers with remaining credits
  const activeHolders = useMemo(() => {
    return packages
      .filter(pkg => pkg.owner && pkg.creditsRemaining > 0 && pkg.status !== 'expired')
      .map(pkg => ({
        id: pkg.recordId || pkg.id,
        ownerId: pkg.owner?.recordId || pkg.owner?.id,
        ownerName: pkg.owner ? `${pkg.owner.firstName} ${pkg.owner.lastName}` : 'Unknown',
        packageName: pkg.name,
        creditsRemaining: pkg.creditsRemaining,
        creditsPurchased: pkg.creditsPurchased,
        expiresAt: pkg.expiresAt,
      }))
      .slice(0, 5);
  }, [packages]);

  // Expiring soon (within 30 days)
  const expiringSoon = useMemo(() => {
    const now = new Date();
    return packages.filter(pkg => {
      if (!pkg.expiresAt || pkg.status === 'expired') return false;
      const daysUntil = differenceInDays(new Date(pkg.expiresAt), now);
      return daysUntil >= 0 && daysUntil <= 30;
    }).length;
  }, [packages]);

  return (
    <div className="space-y-4">
      {/* Package Performance Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Package Performance</h3>
        </div>

        {packagePerformance.length > 0 ? (
          <div className="space-y-2">
            {packagePerformance.map((pkg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-surface rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{pkg.name}</p>
                  <p className="text-xs text-muted">{formatCurrency(pkg.revenue)} revenue</p>
                </div>
                <Badge variant="primary" size="sm">{pkg.sold} sold</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <ShoppingBag className="h-6 w-6 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted">No package sales yet</p>
          </div>
        )}
      </div>

      {/* Active Holders Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-medium text-text">Active Holders</h3>
          </div>
          {activeHolders.length > 0 && (
            <Badge variant="success" size="sm">{activeHolders.length}</Badge>
          )}
        </div>

        {activeHolders.length > 0 ? (
          <div className="space-y-2">
            {activeHolders.map((holder) => (
              <button
                key={holder.id}
                onClick={() => holder.ownerId && navigate(`/customers/${holder.ownerId}`)}
                className="w-full flex items-start gap-2 p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors text-left"
              >
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text truncate">{holder.ownerName}</p>
                  <p className="text-xs text-muted">
                    {holder.creditsRemaining} of {holder.creditsPurchased} credits left
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted flex-shrink-0 mt-1" />
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <User className="h-6 w-6 text-muted mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted">No active package holders</p>
          </div>
        )}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Quick Actions</h3>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onNewPackage}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            New Package
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => navigate('/customers')}
          >
            <History className="h-3.5 w-3.5 mr-2" />
            View All Purchases
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-full justify-start',
              expiringSoon > 0 && 'text-amber-600 border-amber-300 hover:bg-amber-50'
            )}
            onClick={onViewExpiring}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-2" />
            Expiring Soon
            {expiringSoon > 0 && (
              <Badge variant="warning" size="sm" className="ml-auto">{expiringSoon}</Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Packages = () => {
  const navigate = useNavigate();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [showExpiring, setShowExpiring] = useState(false);

  const { data: packages = [], isLoading } = usePackagesQuery();

  // Calculate stats
  const stats = useMemo(() => {
    const total = packages.length;
    const active = packages.filter(pkg =>
      pkg.status !== 'expired' && pkg.status !== 'depleted' &&
      (pkg.creditsRemaining === undefined || pkg.creditsRemaining > 0)
    ).length;
    const totalSold = packages.filter(pkg => pkg.owner).length;
    const revenue = packages.reduce((sum, pkg) => {
      if (pkg.owner) {
        return sum + (pkg.priceCents || pkg.priceInCents || 0);
      }
      return sum;
    }, 0);

    return { total, active, totalSold, revenue };
  }, [packages]);

  // Filter packages based on showExpiring
  const filteredPackages = useMemo(() => {
    if (!showExpiring) return packages;

    const now = new Date();
    return packages.filter(pkg => {
      if (!pkg.expiresAt || pkg.status === 'expired') return false;
      const daysUntil = differenceInDays(new Date(pkg.expiresAt), now);
      return daysUntil >= 0 && daysUntil <= 30;
    });
  }, [packages, showExpiring]);

  const getStatusBadge = (pkg) => {
    if (pkg.status === 'expired') return <Badge variant="danger">Expired</Badge>;
    if (pkg.status === 'depleted') return <Badge variant="neutral">Depleted</Badge>;
    if (pkg.creditsRemaining === 0) return <Badge variant="neutral">Used</Badge>;
    if (pkg.creditsRemaining < pkg.creditsPurchased * 0.2) return <Badge variant="warning">Low</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  // Check if package is expiring soon
  const isExpiringSoon = (pkg) => {
    if (!pkg.expiresAt) return false;
    const daysUntil = differenceInDays(new Date(pkg.expiresAt), new Date());
    return daysUntil >= 0 && daysUntil <= 30;
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader
          breadcrumbs={[
            { label: 'Finance' },
            { label: 'Packages' }
          ]}
          title="Prepaid Packages"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><span>Finance</span></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Packages</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-text">Prepaid Packages</h1>
          <p className="text-xs text-muted mt-0.5">Manage package templates and customer purchases</p>
        </div>

        <Button onClick={() => setPurchaseModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Package
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Total Packages"
          value={stats.total}
          variant="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Active"
          value={stats.active}
          variant="success"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Sold"
          value={stats.totalSold}
          variant="purple"
        />
        <StatCard
          icon={DollarSign}
          label="Package Revenue"
          value={formatCurrency(stats.revenue)}
          variant="success"
        />
      </div>

      {/* Filter indicator */}
      {showExpiring && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            Showing packages expiring within 30 days
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-amber-600"
            onClick={() => setShowExpiring(false)}
          >
            Clear Filter
          </Button>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="flex gap-5">
        {/* Left Column: Package Cards (70%) */}
        <div className="flex-1 min-w-0">
          {filteredPackages?.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredPackages.map((pkg) => (
                <Card
                  key={pkg.recordId || pkg.id}
                  className={cn(
                    'hover:shadow-lg transition-shadow cursor-pointer',
                    isExpiringSoon(pkg) && 'ring-2 ring-amber-400'
                  )}
                  onClick={() => {
                    // Could open a slideout here for edit/view
                    if (pkg.owner?.recordId) {
                      navigate(`/customers/${pkg.owner.recordId}`);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-lg text-text truncate">{pkg.name}</h3>
                      {pkg.owner ? (
                        <p className="text-sm text-muted truncate">
                          {pkg.owner.firstName} {pkg.owner.lastName}
                        </p>
                      ) : pkg.description ? (
                        <p className="text-sm text-muted truncate">{pkg.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpiringSoon(pkg) && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" title="Expiring soon" />
                      )}
                      {pkg.owner ? getStatusBadge(pkg) : (
                        <Badge variant={pkg.isActive ? 'success' : 'neutral'}>
                          {pkg.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {pkg.creditsRemaining !== undefined && pkg.creditsPurchased !== undefined ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted">Credits Remaining</span>
                          <span className="font-semibold text-lg">
                            {pkg.creditsRemaining} / {pkg.creditsPurchased}
                          </span>
                        </div>

                        <div className="w-full bg-surface rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              pkg.creditsRemaining / pkg.creditsPurchased > 0.5
                                ? 'bg-primary'
                                : pkg.creditsRemaining / pkg.creditsPurchased > 0.2
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            )}
                            style={{
                              width: `${(pkg.creditsRemaining / pkg.creditsPurchased) * 100}%`
                            }}
                          />
                        </div>
                      </>
                    ) : pkg.services && pkg.services.length > 0 ? (
                      <div>
                        <span className="text-sm text-muted">Included Services:</span>
                        <ul className="mt-1 space-y-1">
                          {pkg.services.slice(0, 3).map((svc, idx) => (
                            <li key={idx} className="text-sm flex justify-between">
                              <span>{svc.serviceName || svc.name}</span>
                              {svc.quantity > 1 && <span className="text-muted">x{svc.quantity}</span>}
                            </li>
                          ))}
                          {pkg.services.length > 3 && (
                            <li className="text-xs text-muted">+{pkg.services.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    ) : null}

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        {pkg.owner ? 'Package Value' : 'Price'}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(pkg.priceCents || pkg.priceInCents || 0)}
                        {pkg.discountPercent > 0 && (
                          <span className="text-success ml-1">(-{pkg.discountPercent}%)</span>
                        )}
                      </span>
                    </div>

                    {pkg.expiresAt && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Expires
                        </span>
                        <span className={cn(
                          'font-medium',
                          new Date(pkg.expiresAt) < new Date() ? 'text-danger' :
                          isExpiringSoon(pkg) ? 'text-amber-600' : ''
                        )}>
                          {format(new Date(pkg.expiresAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {pkg._count?.usages !== undefined && (
                      <div className="text-xs text-muted pt-2 border-t border-border">
                        {pkg._count?.usages || 0} time{pkg._count?.usages === 1 ? '' : 's'} used
                      </div>
                    )}
                  </div>

                  {pkg.owner && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/customers/${pkg.owner.recordId}`);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2" />
                      View Owner
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {showExpiring ? 'No Expiring Packages' : 'No Packages Yet'}
                </h3>
                <p className="text-sm text-muted mb-4">
                  {showExpiring
                    ? 'No packages are expiring within the next 30 days'
                    : 'Create prepaid packages to offer discounts for multiple visits'}
                </p>
                {showExpiring ? (
                  <Button variant="outline" onClick={() => setShowExpiring(false)}>
                    View All Packages
                  </Button>
                ) : (
                  <Button onClick={() => setPurchaseModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Package
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Sidebar (30%) */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <PackagesSidebar
            packages={packages}
            onNewPackage={() => setPurchaseModalOpen(true)}
            onViewExpiring={() => setShowExpiring(true)}
            navigate={navigate}
          />
        </div>
      </div>

      <PackagePurchaseModal
        open={purchaseModalOpen}
        onClose={() => {
          setPurchaseModalOpen(false);
          setSelectedOwner(null);
        }}
        ownerId={selectedOwner?.recordId}
        ownerName={selectedOwner ? `${selectedOwner.firstName} ${selectedOwner.lastName}` : ''}
      />
    </div>
  );
};

export default Packages;
