import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoRow from '../InfoRow';

describe('InfoRow', () => {
  beforeEach(() => {
    const writeTextMock = vi.fn().mockResolvedValue();
    const baseNavigator = { ...(globalThis.navigator || {}) };
    const clipboard = { writeText: writeTextMock };

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        ...baseNavigator,
        clipboard,
      },
      configurable: true,
    });

    Object.defineProperty(window, 'navigator', {
      value: globalThis.navigator,
      configurable: true,
    });
  });

  it('copies value to clipboard when copy button is pressed', async () => {
    const user = userEvent.setup();
    render(<InfoRow label="Email" value="test@example.com" copyable />);

    const copyButton = screen.getByRole('button', { name: /copy value/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();
    });
  });
});
