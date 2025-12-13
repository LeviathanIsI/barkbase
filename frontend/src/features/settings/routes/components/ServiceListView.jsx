import { Edit, MoreVertical, TrendingUp, Star, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

// Safe currency formatter that handles null/undefined
const safeFormatCurrency = (value) => {
  if (value == null || isNaN(Number(value))) return '—';
  return `$${Number(value).toFixed(2)}`;
};

const ServiceListView = ({ services, category, onEdit }) => {
  const getCategoryIcon = (cat) => {
    switch (cat.toLowerCase()) {
      case 'boarding':
        return '🏨';
      case 'daycare':
        return '🎾';
      case 'grooming':
        return '✂️';
      case 'training':
        return '🎯';
      case 'add-ons':
        return '⭐';
      case 'memberships':
        return '🌟';
      default:
        return '🏨';
    }
  };

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600 dark:text-text-secondary';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp className="w-3 h-3" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Services by Category */}
      {services.map((service) => (
        <div key={service.recordId} className="border border-gray-200 dark:border-surface-border rounded-lg overflow-hidden">
          {/* Service Header */}
          <div className="bg-gray-50 dark:bg-surface-secondary px-6 py-4 border-b border-gray-200 dark:border-surface-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCategoryIcon(service.category)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">{service.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{service.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(service)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pricing Information */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Pricing</h4>
                <div className="space-y-2">
                  {service.flatRate ? (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-text-secondary">Base Price:</span>
                      <span className="text-sm font-medium">{safeFormatCurrency(service.basePrice)} {service.unit || ''}</span>
                    </div>
                  ) : service.sizePricing ? (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary mb-1">Size-Based Pricing:</div>
                      <div className="space-y-1 text-sm">
                        {Object.entries(service.sizePricing).map(([size, price]) => (
                          <div key={size} className="flex justify-between">
                            <span className="capitalize text-gray-600 dark:text-text-secondary">{size}:</span>
                            <span className="font-medium">{safeFormatCurrency(price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-text-secondary">Base Price:</span>
                      <span className="text-sm font-medium">{safeFormatCurrency(service.basePrice)} {service.unit || ''}</span>
                    </div>
                  )}

                  {/* Discounts */}
                  {service.discounts && service.discounts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border">
                      <div className="text-sm text-gray-600 dark:text-text-secondary mb-1">Discounts:</div>
                      <div className="space-y-1 text-sm">
                        {service.discounts.map((discount, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-600 dark:text-text-secondary">{discount.nights}+ nights:</span>
                            <span className="font-medium text-green-600">-{discount.discount}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Packages */}
                  {service.packages && service.packages.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border">
                      <div className="text-sm text-gray-600 dark:text-text-secondary mb-1">Package Pricing:</div>
                      <div className="space-y-1 text-sm">
                        {service.packages.map((pkg, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-gray-600 dark:text-text-secondary">{pkg.name}:</span>
                            <span className="font-medium">{safeFormatCurrency(pkg.price)} (save {safeFormatCurrency(pkg.savings)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unlimited Membership */}
                  {service.unlimitedMembership && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-surface-border">
                      <div className="text-sm text-gray-600 dark:text-text-secondary mb-1">Unlimited Membership:</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-text-secondary">Monthly:</span>
                        <span className="font-medium">{safeFormatCurrency(service.unlimitedMembership.monthlyPrice)} (avg {service.unlimitedMembership.avgVisits || 0} visits)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-text-secondary">Bookings this month:</span>
                    <span className="text-sm font-medium">{service.bookingsThisMonth ?? 0}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-text-secondary">Revenue this month:</span>
                    <span className="text-sm font-medium">{safeFormatCurrency(service.revenueThisMonth)}</span>
                  </div>

                  {service.avgStay && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-text-secondary">Avg stay:</span>
                      <span className="text-sm font-medium">{service.avgStay} nights</span>
                    </div>
                  )}

                  {service.rating && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-text-secondary">Rating:</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{service.rating}/5.0</span>
                      </div>
                    </div>
                  )}

                  {service.growth && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-text-secondary">vs last month:</span>
                      <div className={`flex items-center gap-1 text-sm font-medium ${getGrowthColor(service.growth)}`}>
                        {getGrowthIcon(service.growth)}
                        {service.growth > 0 ? '+' : ''}{service.growth}%
                      </div>
                    </div>
                  )}

                  {service.isMostPopular && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">MOST POPULAR SERVICE</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-surface-border">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Amenities/Included */}
                {service.amenities && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-text-primary mb-2">Included Amenities:</h5>
                    <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-1">
                      {service.amenities.map((amenity, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-50 dark:bg-green-950/20 rounded-full"></span>
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Add-ons Available */}
                {service.addOns && service.addOns.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-text-primary mb-2">Add-ons Available:</h5>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">{service.addOns.join(', ')}</p>
                  </div>
                )}

                {/* Multi-pet discount */}
                {service.multiPetDiscount && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-text-primary mb-2">Multi-Pet Discount:</h5>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">
                      {service.multiPetDiscount.discount}{service.multiPetDiscount.unit === 'per additional pet' ? '% off per additional pet' : '% off'}
                    </p>
                  </div>
                )}

                {/* Duration */}
                {service.duration && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 dark:text-text-primary mb-2">Duration:</h5>
                    <p className="text-sm text-gray-600 dark:text-text-secondary">{service.duration}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Show More */}
      {services.length >= 8 && (
        <div className="text-center py-4">
          <Button variant="outline">
            Show 3 More Services
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServiceListView;
