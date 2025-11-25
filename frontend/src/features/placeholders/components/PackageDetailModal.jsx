/**
 * PackageDetailModal - Package detail inspector using unified Inspector system
 */

import { Package, Edit, BarChart3, Mail, Pause, Copy, Archive, Star, DollarSign, AlertTriangle } from 'lucide-react';
import {
  InspectorRoot,
  InspectorHeader,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const PackageDetailModal = ({ package: pkg, isOpen, onClose }) => {
  if (!pkg) return null;

  const mockCustomerReviews = [
    {
      rating: 5,
      text: 'Best value! We travel frequently and this saves us so much money. Highly recommend!',
      author: 'Sarah J.',
      date: 'Oct 12'
    },
    {
      rating: 5,
      text: 'Love that we can use it over 6 months. Perfect for our schedule!',
      author: 'Mike T.',
      date: 'Oct 8'
    },
    {
      rating: 4,
      text: 'Great deal but wish it worked on weekends too',
      author: 'Emma D.',
      date: 'Oct 3'
    }
  ];

  const mockActiveHolders = [
    { name: 'Sarah Johnson', used: 7, total: 10, remaining: 3 },
    { name: 'Mike Thompson', used: 4, total: 10, remaining: 6 },
    { name: 'Amanda Chen', used: 2, total: 10, remaining: 8 }
  ];

  const mockExpiring = [
    { name: 'Tom Brown', expiresDate: 'Oct 25', unused: 5 },
    { name: 'Jessica Lee', expiresDate: 'Oct 28', unused: 7 },
    { name: 'David Martinez', expiresDate: 'Nov 2', unused: 3 }
  ];

  return (
    <InspectorRoot
      isOpen={isOpen}
      onClose={onClose}
      title={pkg.name}
      subtitle={pkg.type}
      variant="finance"
      size="xl"
    >
      {/* Header with metrics */}
      <InspectorHeader
        status="Active"
        statusIntent="success"
        metrics={[
          { label: 'Price', value: `$${pkg.price}` },
          { label: 'Sold', value: pkg.performance?.soldLast30Days || 0 },
          { label: 'Rating', value: `${pkg.performance?.rating || 4.9}/5` },
        ]}
      >
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-[var(--bb-space-2)] mt-[var(--bb-space-4)]">
          <Button variant="primary" size="sm">
            <Edit className="w-4 h-4 mr-[var(--bb-space-1)]" />
            Edit Package
          </Button>
          <Button variant="secondary" size="sm">
            <BarChart3 className="w-4 h-4 mr-[var(--bb-space-1)]" />
            View Analytics
          </Button>
          <Button variant="secondary" size="sm">
            <Mail className="w-4 h-4 mr-[var(--bb-space-1)]" />
            Email Customers
          </Button>
          <Button variant="secondary" size="sm">
            <Pause className="w-4 h-4 mr-[var(--bb-space-1)]" />
            Pause Sales
          </Button>
          <Button variant="secondary" size="sm">
            <Copy className="w-4 h-4 mr-[var(--bb-space-1)]" />
            Duplicate
          </Button>
          <Button variant="destructive" size="sm">
            <Archive className="w-4 h-4 mr-[var(--bb-space-1)]" />
            Archive
          </Button>
        </div>
      </InspectorHeader>

      {/* Package Information */}
      <InspectorSection title="Package Information" icon={Package}>
        <div className="grid grid-cols-2 gap-[var(--bb-space-4)]">
          <InspectorField label="Name" value={pkg.name} layout="stacked" />
          <InspectorField label="Type" value={pkg.type} layout="stacked" />
          <InspectorField label="Status" layout="stacked">
            <Badge variant="success">✅ Active (available for purchase)</Badge>
          </InspectorField>
          <InspectorField label="Created" value="March 15, 2024" layout="stacked" />
        </div>
      </InspectorSection>

      {/* Pricing & Value */}
      <InspectorSection title="Pricing & Value" icon={DollarSign}>
        <div className="grid grid-cols-2 gap-[var(--bb-space-4)] mb-[var(--bb-space-4)]">
          <div>
            <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] uppercase tracking-wide">Package Price</p>
            <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">${pkg.price}</p>
          </div>
          {pkg.regularPrice && (
            <div>
              <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] uppercase tracking-wide">Regular Value</p>
              <p className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">${pkg.regularPrice}</p>
            </div>
          )}
        </div>

        {pkg.savings && (
          <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-positive-soft)] border border-[var(--bb-color-status-positive)] p-[var(--bb-space-3)] mb-[var(--bb-space-4)]">
            <p className="text-[var(--bb-color-status-positive)] font-[var(--bb-font-weight-medium)]">
              Customer Saves: ${pkg.savings} ({((pkg.savings / pkg.regularPrice) * 100).toFixed(1)}%)
            </p>
          </div>
        )}

        <div className="mb-[var(--bb-space-4)]">
          <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">Cost Breakdown:</p>
          <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
            <li>• 10 nights boarding @ $50/night = $500</li>
            <li>• 10 days playtime @ $10/day = $100</li>
            <li>• 10 days photos @ $5/day = $50</li>
            <li className="font-[var(--bb-font-weight-semibold)] pt-[var(--bb-space-1)] border-t border-[var(--bb-color-border-subtle)]">
              Total value: ${pkg.regularPrice || pkg.price}
            </li>
          </ul>
        </div>

        {pkg.performance?.profitPerPackage && (
          <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-accent-soft)] border border-[var(--bb-color-accent)] p-[var(--bb-space-3)]">
            <p className="text-[var(--bb-color-accent)]">
              <strong>Your profit per package:</strong> ${pkg.performance.profitPerPackage} (63.8% margin) ✅
            </p>
          </div>
        )}
      </InspectorSection>

      {/* Sales Performance */}
      <InspectorSection title="Sales Performance" icon={BarChart3}>
        <div className="space-y-[var(--bb-space-4)] text-[var(--bb-font-size-sm)]">
          <div>
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">ALL TIME:</p>
            <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-color-text-primary)]">
              <li>• Total packages sold: 247</li>
              <li>• Total revenue: $111,150</li>
              <li>• Total profit: $70,889</li>
              <li>• Average rating: {pkg.performance?.rating || 4.9}/5.0 ({pkg.performance?.reviews || 89} reviews)</li>
            </ul>
          </div>

          <div>
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">LAST 30 DAYS:</p>
            <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-color-text-primary)]">
              {pkg.performance?.soldLast30Days && (
                <li>• Packages sold: {pkg.performance.soldLast30Days} 🔥 (+35% vs prior month)</li>
              )}
              {pkg.performance?.revenueLast30Days && (
                <li>• Revenue: ${pkg.performance.revenueLast30Days.toLocaleString()}</li>
              )}
              {pkg.performance?.profitPerPackage && pkg.performance?.soldLast30Days && (
                <li>• Profit: ${(pkg.performance.profitPerPackage * pkg.performance.soldLast30Days).toLocaleString()}</li>
              )}
            </ul>
          </div>

          {pkg.performance?.totalActive && (
            <div>
              <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">CURRENT STATUS:</p>
              <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-color-text-primary)]">
                <li>• Active packages: {pkg.performance.totalActive}</li>
                <li>• Visits redeemed this month: {pkg.performance.visitsRedeemed}</li>
                <li>• Average redemption rate: 83%</li>
                <li className="text-[var(--bb-color-status-positive)]">• 17% of packages expire unused - pure profit!</li>
              </ul>
            </div>
          )}

          <Button variant="secondary" size="sm">View Detailed Sales Report</Button>
        </div>
      </InspectorSection>

      {/* Customer Feedback */}
      <InspectorSection title="Customer Feedback" icon={Star}>
        <div className="mb-[var(--bb-space-4)]">
          <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-2)]">
            <span className="text-[var(--bb-font-size-2xl)] font-[var(--bb-font-weight-bold)] text-[var(--bb-color-text-primary)]">
              {pkg.performance?.rating || 4.9}
            </span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-[var(--bb-color-status-warning)] fill-[var(--bb-color-status-warning)]" />
              ))}
            </div>
            <span className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
              ({pkg.performance?.reviews || 89} reviews)
            </span>
          </div>
        </div>

        <div className="space-y-[var(--bb-space-3)]">
          <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">Recent reviews:</p>
          {mockCustomerReviews.map((review, idx) => (
            <div key={idx} className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-3)]">
              <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-1)]">
                <div className="flex">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-[var(--bb-color-status-warning)] fill-[var(--bb-color-status-warning)]" />
                  ))}
                </div>
                <span className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  {review.author} ({review.date})
                </span>
              </div>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">"{review.text}"</p>
            </div>
          ))}
        </div>

        <div className="flex gap-[var(--bb-space-2)] mt-[var(--bb-space-4)]">
          <Button variant="secondary" size="sm">View All Reviews</Button>
          <Button variant="secondary" size="sm">Respond to Feedback</Button>
        </div>
      </InspectorSection>

      {/* Active Package Holders */}
      <InspectorSection title="Active Package Holders">
        <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-4)]">
          {pkg.performance?.totalActive || 67} customers currently have this package
        </p>

        <div className="space-y-[var(--bb-space-3)] mb-[var(--bb-space-4)]">
          <p className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">Top users:</p>
          {mockActiveHolders.map((holder, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] p-[var(--bb-space-3)]">
              <div>
                <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)]">{holder.name}</p>
                <p className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  {holder.used} of {holder.total} visits used ({holder.remaining} remaining)
                </p>
              </div>
              <Button variant="secondary" size="sm">View</Button>
            </div>
          ))}
        </div>

        {pkg.expiringSoon > 0 && (
          <div className="rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-status-warning-soft)] border border-[var(--bb-color-status-warning)] p-[var(--bb-space-4)] mb-[var(--bb-space-4)]">
            <div className="flex items-start gap-[var(--bb-space-2)] mb-[var(--bb-space-3)]">
              <AlertTriangle className="w-5 h-5 text-[var(--bb-color-status-warning)] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
                  Expiring soon (next 30 days): {pkg.expiringSoon} customers
                </p>
                <div className="space-y-[var(--bb-space-2)]">
                  {mockExpiring.map((exp, idx) => (
                    <p key={idx} className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                      • {exp.name} - Expires {exp.expiresDate} ({exp.unused} visits unused)
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <Button size="sm" variant="primary">
              <Mail className="w-4 h-4 mr-[var(--bb-space-1)]" />
              Send Batch Reminder
            </Button>
          </div>
        )}

        <Button variant="secondary" size="sm">View All Package Holders</Button>
      </InspectorSection>

      {/* Package Rules & Restrictions */}
      <InspectorSection title="Package Rules & Restrictions" noBorder>
        <div className="grid md:grid-cols-2 gap-[var(--bb-space-6)] text-[var(--bb-font-size-sm)]">
          <div>
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">VALIDITY:</p>
            <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-color-text-primary)]">
              <li>• Expires 6 months after purchase</li>
              <li>• Maximum 2 visits per month</li>
            </ul>
          </div>
          <div>
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">RESTRICTIONS:</p>
            <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-color-text-primary)]">
              <li>• Available Monday-Friday only</li>
              <li>• No blackout dates</li>
              <li>• No advance booking required</li>
            </ul>
          </div>
          <div>
            <p className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">REFUND POLICY:</p>
            <ul className="space-y-[var(--bb-space-1)] text-[var(--bb-color-text-primary)]">
              <li>• 90% refund of unused balance</li>
              <li>• $25 processing fee</li>
              <li>• Transferable to others</li>
            </ul>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="mt-[var(--bb-space-4)]">Edit Rules</Button>
      </InspectorSection>

      {/* Footer */}
      <InspectorFooter>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary">Save Changes</Button>
      </InspectorFooter>
    </InspectorRoot>
  );
};

export default PackageDetailModal;
