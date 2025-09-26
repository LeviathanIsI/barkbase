import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import Payments from '../Payments';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import '@testing-library/jest-dom';

vi.mock('@/features/payments/api', () => ({
  usePaymentsQuery: vi.fn(() => ({
    data: { items: [], meta: null },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  })),
  usePaymentSummaryQuery: vi.fn(() => ({
    data: { byStatus: [], totalCapturedCents: 0 },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

describe('Payments route', () => {
  beforeEach(() => {
    useTenantStore.setState((state) => ({
      ...state,
      tenant: {
        ...state.tenant,
        plan: 'FREE',
        features: {
          billingPortal: false,
          auditLog: false,
          advancedReports: false,
        },
        featureFlags: {},
      },
    }));
    useAuthStore.setState((state) => ({
      ...state,
      role: 'STAFF',
    }));
  });

  it('prompts upgrade when payments feature is locked', () => {
    render(
      <MemoryRouter>
        <Payments />
      </MemoryRouter>,
    );

    expect(screen.getByText(/upgrade to pro/i)).toBeInTheDocument();
    expect(screen.getByText(/payments & deposits/i)).toBeInTheDocument();
    expect(screen.queryByText(/Captured Revenue/)).not.toBeInTheDocument();
  });
});
