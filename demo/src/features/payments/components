import { useState } from 'react';
import { X, Star, Check, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const PaymentSetupWizard = ({ isOpen, onClose, onComplete }) => {
  const [selectedProcessor, setSelectedProcessor] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const processors = [
    {
      id: 'stripe',
      name: 'Stripe',
      rate: '2.9% + 30¢',
      setupTime: '5 minutes',
      monthlyFee: 'No monthly fee',
      features: [
        'No setup fees or hidden costs',
        'Fastest payouts (1-2 business days)',
        'Best fraud protection',
        'Accept all major cards + digital wallets',
        'Transparent pricing, no surprises',
        'Easiest QuickBooks integration'
      ],
      recommended: true,
      perfectFor: 'Most facilities (best all-around)'
    },
    {
      id: 'square',
      name: 'Square',
      rate: '2.9% + 30¢ online / 2.6% + 10¢ in-person',
      setupTime: '10 minutes',
      monthlyFee: 'No monthly fee',
      features: [
        'Great for in-person payments (lower rate)',
        'Free card reader hardware available',
        'Next-day payouts',
        'Good for retail integration'
      ],
      recommended: false,
      perfectFor: 'Facilities with retail shop/POS'
    },
    {
      id: 'paypal',
      name: 'PayPal / Venmo',
      rate: '3.49% + 49¢',
      setupTime: '15 minutes',
      monthlyFee: 'No monthly fee',
      features: [
        'Customers trust PayPal brand',
        'Venmo for younger customers'
      ],
      recommended: false,
      perfectFor: 'Customer preference/trust',
      warnings: ['Higher fees than others']
    },
    {
      id: 'authorize',
      name: 'Authorize.Net',
      rate: '2.9% + 30¢ + $25/month',
      setupTime: '30 minutes',
      monthlyFee: '$25/month gateway fee',
      features: [
        'Established, reliable processor',
        'Works with existing merchant account'
      ],
      recommended: false,
      perfectFor: 'Large facilities with existing account',
      warnings: ['Monthly fee + higher setup complexity']
    }
  ];

  const handleProcessorSelect = (processorId) => {
    setSelectedProcessor(processorId);
    setCurrentStep(2);
  };

  const handleComplete = () => {
    const processor = processors.find(p => p.id === selectedProcessor);
    onComplete({
      processor: processor,
      setupComplete: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Payment Setup Wizard</h3>
            <p className="text-sm text-gray-600">Choose your payment processor</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <div className="text-sm font-medium">Choose Processor</div>
            <div className="flex-1 h-px bg-gray-300 mx-4"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className="text-sm font-medium">Configure</div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Intro */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Your Choice, Your Terms</h4>
                <p className="text-blue-800 mb-4">
                  Choose a payment processor that fits your business needs.
                  Compare features, rates, and setup requirements.
                </p>
                <div className="flex items-center gap-2 text-blue-700">
                  <Info className="w-4 h-4" />
                  <span className="text-sm">💡 Compare rates and features to save money</span>
                </div>
              </div>

              {/* Processor Selection */}
              <div className="grid gap-4 md:grid-cols-2">
                {processors.map((processor) => (
                  <Card
                    key={processor.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                      selectedProcessor === processor.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleProcessorSelect(processor.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-semibold text-gray-900">{processor.name}</h4>
                        {processor.recommended && (
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            BEST
                          </span>
                        )}
                      </div>
                      {selectedProcessor === processor.id && (
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rate:</span>
                        <span className="font-semibold text-gray-900">{processor.rate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Setup:</span>
                        <span className="font-medium text-gray-900">{processor.setupTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Monthly:</span>
                        <span className="font-medium text-gray-900">{processor.monthlyFee}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      {processor.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-gray-700 mb-1">
                          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {processor.warnings && processor.warnings.map((warning, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm text-orange-700 mb-1">
                          <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-xs text-gray-600 mb-2">Perfect for:</p>
                      <p className="text-sm font-medium text-gray-900">{processor.perfectFor}</p>
                    </div>

                    <div className="mt-4">
                      <Button
                        className="w-full"
                        variant={selectedProcessor === processor.id ? 'primary' : 'outline'}
                      >
                        {selectedProcessor === processor.id ? 'Selected' : `Connect ${processor.name}`}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Other Options */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Other Options</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-1">I have my own merchant account</p>
                    <p className="text-sm text-gray-600 mb-3">Enter custom API credentials</p>
                    <Button variant="outline" size="sm">
                      Enter Custom Credentials
                    </Button>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-1">Manual payments only</p>
                    <p className="text-sm text-gray-600 mb-3">Cash/check/offline processing</p>
                    <Button variant="outline" size="sm">
                      Skip Online Setup
                    </Button>
                  </div>
                </div>
              </div>

              {/* Savings Tip */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Info className="w-5 h-5" />
                  <div>
                    <p className="font-medium">💡 Money-Saving Tip</p>
                    <p className="text-sm">
                      Compare processing rates and features between providers.
                      You can always switch payment processors later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Connect {processors.find(p => p.id === selectedProcessor)?.name}
                </h4>
                <p className="text-gray-600">
                  We'll guide you through the setup process
                </p>
              </div>

              {/* Setup Steps */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h5 className="font-semibold text-blue-900 mb-2">Step 1: Create Account</h5>
                  <p className="text-blue-800 text-sm mb-3">
                    Visit {processors.find(p => p.id === selectedProcessor)?.name}.com and create your account
                  </p>
                  <Button variant="outline">
                    Open {processors.find(p => p.id === selectedProcessor)?.name} Website
                  </Button>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h5 className="font-semibold text-gray-900 mb-2">Step 2: Get API Keys</h5>
                  <p className="text-gray-700 text-sm mb-3">
                    In your {processors.find(p => p.id === selectedProcessor)?.name} dashboard,
                    navigate to API settings and copy your keys
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Publishable Key
                      </label>
                      <input
                        type="password"
                        placeholder="pk_live_..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secret Key
                      </label>
                      <input
                        type="password"
                        placeholder="sk_live_..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h5 className="font-semibold text-green-900 mb-2">Step 3: Test Connection</h5>
                  <p className="text-green-800 text-sm mb-3">
                    We'll verify your connection and run a test transaction
                  </p>
                  <Button>
                    Test Connection
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel Setup
          </Button>
          {currentStep === 1 && (
            <Button variant="outline">
              Compare All Processors
            </Button>
          )}
          {currentStep === 2 && (
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
          )}
          <Button
            onClick={handleComplete}
            disabled={!selectedProcessor}
          >
            Complete Setup
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSetupWizard;
