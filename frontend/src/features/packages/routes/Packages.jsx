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
  Sparkles,
  Gift,
  Star,
  Check,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePackagesQuery } from '../api';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { differenceInDays, format } from 'date-fns';

// Stat Card Component with gradient icons and visual hierarchy
const StatCard = ({ icon: Icon, label, value, subtext, variant = 'primary', trend, trendUp = true }) => {
  const variantStyles = {
    primary: {
      container: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-950/20 border-blue-200/60 dark:border-blue-800/40',
      iconContainer: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25',
      icon: 'text-white',
      value: 'text-blue-900 dark:text-blue-100',
    },
    success: {
      container: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40',
      iconContainer: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25',
      icon: 'text-white',
      value: 'text-emerald-900 dark:text-emerald-100',
    },
    warning: {
      container: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-950/20 border-amber-200/60 dark:border-amber-800/40',
      iconContainer: 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25',
      icon: 'text-white',
      value: 'text-amber-900 dark:text-amber-100',
    },
    purple: {
      container: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-950/20 border-purple-200/60 dark:border-purple-800/40',
      iconContainer: 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25',
      icon: 'text-white',
      value: 'text-purple-900 dark:text-purple-100',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div className={cn(
      'relative flex items-center gap-4 rounded-xl border p-4 overflow-hidden transition-all duration-200 hover:shadow-md',
      styles.container
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent dark:from-white/5 pointer-events-none" />

      <div className={cn(
        'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
        styles.iconContainer
      )}>
        <Icon className={cn('h-6 w-6', styles.icon)} />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--bb-color-text-muted)] mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className={cn('text-2xl font-bold leading-tight', styles.value)}>{value}</p>
          {trend && (
            <span className={cn(
              'text-xs font-medium',
              trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              {trendUp ? '+' : ''}{trend}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-[var(--bb-color-text-muted)] mt-0.5">{subtext}</p>}
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
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--bb-color-border-subtle)] bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Package Performance</h3>
        </div>

        <div className="p-4">
          {packagePerformance.length > 0 ? (
            <div className="space-y-2">
              {packagePerformance.map((pkg, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] hover:border-purple-200 dark:hover:border-purple-800 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--bb-color-text-primary)] truncate">{pkg.name}</p>
                    <p className="text-xs text-[var(--bb-color-text-muted)]">{formatCurrency(pkg.revenue)} revenue</p>
                  </div>
                  <Badge variant="primary" size="sm">{pkg.sold} sold</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-sm font-medium text-[var(--bb-color-text-secondary)] mb-1">No sales yet</p>
              <p className="text-xs text-[var(--bb-color-text-muted)]">Sell packages to see performance</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Holders Card */}
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--bb-color-border-subtle)] bg-gradient-to-r from-emerald-50 to-transparent dark:from-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Users className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Active Holders</h3>
          </div>
          {activeHolders.length > 0 && (
            <Badge variant="success" size="sm">{activeHolders.length}</Badge>
          )}
        </div>

        <div className="p-4">
          {activeHolders.length > 0 ? (
            <div className="space-y-2">
              {activeHolders.map((holder) => (
                <button
                  key={holder.id}
                  onClick={() => holder.ownerId && navigate(`/customers/${holder.ownerId}`)}
                  className="w-full flex items-center gap-3 p-3 bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors text-left group"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-900 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--bb-color-text-primary)] truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{holder.ownerName}</p>
                    <p className="text-xs text-[var(--bb-color-text-muted)]">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{holder.creditsRemaining}</span> of {holder.creditsPurchased} credits
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--bb-color-text-muted)] flex-shrink-0 group-hover:text-emerald-500 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                <User className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-[var(--bb-color-text-secondary)] mb-1">No holders yet</p>
              <p className="text-xs text-[var(--bb-color-text-muted)]">Customers with active packages appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white dark:bg-surface-primary border border-[var(--bb-color-border-subtle)] rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--bb-color-border-subtle)] bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-900/20">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Quick Actions</h3>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={onNewPackage}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] hover:border-[var(--bb-color-accent)] hover:bg-[var(--bb-color-accent-soft)] transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-[var(--bb-color-accent-soft)] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="h-4 w-4 text-[var(--bb-color-accent)]" />
              </div>
              <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">New Package</span>
            </button>

            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">View All Purchases</span>
            </button>

            <button
              onClick={onViewExpiring}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                expiringSoon > 0
                  ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                  : "border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
                expiringSoon > 0
                  ? "bg-amber-200 dark:bg-amber-800"
                  : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  expiringSoon > 0 ? "text-amber-700 dark:text-amber-300" : "text-amber-600 dark:text-amber-400"
                )} />
              </div>
              <span className="text-sm font-medium text-[var(--bb-color-text-primary)] flex-1 text-left">Expiring Soon</span>
              {expiringSoon > 0 && (
                <Badge variant="warning" size="sm">{expiringSoon}</Badge>
              )}
            </button>
          </div>
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
          <h1 className="text-[var(--bb-heading-page-size)] font-[var(--bb-heading-page-weight)] leading-[var(--bb-heading-page-leading)] tracking-[var(--bb-heading-page-tracking)] text-[color:var(--bb-color-text-primary)]">Prepaid Packages</h1>
          <p className="text-[var(--bb-body-size)] leading-[var(--bb-body-leading)] text-[color:var(--bb-color-text-muted)] mt-1">Manage package templates and customer purchases</p>
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
              {filteredPackages.map((pkg) => {
                const hasCredits = pkg.creditsRemaining !== undefined && pkg.creditsPurchased !== undefined;
                const creditPercent = hasCredits ? (pkg.creditsRemaining / pkg.creditsPurchased) * 100 : 0;

                return (
                  <div
                    key={pkg.recordId || pkg.id}
                    className={cn(
                      'group relative bg-white dark:bg-surface-primary rounded-xl border overflow-hidden cursor-pointer transition-all duration-200',
                      isExpiringSoon(pkg)
                        ? 'border-amber-300 dark:border-amber-700 ring-2 ring-amber-200 dark:ring-amber-800/50'
                        : 'border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-accent)]',
                      'hover:shadow-lg hover:-translate-y-0.5'
                    )}
                    onClick={() => {
                      if (pkg.owner?.recordId) {
                        navigate(`/customers/${pkg.owner.recordId}`);
                      }
                    }}
                  >
                    {/* Status indicator bar */}
                    <div className={cn(
                      'absolute left-0 top-0 bottom-0 w-1',
                      pkg.status === 'expired' ? 'bg-red-500' :
                      pkg.status === 'depleted' || pkg.creditsRemaining === 0 ? 'bg-gray-400' :
                      hasCredits && creditPercent < 20 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    )} />

                    <div className="p-4 pl-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Package icon */}
                          <div className={cn(
                            'h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0',
                            pkg.status === 'expired' ? 'bg-gradient-to-br from-red-400 to-red-500' :
                            pkg.status === 'depleted' || pkg.creditsRemaining === 0 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                            hasCredits && creditPercent < 20 ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
                            'bg-gradient-to-br from-emerald-500 to-emerald-600'
                          )}>
                            <Gift className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-[var(--bb-color-text-primary)] truncate group-hover:text-[var(--bb-color-accent)] transition-colors">{pkg.name}</h3>
                            {pkg.owner ? (
                              <p className="text-sm text-[var(--bb-color-text-muted)] truncate">
                                {pkg.owner.firstName} {pkg.owner.lastName}
                              </p>
                            ) : pkg.description ? (
                              <p className="text-sm text-[var(--bb-color-text-muted)] truncate">{pkg.description}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isExpiringSoon(pkg) && (
                            <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            </div>
                          )}
                          {pkg.owner ? getStatusBadge(pkg) : (
                            <Badge variant={pkg.isActive ? 'success' : 'neutral'}>
                              {pkg.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Credits progress */}
                      {hasCredits && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-[var(--bb-color-text-muted)]">Credits Remaining</span>
                            <span className="text-sm font-bold text-[var(--bb-color-text-primary)]">
                              {pkg.creditsRemaining} <span className="text-[var(--bb-color-text-muted)] font-normal">/ {pkg.creditsPurchased}</span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={cn(
                                'h-2 rounded-full transition-all duration-500',
                                creditPercent > 50 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                creditPercent > 20 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                                'bg-gradient-to-r from-red-400 to-red-500'
                              )}
                              style={{ width: `${creditPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Services list for template packages */}
                      {!hasCredits && pkg.services && pkg.services.length > 0 && (
                        <div className="mb-3 p-2 bg-[var(--bb-color-bg-surface)] rounded-lg">
                          <span className="text-xs font-medium text-[var(--bb-color-text-muted)] uppercase tracking-wide">Included</span>
                          <ul className="mt-1 space-y-0.5">
                            {pkg.services.slice(0, 3).map((svc, idx) => (
                              <li key={idx} className="text-sm flex items-center gap-2 text-[var(--bb-color-text-secondary)]">
                                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                <span className="truncate">{svc.serviceName || svc.name}</span>
                                {svc.quantity > 1 && <span className="text-[var(--bb-color-text-muted)] text-xs">x{svc.quantity}</span>}
                              </li>
                            ))}
                            {pkg.services.length > 3 && (
                              <li className="text-xs text-[var(--bb-color-text-muted)] pl-5">+{pkg.services.length - 3} more</li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Price and details row */}
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-[var(--bb-color-border-subtle)]">
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold text-[var(--bb-color-text-primary)]">
                            {formatCurrency(pkg.priceCents || pkg.priceInCents || 0)}
                          </span>
                          {pkg.discountPercent > 0 && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded">
                              Save {pkg.discountPercent}%
                            </span>
                          )}
                        </div>

                        {pkg.expiresAt && (
                          <div className={cn(
                            'flex items-center gap-1 text-xs',
                            new Date(pkg.expiresAt) < new Date() ? 'text-red-600 dark:text-red-400' :
                            isExpiringSoon(pkg) ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--bb-color-text-muted)]'
                          )}>
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(pkg.expiresAt), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      {/* Usage stats */}
                      {pkg._count?.usages !== undefined && (
                        <div className="mt-2 text-xs text-[var(--bb-color-text-muted)]">
                          Used {pkg._count?.usages || 0} time{pkg._count?.usages === 1 ? '' : 's'}
                        </div>
                      )}

                      {/* View owner button */}
                      {pkg.owner && (
                        <Button
                          variant="outline"
                          className="w-full mt-3"
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Enhanced Empty State */
            <div className="bg-white dark:bg-surface-primary rounded-xl border border-[var(--bb-color-border-subtle)] overflow-hidden">
              <div className="text-center py-12 px-6">
                {/* Animated icon */}
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 animate-ping">
                    <div className="h-16 w-16 rounded-full bg-purple-200/50 dark:bg-purple-800/30" />
                  </div>
                  <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mx-auto">
                    <Gift className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[var(--bb-color-text-primary)] mb-2">
                  {showExpiring ? 'No Expiring Packages' : 'Boost Revenue with Prepaid Packages'}
                </h3>
                <p className="text-sm text-[var(--bb-color-text-muted)] mb-6 max-w-md mx-auto">
                  {showExpiring
                    ? 'No packages are expiring within the next 30 days'
                    : 'Prepaid packages increase customer loyalty and provide predictable revenue. Offer savings for bulk purchases.'}
                </p>

                {showExpiring ? (
                  <Button variant="outline" onClick={() => setShowExpiring(false)}>
                    View All Packages
                  </Button>
                ) : (
                  <>
                    {/* Example package templates */}
                    <div className="grid gap-3 sm:grid-cols-2 max-w-xl mx-auto mb-6">
                      <div className="p-4 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 text-left group hover:border-purple-400 dark:hover:border-purple-600 transition-colors cursor-pointer" onClick={() => setPurchaseModalOpen(true)}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--bb-color-text-primary)]">5-Day Boarding Pass</p>
                            <p className="text-xs text-[var(--bb-color-text-muted)]">Popular choice</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">$225</span>
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded">Save 10%</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 text-left group hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer" onClick={() => setPurchaseModalOpen(true)}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Star className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--bb-color-text-primary)]">Monthly Daycare Bundle</p>
                            <p className="text-xs text-[var(--bb-color-text-muted)]">Best value</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">$400</span>
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold rounded">Save 20%</span>
                        </div>
                      </div>
                    </div>

                    <Button onClick={() => setPurchaseModalOpen(true)} size="lg" className="shadow-lg shadow-[var(--bb-color-accent)]/20">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Package
                    </Button>
                  </>
                )}
              </div>
            </div>
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
