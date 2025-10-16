import { ChevronLeft, TrendingUp, DollarSign, Users, Target, AlertCircle, Lightbulb } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const PackageAnalytics = ({ onBack }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Packages
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Package Analytics</h2>
          <p className="text-gray-600">Deep insights into package performance and customer behavior</p>
        </div>
      </div>

      {/* Revenue Impact */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">REVENUE IMPACT</h3>
          <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
            <option>Last 90 days</option>
            <option>Last 30 days</option>
            <option>Last 12 months</option>
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Package Revenue</p>
            <p className="text-3xl font-bold text-blue-600">$56,450</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Regular Booking Revenue</p>
            <p className="text-3xl font-bold text-gray-900">$87,230</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Package % of Total</p>
            <p className="text-3xl font-bold text-green-600">39.3%</p>
            <Badge variant="success" className="mt-1">📈 Above industry average (25-35%)</Badge>
          </div>
        </div>

        {/* Revenue Trend Chart Placeholder */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Revenue Trend (Last 12 Months)</h4>
          <div className="h-48 flex items-end gap-2">
            {[5, 8, 12, 15, 18, 22, 25, 28, 32, 35, 38, 42].map((height, idx) => (
              <div key={idx} className="flex-1 bg-blue-600 rounded-t" style={{ height: `${height * 3}px` }}></div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-900">
            📈 <strong>Package revenue growing 8% per month on average</strong>
          </p>
        </div>
      </Card>

      {/* Package Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">PACKAGE COMPARISON</h3>
        <p className="text-sm text-gray-600 mb-4">Performance by package type:</p>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">10-Day Boarding Pass</h4>
              <Badge variant="warning">🥇 Top Performer</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Revenue</p>
                <p className="font-bold text-gray-900">$31,050</p>
                <p className="text-xs text-gray-500">(55% of package revenue)</p>
              </div>
              <div>
                <p className="text-gray-600">Sold</p>
                <p className="font-bold text-gray-900">69</p>
              </div>
              <div>
                <p className="text-gray-600">Rating</p>
                <p className="font-bold text-gray-900">4.9/5.0</p>
              </div>
              <div>
                <p className="text-gray-600">Redemption</p>
                <p className="font-bold text-gray-900">83%</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Unlimited Daycare Membership</h4>
              <Badge variant="success">🥈 Strong Performer</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Revenue</p>
                <p className="font-bold text-gray-900">$21,546</p>
                <p className="text-xs text-gray-500">(38% of package revenue)</p>
              </div>
              <div>
                <p className="text-gray-600">Members</p>
                <p className="font-bold text-gray-900">18</p>
              </div>
              <div>
                <p className="text-gray-600">Rating</p>
                <p className="font-bold text-gray-900">4.8/5.0</p>
              </div>
              <div>
                <p className="text-gray-600">Member Value</p>
                <p className="font-bold text-gray-900">$1,197</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">5-Visit Daycare Card</h4>
              <Badge>🥉 Growing</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Revenue</p>
                <p className="font-bold text-gray-900">$3,850</p>
                <p className="text-xs text-gray-500">(7% of package revenue)</p>
              </div>
              <div>
                <p className="text-gray-600">Sold</p>
                <p className="font-bold text-gray-900">22</p>
              </div>
              <div>
                <p className="text-gray-600">Rating</p>
                <p className="font-bold text-gray-900">4.7/5.0</p>
              </div>
              <div>
                <p className="text-gray-600">Redemption</p>
                <p className="font-bold text-gray-900">89%</p>
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="mt-4">View Detailed Comparison</Button>
      </Card>

      {/* Customer Behavior */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">CUSTOMER BEHAVIOR</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Package Attach Rate</p>
              <p className="text-3xl font-bold text-blue-600">47%</p>
              <p className="text-xs text-gray-500">(% of customers who purchase packages)</p>
              <Badge variant="success" className="mt-1">📈 Above industry average (35%)</Badge>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Customer Lifetime Value:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">With packages:</span>
                  <span className="font-bold text-green-700">$1,847 avg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Without packages:</span>
                  <span className="font-bold text-gray-900">$734 avg</span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                  <p className="text-green-900 font-semibold">Packages increase LTV by 152%! 🔥</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Redemption Patterns:</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Avg time to first use:</span>
                <span className="font-medium text-gray-900">8 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Avg time between uses:</span>
                <span className="font-medium text-gray-900">12 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">% who use all visits:</span>
                <span className="font-medium text-gray-900">83%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">% who let packages expire:</span>
                <span className="font-medium text-green-700">17% (pure profit!)</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">Repeat Purchase Rate:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Repurchase rate:</span>
                  <span className="font-bold text-blue-700">67%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Avg packages per customer/year:</span>
                  <span className="font-medium text-gray-900">2.3</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="mt-4">View Customer Segments Analysis</Button>
      </Card>

      {/* Profitability Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">PROFITABILITY ANALYSIS</h3>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Package Profit (90 days)</p>
            <p className="text-3xl font-bold text-green-600">$36,187</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Average Profit Margin</p>
            <p className="text-3xl font-bold text-green-600">64.1%</p>
          </div>
        </div>

        <div className="space-y-3 text-sm mb-4">
          <p className="font-semibold text-gray-900">Profit by package:</p>
          <div className="flex justify-between">
            <span className="text-gray-700">10-Day Boarding Pass:</span>
            <span className="font-bold text-gray-900">$19,869 (avg $287/package)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Unlimited Daycare:</span>
            <span className="font-bold text-gray-900">$10,773 (avg $598/member)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">5-Visit Daycare Card:</span>
            <span className="font-bold text-gray-900">$2,156 (avg $98/card)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">VIP Membership:</span>
            <span className="font-bold text-gray-900">$3,389 (mostly from service upsells)</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-900 mb-2">Hidden profit sources:</p>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Expired unused visits: <strong>$4,287</strong> (pure profit!)</li>
            <li>• Add-on purchases by package holders: <strong>$8,934</strong></li>
          </ul>
          <p className="text-sm text-blue-900 font-medium mt-3">
            💡 Package holders spend 43% more on add-ons than regular customers!
          </p>
        </div>

        <Button variant="outline" size="sm" className="mt-4">Export Profitability Report</Button>
      </Card>

      {/* Actionable Insights */}
      <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          ACTIONABLE INSIGHTS
        </h3>

        <div className="space-y-4">
          <div>
            <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              OPPORTUNITIES:
            </p>
            <ul className="space-y-2 text-sm text-gray-800">
              <li>• Create weekend-only package (requested in 12 reviews)</li>
              <li>• Increase VIP membership price $49→$59 (demand is high)</li>
              <li>• Launch "Puppy Starter Pack" for new dog owners</li>
              <li>• Offer 5% discount for buying 2+ packages at once</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              CONCERNS:
            </p>
            <ul className="space-y-2 text-sm text-gray-800">
              <li>• 8 packages expiring soon with unused visits</li>
              <li>• 5-Visit Daycare Card underperforming (only 7% of revenue)</li>
              <li>• 2 membership cancellations this month (investigate why)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              RECOMMENDED ACTIONS:
            </p>
            <ol className="space-y-2 text-sm text-gray-800">
              <li>1. Email 8 customers with expiring packages</li>
              <li>2. A/B test different pricing for Daycare Card</li>
              <li>3. Survey membership cancellations for feedback</li>
              <li>4. Create weekend package based on customer requests</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button>Generate Action Plan</Button>
          <Button variant="outline">Schedule Review Meeting</Button>
        </div>
      </Card>
    </div>
  );
};

export default PackageAnalytics;

