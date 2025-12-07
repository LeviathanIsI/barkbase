import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Payments from '../Payments';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import '@testing-library/jest-dom';

vi.mock('@/features/payments/api', () => ({
  usePaymentsQuery: vi.fn(() => ({
    data: { items: [], payments: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
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

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPayments = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Payments />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Payments route', () => {
  beforeEach(() => {
    useTenantStore.setState((state) => ({
      ...state,
      tenant: {
        ...state.tenant,
        id: 'tenant-1',
        slug: 'test-tenant',
        name: 'Test Tenant',
        plan: 'PRO',
        featureFlags: {},
      },
      initialized: true,
    }));
    useAuthStore.setState((state) => ({
      ...state,
      role: 'OWNER',
      accessToken: 'test-token',
    }));
  });

  it('renders the payments page with header and subtitle', () => {
    renderPayments();

    // Use more specific queries to find the header
    const heading = screen.getByRole('heading', { name: 'Payments' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Financial command center')).toBeInTheDocument();
  });

  it('shows KPI tiles for revenue metrics', () => {
    renderPayments();

    expect(screen.getByText('Revenue Collected')).toBeInTheDocument();
    expect(screen.getByText('Pending / Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('shows empty state when no transactions exist', () => {
    renderPayments();

    expect(screen.getByText('No transactions yet')).toBeInTheDocument();
    expect(screen.getByText('Transactions will appear here once payments are processed')).toBeInTheDocument();
  });

  it('renders navigation tabs', () => {
    renderPayments();

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Outstanding')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
