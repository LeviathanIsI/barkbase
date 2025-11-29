import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Clock, Heart, Shield, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';

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
      const allAlerts = [];

      try {
        // Fetch expiring vaccinations from dedicated endpoint
        const vaccinationsResponse = await apiClient.get(canonicalEndpoints.pets.expiringVaccinations);
        const vaccinations = Array.isArray(vaccinationsResponse) ? vaccinationsResponse : vaccinationsResponse?.data || [];

        vaccinations.forEach(vaccination => {
          const daysUntilExpiry = vaccination.daysUntilExpiry || 0;
          const petId = vaccination.petId || vaccination.pet_id;
          const petName = vaccination.petName || vaccination.pet_name || 'Unknown Pet';

          if (daysUntilExpiry <= 0) {
            allAlerts.push({
              id: `vacc-expired-${petId}-${vaccination.id}`,
              type: 'critical',
              icon: 'shield',
              message: `${petName} has EXPIRED ${vaccination.vaccinationType || 'vaccination'}`,
              action: { label: 'Update Now', href: `/pets/${petId}?tab=vaccinations` },
              priority: 1
            });
          } else if (daysUntilExpiry <= 7) {
            allAlerts.push({
              id: `vacc-expiring-${petId}-${vaccination.id}`,
              type: 'warning',
              icon: 'clock',
              message: `${petName}'s ${vaccination.vaccinationType || 'vaccination'} expires in ${daysUntilExpiry} days`,
              action: { label: 'View', href: `/pets/${petId}?tab=vaccinations` },
              priority: 2
            });
          }
        });
      } catch (error) {
        console.error('Failed to fetch vaccination alerts:', error);
      }

      try {
        // Fetch medical alerts from database
        const medicalAlertsResponse = await apiClient.get(canonicalEndpoints.pets.medicalAlerts);
        const medicalAlerts = Array.isArray(medicalAlertsResponse) ? medicalAlertsResponse : medicalAlertsResponse?.data || [];

        medicalAlerts.forEach(alert => {
          const petId = alert.petId || alert.pet_id;
          const petName = alert.petName || alert.pet_name || 'Unknown Pet';

          allAlerts.push({
            id: `medical-${petId}-${alert.id}`,
            type: alert.severity === 'critical' ? 'critical' : 'warning',
            icon: 'heart',
            message: alert.message || `${petName} requires medication at scheduled times`,
            action: { label: 'View Schedule', href: `/pets/${petId}` },
            priority: alert.severity === 'critical' ? 1 : 3
          });
        });
      } catch (error) {
        console.error('Failed to fetch medical alerts:', error);
      }

      try {
        // Fetch PENDING payments and filter for overdue ones client-side
        // Note: "overdue" is not a valid PaymentStatus enum - it's calculated from dueDate
        const paymentsResponse = await apiClient.get(canonicalEndpoints.payments.list, { params: { status: 'PENDING' } });
        const allPendingPayments = Array.isArray(paymentsResponse) ? paymentsResponse : paymentsResponse?.data || [];

        // Filter for overdue payments (past due date)
        const now = new Date();
        const overduePayments = allPendingPayments.filter(payment => {
          if (!payment.dueDate) return false;
          const dueDate = new Date(payment.dueDate);
          return dueDate < now;
        });

        if (overduePayments.length > 0) {
          const totalOverdue = overduePayments.reduce((sum, payment) => {
            // Payment amount might be in cents or dollars - handle both
            const amount = payment.amountCents
              ? payment.amountCents / 100
              : parseFloat(payment.amount || payment.total || 0);
            return sum + amount;
          }, 0);

          allAlerts.push({
            id: 'payments-overdue',
            type: 'warning',
            icon: 'dollar',
            message: `${overduePayments.length} overdue payments totaling $${totalOverdue.toFixed(2)}`,
            action: { label: 'View Payments', href: '/payments?filter=overdue' },
            priority: 4
          });
        }
      } catch (error) {
        // Silently handle if payments endpoint doesn't exist or returns error
        console.error('Failed to fetch payment alerts:', error);
      }

      // Sort by priority (lower number = higher priority)
      return allAlerts.sort((a, b) => a.priority - b.priority);
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
    // Using token-based colors for consistent theming
    switch (type) {
      case 'critical':
        return 'bg-[var(--bb-color-status-negative)] text-white border-[var(--bb-color-status-negative)]';
      case 'warning':
        return 'bg-[var(--bb-color-status-warning)] text-white border-[var(--bb-color-status-warning)]';
      case 'info':
        return 'bg-[var(--bb-color-status-info)] text-white border-[var(--bb-color-status-info)]';
      case 'success':
        return 'bg-[var(--bb-color-status-positive)] text-white border-[var(--bb-color-status-positive)]';
      default:
        return 'bg-[var(--bb-color-text-muted)] text-white border-[var(--bb-color-text-muted)]';
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
        <div className="bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)] text-center py-[var(--bb-space-1)] text-[var(--bb-font-size-xs)]">
          +{visibleAlerts.length - 1} more alerts
        </div>
      )}
    </div>
  );
};

export default AlertBanner;