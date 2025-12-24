import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from '../Button';

describe('Button', () => {
  it('renders label and handles click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();

    render(<Button onClick={handler}>Check In</Button>);

    const button = screen.getByRole('button', { name: /check in/i });
    await user.click(button);
    expect(handler).toHaveBeenCalled();
  });
});
