import { useEffect } from 'react';
import { useTenantStore } from '@/stores/tenant';

/**
 * Telemetry utility hook for tracking user interactions
 * In production, this would integrate with your analytics service (Segment, Posthog, etc.)
 */
export const useTelemetry = () => {
  const tenant = useTenantStore((state) => state.tenant);

  const track = (eventName, properties = {}) => {
    const event = {
      event: eventName,
      properties: {
        ...properties,
        tenantSlug: tenant?.slug,
        timestamp: new Date().toISOString(),
      },
    };

    // Log to console in development
    if (import.meta.env.DEV) {
    }

    // In production, send to your analytics service
    // Example: analytics.track(eventName, event.properties);
  };

  return { track };
};

/**
 * Hook to track page views automatically on mount
 */
export const usePageView = (pageName, additionalProperties = {}) => {
  const { track } = useTelemetry();

  useEffect(() => {
    track('ui.page_view', {
      page: pageName,
      ...additionalProperties,
    });
  }, [pageName]);
};

/**
 * Hook to track CTA clicks
 */
export const useCTATracking = (pageName) => {
  const { track } = useTelemetry();

  return (ctaName) => {
    track('ui.cta_click', {
      page: pageName,
      cta: ctaName,
    });
  };
};

/**
 * Hook to track navigation bucket toggles
 */
export const useNavBucketTracking = () => {
  const { track } = useTelemetry();

  return (bucketName, isOpen) => {
    track('ui.nav_bucket_toggle', {
      bucket: bucketName,
      state: isOpen ? 'open' : 'close',
    });
  };
};
