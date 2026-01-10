/**
 * Badge Component Tests
 */

import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge, TierBadge } from '../Badge';

describe('Badge', () => {
  it('should render children', () => {
    render(<Badge>Test Badge</Badge>);

    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('should apply default variant', () => {
    const { container } = render(<Badge>Test</Badge>);

    expect(container.querySelector('.badge--default')).toBeInTheDocument();
  });

  it('should apply primary variant', () => {
    const { container } = render(<Badge variant="primary">Test</Badge>);

    expect(container.querySelector('.badge--primary')).toBeInTheDocument();
  });

  it('should apply success variant', () => {
    const { container } = render(<Badge variant="success">Test</Badge>);

    expect(container.querySelector('.badge--success')).toBeInTheDocument();
  });

  it('should apply warning variant', () => {
    const { container } = render(<Badge variant="warning">Test</Badge>);

    expect(container.querySelector('.badge--warning')).toBeInTheDocument();
  });

  it('should apply danger variant', () => {
    const { container } = render(<Badge variant="danger">Test</Badge>);

    expect(container.querySelector('.badge--danger')).toBeInTheDocument();
  });

  it('should apply info variant', () => {
    const { container } = render(<Badge variant="info">Test</Badge>);

    expect(container.querySelector('.badge--info')).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { container, rerender } = render(<Badge size="sm">Test</Badge>);
    expect(container.querySelector('.badge--sm')).toBeInTheDocument();

    rerender(<Badge size="md">Test</Badge>);
    expect(container.querySelector('.badge--md')).toBeInTheDocument();

    rerender(<Badge size="lg">Test</Badge>);
    expect(container.querySelector('.badge--lg')).toBeInTheDocument();
  });

  it('should render dot when dot is true', () => {
    const { container } = render(<Badge dot>Test</Badge>);

    expect(container.querySelector('.badge__dot')).toBeInTheDocument();
  });

  it('should not render dot by default', () => {
    const { container } = render(<Badge>Test</Badge>);

    expect(container.querySelector('.badge__dot')).not.toBeInTheDocument();
  });

  it('should apply rounded class', () => {
    const { container } = render(<Badge rounded>Test</Badge>);

    expect(container.querySelector('.badge--rounded')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(<Badge icon={<span data-testid="icon">★</span>}>Test</Badge>);

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<Badge className="custom-badge">Test</Badge>);

    expect(container.querySelector('.custom-badge')).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('should render status text', () => {
    render(<StatusBadge status="Active" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should format status with underscores', () => {
    render(<StatusBadge status="in_progress" />);

    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('should apply success variant for completed', () => {
    const { container } = render(<StatusBadge status="completed" />);

    expect(container.querySelector('.badge--success')).toBeInTheDocument();
  });

  it('should apply danger variant for cancelled', () => {
    const { container } = render(<StatusBadge status="cancelled" />);

    expect(container.querySelector('.badge--danger')).toBeInTheDocument();
  });

  it('should apply warning variant for review', () => {
    const { container } = render(<StatusBadge status="review" />);

    expect(container.querySelector('.badge--warning')).toBeInTheDocument();
  });

  it('should apply primary variant for active', () => {
    const { container } = render(<StatusBadge status="active" />);

    expect(container.querySelector('.badge--primary')).toBeInTheDocument();
  });

  it('should apply default variant for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown" />);

    expect(container.querySelector('.badge--default')).toBeInTheDocument();
  });

  it('should include dot indicator', () => {
    const { container } = render(<StatusBadge status="active" />);

    expect(container.querySelector('.badge__dot')).toBeInTheDocument();
  });

  it('should apply size prop', () => {
    const { container } = render(<StatusBadge status="active" size="lg" />);

    expect(container.querySelector('.badge--lg')).toBeInTheDocument();
  });
});

describe('TierBadge', () => {
  it('should render tier label', () => {
    render(<TierBadge tier={1} />);

    expect(screen.getByText('Tier 1 - DIY')).toBeInTheDocument();
  });

  it('should render tier 2 label', () => {
    render(<TierBadge tier={2} />);

    expect(screen.getByText('Tier 2 - Design')).toBeInTheDocument();
  });

  it('should render tier 3 label', () => {
    render(<TierBadge tier={3} />);

    expect(screen.getByText('Tier 3 - Full Service')).toBeInTheDocument();
  });

  it('should render tier 4 label', () => {
    render(<TierBadge tier={4} />);

    expect(screen.getByText('Tier 4 - KAA Premium')).toBeInTheDocument();
  });

  it('should handle string tier', () => {
    render(<TierBadge tier="2" />);

    expect(screen.getByText('Tier 2 - Design')).toBeInTheDocument();
  });

  it('should render fallback for unknown tier', () => {
    render(<TierBadge tier={5} />);

    expect(screen.getByText('Tier 5')).toBeInTheDocument();
  });

  it('should be rounded by default', () => {
    const { container } = render(<TierBadge tier={1} />);

    expect(container.querySelector('.badge--rounded')).toBeInTheDocument();
  });

  it('should apply appropriate variant for each tier', () => {
    const { container, rerender } = render(<TierBadge tier={1} />);
    expect(container.querySelector('.badge--default')).toBeInTheDocument();

    rerender(<TierBadge tier={2} />);
    expect(container.querySelector('.badge--info')).toBeInTheDocument();

    rerender(<TierBadge tier={3} />);
    expect(container.querySelector('.badge--primary')).toBeInTheDocument();

    rerender(<TierBadge tier={4} />);
    expect(container.querySelector('.badge--warning')).toBeInTheDocument();
  });
});
