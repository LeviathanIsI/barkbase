import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionCard from '../SectionCard';

describe('SectionCard', () => {
  it('renders header, body, and footer content', () => {
    render(
      <SectionCard
        title="Test Card"
        header={<div>Header Actions</div>}
        footer={<div>Footer Content</div>}
      >
        <p>Body Content</p>
      </SectionCard>,
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Header Actions')).toBeInTheDocument();
    expect(screen.getByText('Body Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });
});
