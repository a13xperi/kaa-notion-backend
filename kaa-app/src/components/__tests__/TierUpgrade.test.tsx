/**
 * Tier Upgrade Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  TierUpgradeModal, 
  TierUpgradePrompt, 
  FeatureGate,
  useTierGate,
} from '../TierUpgrade';

// Helper to test hook
function TierGateHookTest({ tier }: { tier: number }) {
  const gate = useTierGate(tier);
  return (
    <div>
      <span data-testid="tier-name">{gate.tierName}</span>
      <span data-testid="has-access-2">{gate.hasAccess(2) ? 'yes' : 'no'}</span>
      <span data-testid="is-locked-3">{gate.isLocked(3) ? 'yes' : 'no'}</span>
      <span data-testid="can-upgrade-3">{gate.canUpgrade(3) ? 'yes' : 'no'}</span>
      <span data-testid="upgrade-count">{gate.availableUpgrades.length}</span>
    </div>
  );
}

describe('TierUpgradePrompt', () => {
  it('renders feature name correctly', () => {
    render(
      <TierUpgradePrompt
        currentTier={1}
        featureName="Custom Design Plans"
        requiredTier={2}
        onUpgrade={() => {}}
      />
    );

    expect(screen.getByText('Unlock Custom Design Plans')).toBeInTheDocument();
  });

  it('shows required tier name', () => {
    render(
      <TierUpgradePrompt
        currentTier={1}
        featureName="Custom Design Plans"
        requiredTier={2}
        onUpgrade={() => {}}
      />
    );

    expect(screen.getByText(/The Builder/)).toBeInTheDocument();
  });

  it('calls onUpgrade when button is clicked', () => {
    const handleUpgrade = jest.fn();
    render(
      <TierUpgradePrompt
        currentTier={1}
        featureName="Custom Design Plans"
        requiredTier={2}
        onUpgrade={handleUpgrade}
      />
    );

    fireEvent.click(screen.getByText('View Upgrade Options'));
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });
});

describe('TierUpgradeModal', () => {
  it('renders all tiers', () => {
    render(
      <TierUpgradeModal
        currentTier={1}
        onUpgrade={jest.fn()}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('The Concept')).toBeInTheDocument();
    expect(screen.getByText('The Builder')).toBeInTheDocument();
    expect(screen.getByText('The Concierge')).toBeInTheDocument();
  });

  it('marks current tier', () => {
    render(
      <TierUpgradeModal
        currentTier={2}
        onUpgrade={jest.fn()}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Your Current Plan')).toBeInTheDocument();
  });

  it('shows upgrade buttons for higher tiers', () => {
    render(
      <TierUpgradeModal
        currentTier={1}
        onUpgrade={jest.fn()}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Upgrade to The Builder')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to The Concierge')).toBeInTheDocument();
  });

  it('calls onUpgrade with selected tier', async () => {
    const handleUpgrade = jest.fn().mockResolvedValue(undefined);
    render(
      <TierUpgradeModal
        currentTier={1}
        onUpgrade={handleUpgrade}
        isOpen={true}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByText('Upgrade to The Builder'));
    
    await waitFor(() => {
      expect(handleUpgrade).toHaveBeenCalledWith(2);
    });
  });

  it('does not render when closed', () => {
    render(
      <TierUpgradeModal
        currentTier={1}
        onUpgrade={jest.fn()}
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('The Concept')).not.toBeInTheDocument();
  });
});

describe('FeatureGate', () => {
  it('renders children when user has access', () => {
    render(
      <FeatureGate
        currentTier={2}
        requiredTier={2}
        featureName="Custom Plans"
      >
        <div>Protected Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when user tier is higher', () => {
    render(
      <FeatureGate
        currentTier={3}
        requiredTier={2}
        featureName="Custom Plans"
      >
        <div>Protected Content</div>
      </FeatureGate>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders upgrade prompt when user lacks access', () => {
    render(
      <FeatureGate
        currentTier={1}
        requiredTier={2}
        featureName="Custom Plans"
      >
        <div>Protected Content</div>
      </FeatureGate>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Unlock Custom Plans')).toBeInTheDocument();
  });

  it('calls onUpgradeClick when provided', () => {
    const handleUpgrade = jest.fn();
    render(
      <FeatureGate
        currentTier={1}
        requiredTier={2}
        featureName="Custom Plans"
        onUpgradeClick={handleUpgrade}
      >
        <div>Protected Content</div>
      </FeatureGate>
    );

    fireEvent.click(screen.getByText('View Upgrade Options'));
    expect(handleUpgrade).toHaveBeenCalledTimes(1);
  });
});

describe('useTierGate', () => {
  it('returns correct tier name', () => {
    render(<TierGateHookTest tier={1} />);
    expect(screen.getByTestId('tier-name')).toHaveTextContent('The Concept');
  });

  it('returns correct access check', () => {
    render(<TierGateHookTest tier={2} />);
    expect(screen.getByTestId('has-access-2')).toHaveTextContent('yes');
  });

  it('returns correct locked check', () => {
    render(<TierGateHookTest tier={2} />);
    expect(screen.getByTestId('is-locked-3')).toHaveTextContent('yes');
  });

  it('returns correct upgrade availability', () => {
    render(<TierGateHookTest tier={1} />);
    expect(screen.getByTestId('can-upgrade-3')).toHaveTextContent('yes');
    expect(screen.getByTestId('upgrade-count')).toHaveTextContent('2');
  });

  it('returns no upgrades for top tier', () => {
    render(<TierGateHookTest tier={3} />);
    expect(screen.getByTestId('upgrade-count')).toHaveTextContent('0');
  });
});
