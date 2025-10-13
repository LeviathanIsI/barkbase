import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecordDetailsView from './RecordDetailsView';

vi.mock('idb', () => {
  const transaction = () => ({
    store: {
      getAll: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    },
    done: Promise.resolve(),
  });

  return {
    openDB: vi.fn().mockResolvedValue({
      add: vi.fn().mockResolvedValue(),
      transaction,
    }),
  };
});

vi.mock('@/lib/apiClient', () => ({
  apiClient: vi.fn().mockResolvedValue({}),
}));

const ownerFixture = {
  id: 'owner_1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0101',
  status: 'active',
  pets: [],
  bookings: [],
  payments: [],
};

const renderWithQuery = (ui) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
};

describe('RecordDetailsView', () => {
  it('renders owner summary when provided with owner data', () => {
    renderWithQuery(
      <RecordDetailsView
        objectType="owner"
        data={ownerFixture}
        fetchOnMount={false}
        summaryTitle="Owner Summary"
      />,
    );

    expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
    expect(screen.getAllByText('jane@example.com')[0]).toBeInTheDocument();
    expect(screen.getByText('Owner Summary')).toBeInTheDocument();
  });

  it('renders tab content', () => {
    renderWithQuery(
      <RecordDetailsView
        objectType="owner"
        data={ownerFixture}
        fetchOnMount={false}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            render: () => <div>Overview Content</div>,
          },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Overview Content')).toBeInTheDocument();
  });
});
