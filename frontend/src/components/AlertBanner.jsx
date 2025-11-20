import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Clock, Heart, Shield, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * AlertBanner Component
 * Displays urgent notifications at the top of the application
 * Addresses research finding: "urgent information (expired vaccinations) buried"
 */
const AlertBanner = () => {
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    // Persist dismissed alerts for the session
    const stored = sessionStorage.getItem('dismissedAlerts');
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch urgent alerts from backend
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', 'urgent'],
    queryFn: async () => {
      try {
        // These would come from the backend in production
        // For now, let's simulate with local data
        const mockAlerts = [];

        // Check for expired vaccinations
        const petsResponse = await apiClient.get('/api/v1/pets');
        const pets = Array.isArray(petsResponse) ? petsResponse : petsResponse?.data || [];

        pets.forEach(pet => {
          if (pet.hasExpiringVaccinations) {
            const daysUntilExpiry = pet.vaccinationExpiryDays || 0;
            if (daysUntilExpiry <= 0) {
              mockAlerts.push({
                id: `vacc-expired-${pet.id}`,
                type: 'critical',
                icon: 'shield',
                message: `${pet.name} has EXPIRED vaccinations`,
                action: { label: 'Update Now', href: `/pets/${pet.id}?tab=vaccinations` },
                priority: 1
              });
            } else if (daysUntilExpiry <= 7) {
              mockAlerts.push({
                id: `vacc-expiring-${pet.id}`,
                type: 'warning',
                icon: 'clock',
                message: `${pet.name}'s vaccinations expire in ${daysUntilExpiry} days`,
                action: { label: 'View', href: `/pets/${pet.id}?tab=vaccinations` },
                priority: 2
              });
            }
          }

          // Medical alerts
          if (pet.hasMedicalAlerts) {
            mockAlerts.push({
              id: `medical-${pet.id}`,
              type: 'warning',
              icon: 'heart',
              message: `${pet.name} requires medication at scheduled times`,
              action: { label: 'View Schedule', href: `/pets/${pet.id}` },
              priority: 3
            });
          }
        });

        // Check for overdue payments
        try {
          const invoicesResponse = await apiClient.get('/api/v1/invoices?status=overdue');
          const overdueInvoices = Array.isArray(invoicesResponse) ? invoicesResponse : invoicesResponse?.data || [];

          if (overdueInvoices.length > 0) {
            const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
            mockAlerts.push({
              id: 'payments-overdue',
              type: 'warning',
              icon: 'dollar',
              message: `${overdueInvoices.length} overdue payments totaling $${totalOverdue.toFixed(2)}`,
              action: { label: 'View Invoices', href: '/payments?filter=overdue' },
              priority: 4
            });
          }
        } catch (err) {
          // Silently handle if invoices endpoint doesn't exist yet
        }

        // Sort by priority (lower number = higher priority)
        return mockAlerts.sort((a, b) => a.priority - b.priority);
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
        return [];
      }
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  // Auto-dismiss info alerts after 10 seconds
  useEffect(() => {
    const infoAlerts = visibleAlerts.filter(a => a.type === 'info');
    if (infoAlerts.length > 0) {
      const timer = setTimeout(() => {
        const newDismissed = [...dismissedAlerts, ...infoAlerts.map(a => a.id)];
        setDismissedAlerts(newDismissed);
        sessionStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [visibleAlerts, dismissedAlerts]);

  const handleDismiss = (alertId) => {
    const newDismissed = [...dismissedAlerts, alertId];
    setDismissedAlerts(newDismissed);
    sessionStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
  };

  const getAlertStyles = (type) => {
    switch (type) {
      case 'critical':
        return 'bg-red-600 text-white border-red-700';
      case 'warning':
        return 'bg-orange-500 text-white border-orange-600';
      case 'info':
        return 'bg-blue-500 text-white border-blue-600';
      case 'success':
        return 'bg-green-500 text-white border-green-600';
      default:
        return 'bg-gray-600 text-white border-gray-700';
    }
  };

  const getIcon = (iconType) => {
    switch (iconType) {
      case 'shield':
        return <Shield className="w-5 h-5" />;
      case 'clock':
        return <Clock className="w-5 h-5" />;
      case 'heart':
        return <Heart className="w-5 h-5" />;
      case 'dollar':
        return <DollarSign className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  if (isLoading || visibleAlerts.length === 0) {
    return null;
  }

  // Show only the highest priority alert on mobile, all on desktop
  const isMobile = window.innerWidth < 768;
  const alertsToShow = isMobile ? visibleAlerts.slice(0, 1) : visibleAlerts;

  return (
    <div className="relative z-50">
      {alertsToShow.map((alert, index) => (
        <div
          key={alert.id}
          className={`${getAlertStyles(alert.type)} border-b px-4 py-3 ${
            index > 0 ? 'border-t' : ''
          }`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getIcon(alert.icon)}
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-sm md:text-base">
                  {alert.message}
                </span>
                {alert.action && (
                  <a
                    href={alert.action.href}
                    className="inline-flex items-center px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-xs md:text-sm font-medium"
                  >
                    {alert.action.label}
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="ml-4 flex-shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Mobile indicator for more alerts */}
      {isMobile && visibleAlerts.length > 1 && (
        <div className="bg-gray-800 text-white text-center py-1 text-xs">
          +{visibleAlerts.length - 1} more alerts
        </div>
      )}
    </div>
  );
};

export default AlertBanner;