import { Package, Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const CustomerPackageView = () => {
  // This component shows how customers see their packages in the customer portal
  const mockActivePackages = [
    {
      id: '1',
      name: '10-Day Boarding Pass',
      type: 'Multi-Visit Package',
      purchased: 'Aug 15, 2024',
      expires: 'Feb 15, 2025',
      totalVisits: 10,
      usedVisits: 6,
      remainingVisits: 4,
      value: 450,
      expiresIn: 45
    },
    {
      id: '2',
      name: '5-Visit Daycare Card',
      type: 'Punch Card',
      purchased: 'Sep 1, 2024',
      expires: 'Dec 1, 2024',
      totalVisits: 5,
      usedVisits: 2,
      remainingVisits: 3,
      value: 175,
      expiresIn: 15
    }
  ];

  const mockHistory = [
    { date: 'Oct 10, 2024', description: '10-Day Boarding Pass - Visit #6', location: 'Building A, Kennel 12' },
    { date: 'Oct 3, 2024', description: '10-Day Boarding Pass - Visit #5', location: 'Building B, Kennel 5' },
    { date: 'Sep 28, 2024', description: '5-Visit Daycare Card - Punch #2', location: 'Daycare Area' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Packages & Memberships</h2>
        <p className="text-gray-600">View and manage your packages</p>
      </div>

      {/* Active Packages */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">ACTIVE PACKAGES ({mockActivePackages.length})</h3>
        <div className="space-y-4">
          {mockActivePackages.map((pkg) => {
            const progressPercent = (pkg.usedVisits / pkg.totalVisits) * 100;
            const isExpiringSoon = pkg.expiresIn < 30;

            return (
              <Card key={pkg.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{pkg.name}</h4>
                      <p className="text-sm text-gray-600">{pkg.type}</p>
                    </div>
                  </div>
                  {isExpiringSoon && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Expires in {pkg.expiresIn} days
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-900">
                      {pkg.usedVisits} of {pkg.totalVisits} visits used
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        progressPercent < 30 ? 'bg-green-600' :
                        progressPercent < 70 ? 'bg-yellow-600' :
                        'bg-orange-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pkg.remainingVisits} visits remaining
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Purchased</p>
                    <p className="font-medium text-gray-900">{pkg.purchased}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Expires</p>
                    <p className="font-medium text-gray-900">{pkg.expires}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Value</p>
                    <p className="font-medium text-gray-900">${pkg.value}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm">Book Visit</Button>
                  <Button variant="outline" size="sm">View Details</Button>
                  {isExpiringSoon && (
                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-300">
                      Extend Package
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Redemption History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">REDEMPTION HISTORY</h3>
        <div className="space-y-3">
          {mockHistory.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.description}</p>
                <p className="text-sm text-gray-600">{item.location}</p>
                <p className="text-xs text-gray-500 mt-1">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-4">View Full History</Button>
      </Card>

      {/* Purchase New Package */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-2">Save More with Packages</h3>
            <p className="text-sm text-blue-800 mb-4">
              Purchase multi-visit packages and save up to 30% on your regular bookings.
            </p>
            <Button>
              <Package className="w-4 h-4 mr-2" />
              Browse Available Packages
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomerPackageView;

