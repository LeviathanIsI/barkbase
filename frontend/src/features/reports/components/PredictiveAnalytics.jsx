import { Zap, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PredictiveAnalytics = () => {
  const forecastData = {
    predictedRevenue: '$24,750',
    confidence: '87%',
    breakdown: [
      { type: 'Confirmed bookings', amount: '$18,450', percentage: '75%' },
      { type: 'Expected new bookings', amount: '$4,920', percentage: '20%' },
      { type: 'Predicted walk-ins', amount: '$1,380', percentage: '5%' }
    ]
  };

  const demandPeriods = [
    {
      period: 'Thanksgiving Week (Nov 25-30)',
      expected: '98% capacity (33/34 kennels)',
      recommendations: [
        'Raise prices 15% ($825 extra revenue)',
        'Enable waitlist (5+ customers expected)',
        'Schedule extra staff'
      ]
    },
    {
      period: 'Christmas Week (Dec 24-30)',
      expected: '100% capacity + waitlist',
      recommendations: [
        'Raise prices 20% ($1,100 extra revenue)',
        'Book emergency overflow kennels',
        'Full staff schedule required'
      ]
    }
  ];

  const lowDemandPeriods = [
    {
      period: 'Mid-January (Jan 15-31)',
      expected: '45% capacity expected',
      recommendations: [
        'Run 20% off promotion to boost bookings',
        'Target inactive customers with win-back campaign'
      ]
    }
  ];

  const churnRisk = [
    {
      customer: 'Mike Thompson',
      ltv: '$723',
      inactive: '67 days',
      pattern: 'Usually books every 21 days',
      probability: '89%',
      action: 'Send Win-Back Email'
    },
    {
      customer: 'Emma Davis',
      ltv: '$689',
      inactive: '58 days',
      pattern: 'Usually books every 18 days',
      probability: '76%',
      action: 'Send Win-Back Email'
    },
    {
      customer: 'Jessica Lee',
      ltv: '$584',
      inactive: '45 days',
      pattern: 'Usually books every 14 days',
      probability: '64%',
      action: 'Send Win-Back Email'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Predictive Analytics</h3>
        <p className="text-gray-600 mb-8">AI-powered forecasting and insights</p>
      </div>

      {/* Revenue Forecast */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">REVENUE FORECAST (Next 30 Days)</h4>

        <div className="text-center mb-6">
          <p className="text-4xl font-bold text-gray-900 mb-2">{forecastData.predictedRevenue}</p>
          <p className="text-sm text-gray-600">Predicted Revenue</p>
          <p className="text-sm text-blue-600">Confidence: {forecastData.confidence} (based on historical patterns + bookings)</p>
        </div>

        <div className="h-32 bg-gray-50 rounded flex items-end justify-center mb-4">
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-gray-600 text-sm">Forecast chart visualization</p>
          </div>
        </div>

        <div className="space-y-2">
          {forecastData.breakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">{item.type}:</span>
              <span className="font-semibold text-gray-900">{item.amount} ({item.percentage})</span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            📊 vs Same Period Last Year: +$3,240 (+15%) ↗
          </p>
        </div>
      </Card>

      {/* Demand Forecast */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">DEMAND FORECAST</h4>
        <p className="text-sm text-gray-600 mb-6">High-demand periods ahead:</p>

        <div className="space-y-4">
          {demandPeriods.map((period, index) => (
            <div key={index} className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-semibold text-red-900 mb-2">{period.period}</h5>
                  <p className="text-sm text-red-800 mb-3">Expected: {period.expected}</p>
                  <div className="space-y-1">
                    {period.recommendations.map((rec, recIndex) => (
                      <p key={recIndex} className="text-sm text-red-700">• {rec}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <h5 className="font-semibold text-orange-900 mb-3">⚠️ Low-demand periods:</h5>
          {lowDemandPeriods.map((period, index) => (
            <div key={index} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="font-semibold text-orange-900 mb-2">{period.period}</h5>
                  <p className="text-sm text-orange-800 mb-3">Expected: {period.expected}</p>
                  <div className="space-y-1">
                    {period.recommendations.map((rec, recIndex) => (
                      <p key={recIndex} className="text-sm text-orange-700">• {rec}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Churn Risk Analysis */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">CHURN RISK ANALYSIS</h4>

        <div className="text-center mb-6">
          <p className="text-2xl font-bold text-red-600 mb-2">🚨 12 customers at HIGH risk of churning</p>
          <p className="text-sm text-gray-600">Total at-risk revenue: $7,234</p>
        </div>

        <div className="space-y-4">
          {churnRisk.map((customer, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h5 className="font-semibold text-gray-900">{customer.customer}</h5>
                  <p className="text-sm text-gray-600">LTV: {customer.ltv}</p>
                  <p className="text-sm text-gray-600">Inactive: {customer.inactive}</p>
                  <p className="text-sm text-gray-600">Pattern: {customer.pattern}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{customer.probability}</p>
                  <p className="text-xs text-gray-600">churn probability</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  {customer.action}
                </Button>
                {index === 0 && (
                  <>
                    <Button size="sm" variant="outline">
                      Call Customer
                    </Button>
                  </>
                )}
                {index === 1 && (
                  <>
                    <Button size="sm" variant="outline">
                      Offer Discount
                    </Button>
                  </>
                )}
                {index === 2 && (
                  <>
                    <Button size="sm" variant="outline">
                      Check if Issue
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button>
            Launch Win-Back Campaign
          </Button>
          <Button variant="outline">
            View All At-Risk Customers
          </Button>
        </div>
      </Card>

      <div className="text-center py-8">
        <Button variant="outline">
          🔒 Unlock Predictive Analytics with PRO
        </Button>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
