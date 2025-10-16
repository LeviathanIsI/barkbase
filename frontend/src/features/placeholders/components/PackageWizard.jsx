import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, CreditCard, TrendingUp, Crown, Gift, Check, Star, AlertCircle, Mail, Globe } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Badge from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

const PackageWizard = ({ isOpen, onClose, onComplete, template }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [packageData, setPackageData] = useState({
    type: 'multi-visit',
    name: '',
    internalDescription: '',
    customerDescription: '',
    visits: 10,
    includedServices: [],
    optionalAddons: [],
    regularPrice: 650,
    packagePrice: 450,
    expirationMonths: 6,
    expirationReminders: true,
    daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    blackoutDates: [],
    eligibility: 'anyone',
    vaccinationRequired: true,
    transferable: true,
    refundPolicy: 'full',
    refundPercentage: 90,
    refundFee: 25,
    startSelling: 'immediately',
    showOnPortal: true,
    showOnWebsite: true,
    allowStaffSale: true,
    featured: true,
    mostPopular: true,
    showSavings: true
  });

  useEffect(() => {
    if (template) {
      // Pre-fill form with template data
      setPackageData(prev => ({
        ...prev,
        ...template
      }));
    }
  }, [template]);

  const packageTypes = [
    {
      id: 'multi-visit',
      icon: Calendar,
      name: 'MULTI-VISIT PACKAGE',
      description: 'Fixed number of visits at a discounted rate',
      bestFor: 'Encouraging repeat business',
      features: ['Customer pays upfront for multiple visits', 'You choose services included', 'Set expiration date (e.g., 90 days)'],
      example: '"10-Day Boarding Pass" - $450 (save $50)',
      recommended: true
    },
    {
      id: 'punch-card',
      icon: CreditCard,
      name: 'PUNCH CARD',
      description: 'Buy X, use anytime within validity period',
      bestFor: 'Flexible visit scheduling',
      features: ['Customer redeems one "punch" per visit', 'Simple tracking with visual cards', 'Can restrict to specific services'],
      example: '"5-Visit Daycare Card" - $175 (save $25)'
    },
    {
      id: 'recurring',
      icon: TrendingUp,
      name: 'RECURRING MEMBERSHIP',
      description: 'Monthly subscription with automatic billing',
      bestFor: 'Predictable recurring revenue',
      features: ['Auto-renews monthly until cancelled', 'Include services or just discounts', 'Creates committed customer base'],
      example: '"Unlimited Daycare" - $399/month'
    },
    {
      id: 'vip',
      icon: Crown,
      name: 'VIP MEMBERSHIP',
      description: 'Premium tier with perks and priority access',
      bestFor: 'High-value customers',
      features: ['Includes priority booking', 'Percentage discount on all services', 'Exclusive benefits and perks'],
      example: '"VIP Club" - $49/month (10% off all)'
    },
    {
      id: 'gift',
      icon: Gift,
      name: 'GIFT CERTIFICATE',
      description: 'Prepaid credit redeemable for any service',
      bestFor: 'Holiday gifts, referrals',
      features: ['Customer gets dollar amount credit', 'Can be used for anything', 'Great for attracting new customers'],
      example: '"$100 Gift Card"'
    }
  ];

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(packageData);
  };

  const calculateSavings = () => {
    const savings = packageData.regularPrice - packageData.packagePrice;
    const percentage = ((savings / packageData.regularPrice) * 100).toFixed(1);
    return { savings, percentage };
  };

  const calculateProfit = () => {
    // Simplified profit calculation (assuming 37% cost)
    const cost = packageData.packagePrice * 0.37;
    const profit = packageData.packagePrice - cost;
    const margin = ((profit / packageData.packagePrice) * 100).toFixed(1);
    return { profit: profit.toFixed(0), margin };
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">What type of package are you creating?</h3>
        <p className="text-sm text-gray-600 mb-4">Choose the structure that best fits your business goals</p>
      </div>
      
      <div className="space-y-3">
        {packageTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = packageData.type === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setPackageData({ ...packageData, type: type.id })}
              className={`w-full text-left border-2 rounded-lg p-4 transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{type.name}</span>
                    {type.recommended && (
                      <Badge variant="success" className="text-xs">Recommended</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{type.description}</p>
                  <p className="text-xs text-gray-600 mb-2">• Best for: {type.bestFor}</p>
                  <ul className="space-y-1 mb-2">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-blue-700 italic">{type.example}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900 font-medium">TIP</p>
            <p className="text-sm text-blue-800">
              Multi-visit packages are most popular with facilities because they increase customer 
              commitment and lifetime value while providing predictable revenue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => {
    const { savings, percentage } = calculateSavings();
    const { profit, margin } = calculateProfit();

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Package Details</h3>
          <p className="text-sm text-gray-600">
            Creating: {packageTypes.find(t => t.id === packageData.type)?.name}
          </p>
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">BASIC INFORMATION</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
            <Input
              value={packageData.name}
              onChange={(e) => setPackageData({ ...packageData, name: e.target.value })}
              placeholder="10-Day Boarding Pass"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Description (not shown to customers)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="2"
              value={packageData.internalDescription}
              onChange={(e) => setPackageData({ ...packageData, internalDescription: e.target.value })}
              placeholder="Standard boarding package for frequent customers. Good margin while providing value."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer-Facing Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={packageData.customerDescription}
              onChange={(e) => setPackageData({ ...packageData, customerDescription: e.target.value })}
              placeholder="Perfect for frequent travelers! Prepay for 10 days of boarding and save $50. Use anytime within 6 months. Includes daily playtime, feeding, and photos."
            />
          </div>
        </div>

        {/* What's Included */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">WHAT'S INCLUDED</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of visits/days included
            </label>
            <Input
              type="number"
              value={packageData.visits}
              onChange={(e) => setPackageData({ ...packageData, visits: parseInt(e.target.value) })}
              className="w-32"
            />
            <span className="text-sm text-gray-600 ml-2">days of boarding</span>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Included Add-ons (no extra charge):</p>
            <div className="space-y-2">
              <Checkbox label="Daily playtime (normally $10/day)" defaultChecked />
              <Checkbox label="Daily photo updates (normally $5/day)" defaultChecked />
              <Checkbox label="Feeding per schedule (always included)" defaultChecked />
              <Checkbox label="Medication administration" />
              <Checkbox label="Bath & brush on departure" />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-gray-900">PRICING</h4>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p className="text-gray-700">Regular price breakdown:</p>
            <p className="text-gray-600">{packageData.visits} nights × $50 = $500</p>
            <p className="text-gray-600">{packageData.visits} days playtime × $10 = ${packageData.visits * 10}</p>
            <p className="text-gray-600">{packageData.visits} days photos × $5 = ${packageData.visits * 5}</p>
            <div className="border-t border-gray-300 my-2"></div>
            <p className="font-semibold text-gray-900">Total regular value: ${packageData.regularPrice}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package Price</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">$</span>
              <Input
                type="number"
                value={packageData.packagePrice}
                onChange={(e) => setPackageData({ ...packageData, packagePrice: parseInt(e.target.value) })}
                className="w-32"
              />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-900">
                Customer savings: <strong>${savings} ({percentage}% off!)</strong>
                {percentage >= 15 && percentage <= 25 ? ' ✅ Great value' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-900">
                Your profit margin: <strong>${profit} ({margin}%)</strong>
                {margin >= 50 ? ' ✅ Healthy margin' : ''}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 Recommended discount: 15-25% for multi-visit packages
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Restrictions & Rules</h3>
        <p className="text-sm text-gray-600">Set validity periods and usage rules</p>
      </div>

      {/* Validity & Expiration */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">VALIDITY & EXPIRATION</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            How long is this package valid after purchase?
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="expiration"
                checked={packageData.expirationMonths > 0}
                onChange={() => setPackageData({ ...packageData, expirationMonths: 6 })}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Package expires after:</span>
              <Input
                type="number"
                value={packageData.expirationMonths}
                onChange={(e) => setPackageData({ ...packageData, expirationMonths: parseInt(e.target.value) })}
                className="w-20"
                disabled={packageData.expirationMonths === 0}
              />
              <span className="text-sm text-gray-700">months</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="expiration"
                checked={packageData.expirationMonths === 0}
                onChange={() => setPackageData({ ...packageData, expirationMonths: 0 })}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Package never expires (not recommended)</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Checkbox
            label="Send reminder email 30 days before expiration"
            checked={packageData.expirationReminders}
            onChange={(checked) => setPackageData({ ...packageData, expirationReminders: checked })}
          />
          <Checkbox label="Send final reminder 7 days before expiration" defaultChecked />
        </div>
      </div>

      {/* Booking Restrictions */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-900">BOOKING RESTRICTIONS</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Days of week:</p>
          <div className="grid grid-cols-2 gap-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <Checkbox key={day} label={day} defaultChecked={!day.includes('day')} />
            ))}
          </div>
        </div>

        <div>
          <Checkbox label="Blackout dates (holidays, peak times)" />
        </div>
      </div>

      {/* Eligibility */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-900">ELIGIBILITY</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Who can purchase this package?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="eligibility"
                value="anyone"
                checked={packageData.eligibility === 'anyone'}
                onChange={(e) => setPackageData({ ...packageData, eligibility: e.target.value })}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Anyone can purchase</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="eligibility" value="new" className="text-blue-600" />
              <span className="text-sm text-gray-700">New customers only (first-time discount)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="eligibility" value="existing" className="text-blue-600" />
              <span className="text-sm text-gray-700">Existing customers only (loyalty reward)</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Pet requirements:</p>
          <div className="space-y-2">
            <Checkbox
              label="Valid vaccination records required"
              checked={packageData.vaccinationRequired}
              onChange={(checked) => setPackageData({ ...packageData, vaccinationRequired: checked })}
            />
            <Checkbox label="Must pass behavioral assessment" />
          </div>
        </div>
      </div>

      {/* Transferability */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-900">TRANSFERABILITY</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Can this package be transferred or refunded?</p>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-700 mb-2">Transferable to another person:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transferable"
                    checked={packageData.transferable}
                    onChange={() => setPackageData({ ...packageData, transferable: true })}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Yes, customer can gift/transfer to anyone</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transferable"
                    checked={!packageData.transferable}
                    onChange={() => setPackageData({ ...packageData, transferable: false })}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">No, only purchaser can use</span>
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-700 mb-2">Refund policy:</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="refund"
                    value="full"
                    checked={packageData.refundPolicy === 'full'}
                    onChange={(e) => setPackageData({ ...packageData, refundPolicy: e.target.value })}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Full refund if unused (minus processing fee)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="refund" value="partial" className="text-blue-600" />
                  <span className="text-sm text-gray-700">Partial refund for unused portions</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="refund" value="none" className="text-blue-600" />
                  <span className="text-sm text-gray-700">No refunds under any circumstances</span>
                </label>
              </div>
            </div>

            {packageData.refundPolicy !== 'none' && (
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refund percentage
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={packageData.refundPercentage}
                      onChange={(e) => setPackageData({ ...packageData, refundPercentage: parseInt(e.target.value) })}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-700">% of unused balance</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Processing fee
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">$</span>
                    <Input
                      type="number"
                      value={packageData.refundFee}
                      onChange={(e) => setPackageData({ ...packageData, refundFee: parseInt(e.target.value) })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Availability & Sales Settings</h3>
        <p className="text-sm text-gray-600">Control when and how this package is sold</p>
      </div>

      {/* Availability */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">AVAILABILITY</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">When should this package be available for purchase?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="startSelling"
                value="immediately"
                checked={packageData.startSelling === 'immediately'}
                onChange={(e) => setPackageData({ ...packageData, startSelling: e.target.value })}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700">Immediately (as soon as package is created)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="startSelling" value="scheduled" className="text-blue-600" />
              <span className="text-sm text-gray-700">On specific date:</span>
              <Input type="date" className="w-40" />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Checkbox
            label="Show package on customer booking portal"
            checked={packageData.showOnPortal}
            onChange={(checked) => setPackageData({ ...packageData, showOnPortal: checked })}
          />
          <Checkbox
            label="Show package on website (if integration enabled)"
            checked={packageData.showOnWebsite}
            onChange={(checked) => setPackageData({ ...packageData, showOnWebsite: checked })}
          />
          <Checkbox
            label="Allow staff to sell at front desk"
            checked={packageData.allowStaffSale}
            onChange={(checked) => setPackageData({ ...packageData, allowStaffSale: checked })}
          />
        </div>
      </div>

      {/* Sales Channels */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-900">SALES CHANNELS</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Where can customers purchase this package?</p>
          <div className="space-y-2">
            <Checkbox label="Online (customer portal/website)" defaultChecked />
            <Checkbox label="In-person (staff sells at check-in/out)" defaultChecked />
            <Checkbox label="Over phone (staff creates during booking)" defaultChecked />
            <Checkbox label="Gift registry (for weddings, holidays)" />
          </div>
        </div>
      </div>

      {/* Promotions & Upsells */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-900">PROMOTIONS & UPSELLS</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Promotional settings:</p>
          <div className="space-y-2">
            <Checkbox
              label='Feature as "Recommended" in booking flow'
              checked={packageData.featured}
              onChange={(checked) => setPackageData({ ...packageData, featured: checked })}
            />
            <Checkbox
              label='Show "Most Popular" badge'
              checked={packageData.mostPopular}
              onChange={(checked) => setPackageData({ ...packageData, mostPopular: checked })}
            />
            <Checkbox
              label='Display "You Save $X!" savings callout'
              checked={packageData.showSavings}
              onChange={(checked) => setPackageData({ ...packageData, showSavings: checked })}
            />
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <Checkbox label="Enable flash sale pricing" />
          <div className="ml-6 mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sale price:</span>
              <span className="text-gray-600">$</span>
              <Input type="number" placeholder="399" className="w-24" disabled />
              <span className="text-sm text-gray-600">(normally ${packageData.packagePrice})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sale ends:</span>
              <Input type="date" className="w-40" disabled />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Auto-upsell triggers:</p>
          <div className="space-y-2">
            <Checkbox label="Suggest when customer books 3+ individual visits" defaultChecked />
            <Checkbox label="Offer at checkout" defaultChecked />
          </div>
        </div>
      </div>

      {/* Inventory & Capacity */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium text-gray-900">INVENTORY & CAPACITY</h4>
        
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Limit number of packages sold?</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="inventory" value="unlimited" defaultChecked className="text-blue-600" />
              <span className="text-sm text-gray-700">Unlimited - sell as many as demand allows</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="inventory" value="limited" className="text-blue-600" />
              <span className="text-sm text-gray-700">Limited to</span>
              <Input type="number" placeholder="50" className="w-20" disabled />
              <span className="text-sm text-gray-700">packages total</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => {
    const { savings, percentage } = calculateSavings();
    const selectedType = packageTypes.find(t => t.id === packageData.type);

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Review & Launch</h3>
          <p className="text-sm text-gray-600">Review your package and launch when ready</p>
        </div>

        {/* Package Summary */}
        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex items-start gap-3 mb-4">
            <Package className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="text-xl font-bold text-gray-900 mb-1">
                {packageData.name || 'Untitled Package'}
              </h4>
              <p className="text-sm text-gray-600">{selectedType?.name}</p>
            </div>
            {packageData.mostPopular && (
              <Badge variant="warning" className="flex-shrink-0">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            )}
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-2">WHAT'S INCLUDED:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• {packageData.visits} nights of standard boarding ($50/night)</li>
                <li>• Daily playtime (normally $10/day)</li>
                <li>• Daily photo updates (normally $5/day)</li>
                <li>• Feeding per schedule</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-1">PRICING:</p>
              <div className="space-y-1 text-gray-700">
                <p>Regular Value: ${packageData.regularPrice}</p>
                <p>Package Price: ${packageData.packagePrice}</p>
                <p className="text-green-700 font-medium">
                  Customer Saves: ${savings} ({percentage}% off)
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-1">VALIDITY:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Valid for {packageData.expirationMonths} months after purchase</li>
                <li>• Monday-Friday only</li>
                {packageData.expirationReminders && <li>• Reminder emails before expiration</li>}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-1">AVAILABILITY:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Available immediately</li>
                {packageData.showOnPortal && <li>• Shown on customer portal</li>}
                {packageData.showOnWebsite && <li>• Shown on website</li>}
                {packageData.mostPopular && <li>• Featured as "Most Popular"</li>}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-gray-900 mb-1">REFUND POLICY:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• {packageData.refundPercentage}% refund of unused balance</li>
                <li>• ${packageData.refundFee} processing fee applies</li>
                {packageData.transferable && <li>• Transferable to other customers</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Customer Preview */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">CUSTOMER PREVIEW</h4>
          <p className="text-sm text-gray-600 mb-3">How customers will see this package:</p>
          
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h5 className="font-bold text-gray-900">{packageData.name || 'Package Name'}</h5>
              </div>
              {packageData.mostPopular && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  MOST POPULAR
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-700 mb-4">
              {packageData.customerDescription || 'Package description will appear here'}
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span>{packageData.visits} nights of boarding</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span>Daily playtime included</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span>Daily photo updates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="w-4 h-4 text-green-600" />
                <span>Valid for {packageData.expirationMonths} months</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-gray-900">${packageData.packagePrice}</span>
              <span className="text-lg text-gray-400 line-through">${packageData.regularPrice}</span>
            </div>

            {packageData.showSavings && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-green-900">
                  💰 You Save ${savings}!
                </p>
              </div>
            )}

            <Button className="w-full">Purchase Package</Button>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">NEXT STEPS</h4>
          <p className="text-sm text-blue-800 mb-3">After creating this package:</p>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Package will be available for purchase immediately</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Customers can buy online or in-person</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>You can track sales and redemptions in analytics</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>System will handle expiration reminders automatically</span>
            </li>
          </ul>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Recommended next actions:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <Mail className="w-3 h-3 mr-1" />
                Generate Marketing Email
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Get Social Media Posts
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const steps = [
    { number: 1, title: 'Package Type', render: renderStep1 },
    { number: 2, title: 'Package Details', render: renderStep2 },
    { number: 3, title: 'Restrictions & Rules', render: renderStep3 },
    { number: 4, title: 'Availability & Sales', render: renderStep4 },
    { number: 5, title: 'Review & Launch', render: renderStep5 }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">Create Package</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep} of 5 - {steps[currentStep - 1].title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                currentStep >= step.number
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > step.number ? <Check className="w-4 h-4" /> : step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="mb-6">
          {steps[currentStep - 1].render()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep < 5 ? (
              <Button onClick={handleNext}>
                Next: {steps[currentStep]?.title}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleComplete()}>
                  Save as Draft
                </Button>
                <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                  🚀 Create & Launch Package
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PackageWizard;

