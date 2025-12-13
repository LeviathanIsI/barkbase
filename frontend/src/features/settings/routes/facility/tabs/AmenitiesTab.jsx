import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useTenantStore } from '@/stores/tenant';

export default function AmenitiesTab() {
  const navigate = useNavigate();
  const tenant = useTenantStore((state) => state.tenant);

  const [standardFeatures, setStandardFeatures] = useState(
    tenant?.settings?.facility?.amenities?.standard || [
      { id: 'indoor_climate_controlled', label: 'Indoor climate-controlled space', checked: true },
      { id: 'outdoor_play_shared', label: 'Outdoor play access (shared)', checked: true },
      { id: 'webcam_access', label: 'Webcam access', checked: false },
      { id: 'private_outdoor_run', label: 'Private outdoor run', checked: false },
      { id: 'raised_bed', label: 'Raised bed', checked: false },
      { id: 'tv_calming', label: 'TV with calming content', checked: false },
      { id: 'heated_floors', label: 'Heated floors', checked: false },
      { id: 'luxury_bedding', label: 'Luxury bedding', checked: false },
    ]
  );

  const [premiumFeatures, setPremiumFeatures] = useState(
    tenant?.settings?.facility?.amenities?.premium || [
      { id: 'indoor_climate_controlled', label: 'Indoor climate-controlled space', checked: true },
      { id: 'outdoor_play_shared', label: 'Outdoor play access (shared)', checked: true },
      { id: 'webcam_access', label: 'Webcam access', checked: true },
      { id: 'private_outdoor_run', label: 'Private outdoor run', checked: true },
      { id: 'raised_bed_ortho', label: 'Raised orthopedic bed', checked: true },
      { id: 'tv_calming', label: 'TV with calming content', checked: true },
      { id: 'heated_floors', label: 'Heated floors', checked: false },
      { id: 'luxury_bedding', label: 'Luxury bedding', checked: true },
      { id: 'extra_playtime', label: 'Extra playtime included', checked: true },
    ]
  );

  const [daycareFeatures, setDaycareFeatures] = useState(
    tenant?.settings?.facility?.amenities?.daycare || [
      { id: 'climate_controlled_areas', label: 'Climate-controlled play areas', checked: true },
      { id: 'multiple_play_sessions', label: 'Multiple play sessions', checked: true },
      { id: 'rest_periods', label: 'Rest periods', checked: true },
      { id: 'photo_updates', label: 'Photo updates', checked: true },
      { id: 'webcam_access', label: 'Webcam access', checked: false },
      { id: 'training_games', label: 'Training games', checked: false },
      { id: 'swimming_pool', label: 'Swimming pool access', checked: false },
    ]
  );

  const [addonServices, setAddonServices] = useState(
    tenant?.settings?.facility?.amenities?.addons || [
      { id: 'bath_brush', label: 'Bath & Brush', price: 35, checked: true },
      { id: 'nail_trim', label: 'Nail Trim', price: 15, checked: true },
      { id: 'extra_playtime', label: 'Extra Playtime', price: 20, checked: true },
      { id: 'birthday_party', label: 'Birthday Party Package', price: 50, checked: true },
      { id: 'training_session', label: 'Training Session', price: 40, checked: false },
      { id: 'grooming_package', label: 'Grooming Package', price: 75, checked: false },
    ]
  );

  const handleFeatureToggle = (features, setFeatures, id) => {
    setFeatures(prev =>
      prev.map(feature =>
        feature.id === id ? { ...feature, checked: !feature.checked } : feature
      )
    );
  };

  const handleAddonToggle = (id) => {
    setAddonServices(prev =>
      prev.map(addon =>
        addon.id === id ? { ...addon, checked: !addon.checked } : addon
      )
    );
  };

  const handleAddonPriceChange = (id, price) => {
    setAddonServices(prev =>
      prev.map(addon =>
        addon.id === id ? { ...addon, price: parseInt(price) || 0 } : addon
      )
    );
  };

  return (
    <div className="space-y-6">
      <Card
        title="Standard Accommodation Features"
        description="What's included in your Standard accommodations (Kennels)?"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {standardFeatures.map((feature) => (
            <label key={feature.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={feature.checked}
                onChange={() => handleFeatureToggle(standardFeatures, setStandardFeatures, feature.id)}
                className="rounded border-border"
              />
              <span className="text-sm">{feature.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-text-secondary mt-3">
          These are shown to customers during booking.
        </p>
      </Card>

      <Card
        title="Premium Accommodation Features"
        description="What's included in Premium accommodations (Suites)?"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {premiumFeatures.map((feature) => (
            <label key={feature.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={feature.checked}
                onChange={() => handleFeatureToggle(premiumFeatures, setPremiumFeatures, feature.id)}
                className="rounded border-border"
              />
              <span className="text-sm">{feature.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-text-secondary mt-3">
          These premium features are highlighted to customers.
        </p>
      </Card>

      <Card
        title="Daycare Features"
        description="What's included in Daycare?"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {daycareFeatures.map((feature) => (
            <label key={feature.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={feature.checked}
                onChange={() => handleFeatureToggle(daycareFeatures, setDaycareFeatures, feature.id)}
                className="rounded border-border"
              />
              <span className="text-sm">{feature.label}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-text-secondary mt-3">
          Daycare-specific amenities and activities.
        </p>
      </Card>

      <Card
        title="Add-On Services"
        description="Additional services available during booking."
        actions={
          <Button variant="outline" onClick={() => navigate('/settings/services')}>
            Manage Pricing →
          </Button>
        }
      >
        <div className="space-y-3">
          {addonServices.map((addon) => (
            <div key={addon.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-surface-border rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={addon.checked}
                  onChange={() => handleAddonToggle(addon.id)}
                  className="rounded border-border"
                />
                <span className="text-sm">{addon.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-text-secondary">$</span>
                <input
                  type="number"
                  value={addon.price}
                  onChange={(e) => handleAddonPriceChange(addon.id, e.target.value)}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-surface-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-text-secondary mt-3">
          Add-on services are shown during the booking process and can be selected by customers.
        </p>
      </Card>
    </div>
  );
}
