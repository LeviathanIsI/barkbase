/**
 * ============================================================================
 * BUSINESS INVOICES API
 * ============================================================================
 *
 * This module handles "Business Invoices" - invoices that the kennel business
 * creates to bill their customers (pet owners).
 *
 * Uses the core Invoice table in Postgres:
 *   - columns: id, tenant_id, booking_id, owner_id, invoice_number, status,
 *     subtotal_cents, tax_cents, discount_cents, total_cents, paid_cents,
 *     due_date, issued_at, sent_at, paid_at, notes, line_items, etc.
 *
 * Endpoint: /api/v1/financial/invoices
 *
 * NOTE: This is DIFFERENT from "Platform Billing Invoices" which are invoices
 * from BarkBase to the tenant (SaaS billing). Those are handled separately
 * in @/features/settings/api.js (useTenantBillingInvoicesQuery).
 * ============================================================================
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Check if tenant is ready for API calls
 * Queries should be disabled until tenantId is available
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

/**
 * Fetch BUSINESS invoices (tenant billing pet owners)
 *
 * Used by: Finance → Invoices page
 * NOT for: Settings → Billing (that's platform billing)
 *
 * Backend response shape (from financial-service /api/v1/financial/invoices):
 * {
 *   data: { invoices: [...] },
 *   invoices: [...],  // Compatibility
 *   total: number,
 * }
 *
 * Each invoice contains DB fields:
 *   id, invoiceNumber, status, amount, totalCents, subtotalCents, taxCents,
 *   discountCents, paidCents, dueDate, issuedAt, sentAt, paidAt, notes,
 *   lineItems, bookingId, ownerId, owner { firstName, lastName, email },
 *   createdAt, updatedAt
 */
export const useBusinessInvoicesQuery = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [tenantKey, 'invoices', filters],
    queryFn: async () => {
      try {
        const response = await apiClient.get(canonicalEndpoints.invoices.list, { params: filters });
        const root = response.data;

        // Normalize all known shapes into one
        // Backend returns: { data: { invoices: [...] }, invoices: [...], total: N }
        const invoices =
          root?.invoices ??
          root?.data?.invoices ??
          (Array.isArray(root?.data) ? root.data : []);

        const total = root?.total ?? invoices.length;

        return { invoices, total };
      } catch (e) {
        console.error('[useBusinessInvoicesQuery] Error fetching:', e?.message, e);
        return { invoices: [], total: 0 };
      }
    },
    enabled: isTenantReady,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * @deprecated Use useBusinessInvoicesQuery instead.
 * This alias exists for backward compatibility during migration.
 */
export const useInvoicesQuery = useBusinessInvoicesQuery;

/**
 * Get single business invoice by ID
 */
export const useInvoiceQuery = (invoiceId) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [tenantKey, 'invoices', invoiceId],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.invoices.detail(invoiceId));
      return response.data;
    },
    enabled: isTenantReady && !!invoiceId,
  });
};

/**
 * Create invoice
 */
export const useCreateInvoiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(canonicalEndpoints.invoices.list, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices'] });
    },
  });
};

/**
 * Generate invoice from booking (if endpoint exists)
 * NOTE: This endpoint may need to be added to financial-service
 */
export const useGenerateInvoiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (bookingId) => {
      // Use financial service for invoice generation
      const response = await apiClient.post(`/api/v1/financial/invoices/generate/${bookingId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices'] });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'bookings'] });
    },
  });
};

/**
 * Send invoice email
 */
export const useSendInvoiceEmailMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (invoiceId) => {
      const response = await apiClient.post(canonicalEndpoints.invoices.send(invoiceId));
      return response.data;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices', invoiceId] });
    },
  });
};

/**
 * Void invoice
 */
export const useVoidInvoiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (invoiceId) => {
      const response = await apiClient.post(canonicalEndpoints.invoices.void(invoiceId));
      return response.data;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices'] });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices', invoiceId] });
    },
  });
};

/**
 * Mark invoice as paid (update status)
 */
export const useMarkInvoicePaidMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ invoiceId, paymentCents }) => {
      // Update invoice status to PAID
      const response = await apiClient.patch(canonicalEndpoints.invoices.detail(invoiceId), {
        status: 'PAID',
        paidAmount: paymentCents ? paymentCents / 100 : undefined,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices'] });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'invoices', variables.invoiceId] });
    },
  });
};

