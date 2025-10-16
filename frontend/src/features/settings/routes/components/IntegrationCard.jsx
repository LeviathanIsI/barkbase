import { Star, CheckCircle, Settings, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';

const IntegrationCard = ({ integration, onConnect, onManage }) => {
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getStatusBadge = () => {
    if (integration.status === 'connected') {
      return (
        <div className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Connected
        </div>
      );
    }
    return null;
  };

  const getRecommendationBadge = () => {
    if (integration.highlyRecommended) {
      return (
        <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
          🔥 HIGHLY RECOMMENDED
        </div>
      );
    }
    if (integration.popular) {
      return (
        <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
          ⭐ MOST POPULAR
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl">
            {integration.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                {renderStars(integration.rating)}
                <span className="text-xs text-gray-600 ml-1">{integration.rating}</span>
              </div>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-600">{integration.userCount?.toLocaleString()} facilities</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getRecommendationBadge()}
          {getStatusBadge()}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4">{integration.description}</p>

      {/* Connected Status Info */}
      {integration.status === 'connected' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="text-sm text-green-800">
            <div>Connected: {integration.connectedDate}</div>
            {integration.monthlyVolume && (
              <div>This month: {integration.monthlyVolume} processed • {integration.monthlyTransactions} transactions</div>
            )}
          </div>
        </div>
      )}

      {/* Features */}
      {integration.features && integration.features.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">What syncs:</h4>
          <ul className="space-y-1">
            {integration.features.slice(0, 4).map((feature, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="text-green-500">✓</span>
                {feature.replace('✓ ', '')}
              </li>
            ))}
            {integration.features.length > 4 && (
              <li className="text-sm text-gray-500">
                +{integration.features.length - 4} more features...
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Competitive Advantage */}
      {integration.competitiveAdvantage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h4 className="text-sm font-medium text-blue-900 mb-1">Why it's better than competitors:</h4>
          <p className="text-sm text-blue-800">{integration.competitiveAdvantage}</p>
        </div>
      )}

      {/* Time Savings */}
      {integration.timeSavings && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-green-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Time saved: {integration.timeSavings}</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            (Eliminates "calling veterinarians to verify records")
          </p>
        </div>
      )}

      {/* Pricing */}
      {integration.pricing && (
        <div className="text-sm text-gray-600 mb-4">
          Pricing: {integration.pricing}
        </div>
      )}

      {/* Testimonial */}
      {integration.testimonial && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700 italic">"{integration.testimonial}"</p>
        </div>
      )}

      {/* Notifications Preview */}
      {integration.notifications && integration.notifications.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Notifications for:</h4>
          <div className="flex flex-wrap gap-1">
            {integration.notifications.map((notification, index) => (
              <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {notification.replace('✓ ', '')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-between items-center">
        {integration.status === 'connected' ? (
          <Button onClick={() => onManage(integration)} variant="outline" className="flex-1">
            <Settings className="w-4 h-4 mr-2" />
            Manage
          </Button>
        ) : (
          <Button onClick={() => onConnect(integration)} className="flex-1">
            Connect
          </Button>
        )}
      </div>
    </div>
  );
};

export default IntegrationCard;
