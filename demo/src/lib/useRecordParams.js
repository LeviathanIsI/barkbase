/**
 * useRecordParams - Hook to extract record ID from URL params
 *
 * Supports both old and new URL patterns:
 * - Old: /pets/:petId - uses petId directly
 * - New: /pets/:accountCode/record/:typeCode/:recordId - uses recordId
 *
 * This allows gradual migration to the new URL pattern while maintaining
 * backward compatibility with existing links and bookmarks.
 */

import { useParams } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Extract record ID from URL params supporting both old and new patterns
 *
 * @param {string} legacyParamName - The old param name (e.g., 'petId', 'ownerId')
 * @returns {object} Object containing id, accountCode, typeCode, and isNewFormat
 */
export function useRecordParams(legacyParamName) {
  const params = useParams();

  return useMemo(() => {
    // Check if we're using the new URL pattern
    const isNewFormat = Boolean(params.accountCode && params.typeCode && params.recordId);

    if (isNewFormat) {
      return {
        id: params.recordId,
        accountCode: params.accountCode,
        typeCode: parseInt(params.typeCode, 10),
        isNewFormat: true,
      };
    }

    // Fall back to legacy param
    const legacyId = params[legacyParamName] || params.id;
    return {
      id: legacyId,
      accountCode: null,
      typeCode: null,
      isNewFormat: false,
    };
  }, [params, legacyParamName]);
}

/**
 * Hook for pet detail pages
 * Extracts pet ID from either /pets/:petId or /pets/:accountCode/record/:typeCode/:recordId
 */
export function usePetParams() {
  return useRecordParams('petId');
}

/**
 * Hook for owner detail pages
 * Extracts owner ID from either /owners/:ownerId or /owners/:accountCode/record/:typeCode/:recordId
 */
export function useOwnerParams() {
  return useRecordParams('ownerId');
}

/**
 * Hook for booking detail pages
 * Extracts booking ID from either /bookings/:bookingId or /bookings/:accountCode/record/:typeCode/:recordId
 */
export function useBookingParams() {
  return useRecordParams('bookingId');
}

/**
 * Hook for customer detail pages (same as owner but different route)
 * Extracts owner ID from either /customers/:ownerId or /customers/:accountCode/record/:typeCode/:recordId
 */
export function useCustomerParams() {
  return useRecordParams('ownerId');
}

export default useRecordParams;
