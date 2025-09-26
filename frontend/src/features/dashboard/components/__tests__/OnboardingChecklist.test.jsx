import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingChecklist from '../OnboardingChecklist';
import '@testing-library/jest-dom';

describe('OnboardingChecklist', () => {
  const baseStatus = {
    dismissed: false,
    checklist: [
      {
        id: 'create-booking',
        label: 'Create your first booking',
        description: 'Drag a pet onto the calendar.',
        href: '/bookings',
        done: false,
      },
      {
        id: 'add-pet',
        label: 'Add a pet and owner',
        description: 'Keep owner details together.',
        href: '/pets',
        done: true,
      },
      {
        id: 'customize-theme',
        label: 'Customize your brand theme',
        description: 'Match BarkBase to your colors.',
        href: '/settings/theme',
        done: false,
      },
    ],
    progress: { completed: 1, total: 3 },
    plan: {
      name: 'PRO',
      features: {
        billingPortal: true,
        auditLog: true,
        advancedReports: true,
      },
      upgradeAvailable: false,
    },
  };

  it('renders checklist items with plan highlights', () => {
    render(
      <MemoryRouter>
        <OnboardingChecklist status={baseStatus} />
      </MemoryRouter>,
    );

    expect(screen.getByText(/workspace onboarding/i)).toBeInTheDocument();
    expect(screen.getByText('Create your first booking')).toBeInTheDocument();
    expect(screen.getByText('Add a pet and owner')).toBeInTheDocument();
    expect(screen.getByText('Plan PRO')).toBeInTheDocument();
    expect(screen.getByText('Billing portal')).toBeInTheDocument();
  });

  it('emits dismissal events', () => {
    const handleDismiss = vi.fn();

    render(
      <MemoryRouter>
        <OnboardingChecklist status={baseStatus} onDismiss={handleDismiss} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /hide checklist/i }));
    expect(handleDismiss).toHaveBeenCalledWith(true);
  });
});
