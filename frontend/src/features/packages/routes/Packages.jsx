import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Calendar, DollarSign } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePackagesQuery } from '../api';
import PackagePurchaseModal from '../components/PackagePurchaseModal';
import { formatCurrency } from '@/lib/utils';

const Packages = () => {
  const navigate = useNavigate();
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const { data: packages, isLoading } = usePackagesQuery();

  const getStatusBadge = (pkg) => {
    if (pkg.status === 'expired') return <Badge variant="danger">Expired</Badge>;
    if (pkg.status === 'depleted') return <Badge variant="neutral">Depleted</Badge>;
    if (pkg.creditsRemaining === 0) return <Badge variant="neutral">Used</Badge>;
    if (pkg.creditsRemaining < pkg.creditsPurchased * 0.2) return <Badge variant="warning">Low</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: 'Finance' },
            { label: 'Packages' }
          ]}
          title="Packages"
        />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Finance' },
          { label: 'Packages' }
        ]}
        title="Prepaid Packages"
        actions={
          <Button onClick={() => setPurchaseModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Package
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {packages?.map((pkg) => (
          <Card key={pkg.recordId || pkg.id} className="hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{pkg.name}</h3>
                {pkg.owner ? (
                  <p className="text-sm text-muted">
                    {pkg.owner.firstName} {pkg.owner.lastName}
                  </p>
                ) : pkg.description ? (
                  <p className="text-sm text-muted">{pkg.description}</p>
                ) : null}
              </div>
              {pkg.owner ? getStatusBadge(pkg) : (
                <Badge variant={pkg.isActive ? 'success' : 'neutral'}>
                  {pkg.isActive ? 'Active' : 'Inactive'}
                </Badge>
              )}
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
                      className="bg-primary h-2 rounded-full transition-all"
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
                  <span className={`font-medium ${
                    new Date(pkg.expiresAt) < new Date() ? 'text-danger' : ''
                  }`}>
                    {new Date(pkg.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {pkg._count?.usages !== undefined && (
                <div className="text-xs text-muted pt-2 border-t border-border">
                  {pkg._count?.usages || 0} time{pkg._count?.usages === 1 ? '' : 's'} used
                </div>
              )}
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              size="sm"
              onClick={() => navigate(`/owners/${pkg.owner.recordId}`)}
            >
              View Owner
            </Button>
          </Card>
        ))}

        {packages?.length === 0 && (
          <div className="col-span-full">
            <Card>
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Packages Yet</h3>
                <p className="text-sm text-muted mb-4">
                  Create prepaid packages to offer discounts for multiple visits
                </p>
                <Button onClick={() => setPurchaseModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Package
                </Button>
              </div>
            </Card>
          </div>
        )}
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

