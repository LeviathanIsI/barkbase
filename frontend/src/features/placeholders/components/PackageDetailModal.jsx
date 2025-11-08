import { X, Package, Edit, BarChart3, Mail, Pause, Copy, Archive, Star, DollarSign, Calendar, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <div>
                <DialogTitle className="text-xl font-bold">PACKAGE DETAILS: {pkg.name}</DialogTitle>
                <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">{pkg.type}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-text-tertiary hover:text-gray-600 dark:hover:text-text-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="primary" size="sm">
            <Edit className="w-4 h-4 mr-1" />
            Edit Package
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-1" />
            View Analytics
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-1" />
            Email Customers
          </Button>
          <Button variant="outline" size="sm">
            <Pause className="w-4 h-4 mr-1" />
            Pause Sales
          </Button>
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-1" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:bg-surface-primary">
            <Archive className="w-4 h-4 mr-1" />
            Archive
          </Button>
        </div>

        <div className="space-y-6">
          {/* Package Information */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-6 bg-gray-50 dark:bg-surface-secondary">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4">PACKAGE INFORMATION</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-text-secondary">Name:</p>
                <p className="font-medium text-gray-900 dark:text-text-primary">{pkg.name}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-text-secondary">Type:</p>
                <p className="font-medium text-gray-900 dark:text-text-primary">{pkg.type}</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-text-secondary">Status:</p>
                <Badge variant="success">✅ Active (available for purchase)</Badge>
              </div>
              <div>
                <p className="text-gray-600 dark:text-text-secondary">Created:</p>
                <p className="font-medium text-gray-900 dark:text-text-primary">March 15, 2024</p>
              </div>
            </div>
          </div>

          {/* Pricing & Value */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4">PRICING & VALUE</h3>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 dark:text-text-secondary">Package Price:</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">${pkg.price}</p>
                </div>
                {pkg.regularPrice && (
                  <div>
                    <p className="text-gray-600 dark:text-text-secondary">Regular Value:</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">${pkg.regularPrice}</p>
                  </div>
                )}
              </div>

              {pkg.savings && (
                <div className="bg-green-50 dark:bg-surface-primary border border-green-200 dark:border-green-900/30 rounded-lg p-3">
                  <p className="text-green-900 font-medium">
                    Customer Saves: ${pkg.savings} ({((pkg.savings / pkg.regularPrice) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}

              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary mb-2">Cost Breakdown:</p>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                  <li>• 10 nights boarding @ $50/night = $500</li>
                  <li>• 10 days playtime @ $10/day = $100</li>
                  <li>• 10 days photos @ $5/day = $50</li>
                  <li className="font-semibold pt-1 border-t border-gray-300 dark:border-surface-border">Total value: ${pkg.regularPrice || pkg.price}</li>
                </ul>
              </div>

              {pkg.performance?.profitPerPackage && (
                <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-3">
                  <p className="text-blue-900 dark:text-blue-100">
                    <strong>Your profit per package:</strong> ${pkg.performance.profitPerPackage} (63.8% margin) ✅
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sales Performance */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4">SALES PERFORMANCE</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary mb-2">ALL TIME:</p>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                  <li>• Total packages sold: 247</li>
                  <li>• Total revenue: $111,150</li>
                  <li>• Total profit: $70,889</li>
                  <li>• Average rating: {pkg.performance?.rating || 4.9}/5.0 ({pkg.performance?.reviews || 89} reviews)</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary mb-2">LAST 30 DAYS:</p>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
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
                  <p className="font-medium text-gray-900 dark:text-text-primary mb-2">CURRENT STATUS:</p>
                  <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                    <li>• Active packages: {pkg.performance.totalActive}</li>
                    <li>• Visits redeemed this month: {pkg.performance.visitsRedeemed}</li>
                    <li>• Average redemption rate: 83%</li>
                    <li className="text-green-700">• 17% of packages expire unused - pure profit!</li>
                  </ul>
                </div>
              )}

              <Button variant="outline" size="sm">View Detailed Sales Report</Button>
            </div>
          </div>

          {/* Customer Feedback */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4">CUSTOMER FEEDBACK</h3>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-text-primary">{pkg.performance?.rating || 4.9}</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  ))}
                </div>
                <span className="text-sm text-gray-600 dark:text-text-secondary">({pkg.performance?.reviews || 89} reviews)</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900 dark:text-text-primary">Recent reviews:</p>
              {mockCustomerReviews.map((review, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-text-secondary">{review.author} ({review.date})</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-text-primary">"{review.text}"</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm">View All Reviews</Button>
              <Button variant="outline" size="sm">Respond to Feedback</Button>
            </div>
          </div>

          {/* Active Package Holders */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4">ACTIVE PACKAGE HOLDERS</h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">{pkg.performance?.totalActive || 67} customers currently have this package</p>

            <div className="space-y-3 mb-4">
              <p className="text-sm font-medium text-gray-900 dark:text-text-primary">Top users:</p>
              {mockActiveHolders.map((holder, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-surface-secondary rounded-lg p-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-text-primary">{holder.name}</p>
                    <p className="text-xs text-gray-600 dark:text-text-secondary">{holder.used} of {holder.total} visits used ({holder.remaining} remaining)</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              ))}
            </div>

            {pkg.expiringSoon > 0 && (
              <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900 mb-2">Expiring soon (next 30 days): {pkg.expiringSoon} customers</p>
                    <div className="space-y-2">
                      {mockExpiring.map((exp, idx) => (
                        <p key={idx} className="text-sm text-yellow-800">
                          • {exp.name} - Expires {exp.expiresDate} ({exp.unused} visits unused)
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="primary">
                  <Mail className="w-4 h-4 mr-1" />
                  Send Batch Reminder
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm">View All Package Holders</Button>
          </div>

          {/* Package Rules & Restrictions */}
          <div className="border border-gray-200 dark:border-surface-border rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-4">PACKAGE RULES & RESTRICTIONS</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary mb-2">VALIDITY:</p>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                  <li>• Expires 6 months after purchase</li>
                  <li>• Maximum 2 visits per month</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary mb-2">RESTRICTIONS:</p>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                  <li>• Available Monday-Friday only</li>
                  <li>• No blackout dates</li>
                  <li>• No advance booking required</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-text-primary mb-2">REFUND POLICY:</p>
                <ul className="space-y-1 text-gray-700 dark:text-text-primary">
                  <li>• 90% refund of unused balance</li>
                  <li>• $25 processing fee</li>
                  <li>• Transferable to others</li>
                </ul>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-4">Edit Rules</Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-surface-border">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageDetailModal;

