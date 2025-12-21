/**
 * useRecordNavigation - Hook for navigating to records with new ID system
 *
 * This hook provides navigation utilities that work with the BarkBase ID system:
 * - Uses account_code (BK-XXXXXX) in URLs for tenant identification
 * - Uses record_id (sequential number) for human-readable record references
 *
 * Usage:
 * const { navigateToRecord, getRecordPath } = useRecordNavigation();
 * navigateToRecord('/pets', 'pet', pet.recordId);
 * const path = getRecordPath('/owners', 'owner', owner.recordId);
 */

import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { buildRecordUrl, getDisplayId, formatRecordId } from './urlBuilder';

/**
 * Hook for record navigation with new ID system
 */
export function useRecordNavigation() {
  const navigate = useNavigate();

  /**
   * Navigate to a record detail page
   *
   * @param {string} resourcePath - Base resource path (e.g., "/pets", "/owners")
   * @param {string} entityType - Entity type for type code lookup
   * @param {number|string} recordId - The sequential record_id (NOT UUID)
   * @param {object} options - Navigation options (replace, state)
   */
  const navigateToRecord = useCallback(
    (resourcePath, entityType, recordId, options = {}) => {
      const path = buildRecordUrl(resourcePath, entityType, recordId);
      navigate(path, options);
    },
    [navigate]
  );

  /**
   * Get a record path without navigating
   * Useful for generating links
   *
   * @param {string} resourcePath - Base resource path
   * @param {string} entityType - Entity type
   * @param {number|string} recordId - The sequential record_id
   * @returns {string} URL path
   */
  const getRecordPath = useCallback((resourcePath, entityType, recordId) => {
    return buildRecordUrl(resourcePath, entityType, recordId);
  }, []);

  /**
   * Navigate to a pet detail page
   * Convenience method for pet records
   *
   * @param {object} pet - Pet record object
   */
  const navigateToPet = useCallback(
    (pet) => {
      const id = pet?.recordId ?? pet?.id;
      if (!id) {
        console.warn('[useRecordNavigation] No id found for pet:', pet);
        return;
      }
      navigateToRecord('/pets', 'pet', id);
    },
    [navigateToRecord]
  );

  /**
   * Navigate to an owner detail page
   * Convenience method for owner records
   *
   * @param {object} owner - Owner record object
   */
  const navigateToOwner = useCallback(
    (owner) => {
      const id = owner?.recordId ?? owner?.id;
      if (!id) {
        console.warn('[useRecordNavigation] No id found for owner:', owner);
        return;
      }
      navigateToRecord('/customers', 'owner', id);
    },
    [navigateToRecord]
  );

  /**
   * Navigate to a booking detail page
   * Convenience method for booking records
   *
   * @param {object} booking - Booking record object
   */
  const navigateToBooking = useCallback(
    (booking) => {
      const id = booking?.recordId ?? booking?.id;
      if (!id) {
        console.warn('[useRecordNavigation] No id found for booking:', booking);
        return;
      }
      navigateToRecord('/bookings', 'booking', id);
    },
    [navigateToRecord]
  );

  return {
    navigateToRecord,
    getRecordPath,
    navigateToPet,
    navigateToOwner,
    navigateToBooking,
    // Re-export utilities for convenience
    getDisplayId,
    formatRecordId,
  };
}

export default useRecordNavigation;
