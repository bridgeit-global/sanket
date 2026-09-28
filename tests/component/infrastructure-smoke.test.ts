/** TEST-INFRA-COMPONENT-001 */

import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

function SmokeButton() {
  return createElement(
    'button',
    { type: 'button' },
    'Component environment ready',
  );
}

describe('component test infrastructure', () => {
  it('renders in jsdom and handles a user interaction', async () => {
    const user = userEvent.setup();
    render(createElement(SmokeButton));

    const button = screen.getByRole('button', {
      name: 'Component environment ready',
    });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveFocus();
  });
});
