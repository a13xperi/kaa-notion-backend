/**
 * Tier Upgrade Component
 * Shows upgrade prompts and tier comparison for users.
 */

import React, { useState } from 'react';
import { Modal } from './common/Modal';
import { LoadingButton } from './common/LoadingButton';
import './TierUpgrade.css';

// ============================================================================
// TYPES
// ============================================================================

interface TierFeature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

interface TierInfo {
  id: number;
  name: string;
  price: string;
  description: string;
  features: TierFeature[];
  popular?: boolean;
}

interface TierUpgradeProps {
  currentTier: number;
  onUpgrade: (tier: number) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

interface TierUpgradePromptProps {
  currentTier: number;
  featureName: string;
  requiredTier: number;
  onUpgrade: () => void;
}

// ============================================================================
// TIER DATA
// ============================================================================

const TIERS: TierInfo[] = [
  {
    id: 1,
    name: 'The Concept',
    price: '$299',
    description: 'DIY guidance for simple projects',
    features: [
      { name: 'Property assessment guide', included: true },
      { name: 'Plant selection checklist', included: true },
      { name: 'Basic layout templates', included: true },
      { name: 'Email support', included: true },
      { name: 'Custom design plans', included: false },
      { name: 'Professional consultation', included: false },
      { name: 'Contractor referrals', included: false },
      { name: 'Project management', included: false },
    ],
  },
  {
    id: 2,
    name: 'The Builder',
    price: '$1,499',
    description: 'Complete design package',
    popular: true,
    features: [
      { name: 'Property assessment guide', included: true },
      { name: 'Plant selection checklist', included: true },
      { name: 'Basic layout templates', included: true },
      { name: 'Email support', included: true },
      { name: 'Custom design plans', included: true, highlight: true },
      { name: 'Professional consultation', included: true, highlight: true },
      { name: 'Contractor referrals', included: false },
      { name: 'Project management', included: false },
    ],
  },
  {
    id: 3,
    name: 'The Concierge',
    price: '$4,999+',
    description: 'Full-service design & support',
    features: [
      { name: 'Property assessment guide', included: true },
      { name: 'Plant selection checklist', included: true },
      { name: 'Basic layout templates', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom design plans', included: true },
      { name: 'Professional consultation', included: true },
      { name: 'Contractor referrals', included: true, highlight: true },
      { name: 'Project management', included: true, highlight: true },
    ],
  },
];

// ============================================================================
// UPGRADE PROMPT (Inline)
// ============================================================================

export function TierUpgradePrompt({
  currentTier,
  featureName,
  requiredTier,
  onUpgrade,
}: TierUpgradePromptProps) {
  const tierName = TIERS.find((t) => t.id === requiredTier)?.name || `Tier ${requiredTier}`;

  return (
    <div className="tier-upgrade-prompt">
      <div className="tier-upgrade-prompt__icon">🔒</div>
      <div className="tier-upgrade-prompt__content">
        <h4 className="tier-upgrade-prompt__title">Unlock {featureName}</h4>
        <p className="tier-upgrade-prompt__description">
          This feature is available with {tierName}. Upgrade to access {featureName.toLowerCase()} and more.
        </p>
        <button className="tier-upgrade-prompt__button" onClick={onUpgrade}>
          View Upgrade Options
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TIER CARD
// ============================================================================

interface TierCardProps {
  tier: TierInfo;
  isCurrentTier: boolean;
  isUpgrade: boolean;
  onSelect: () => void;
  loading?: boolean;
}

function TierCard({ tier, isCurrentTier, isUpgrade, onSelect, loading }: TierCardProps) {
  return (
    <div
      className={`tier-card ${tier.popular ? 'tier-card--popular' : ''} ${
        isCurrentTier ? 'tier-card--current' : ''
      }`}
    >
      {tier.popular && <span className="tier-card__badge">Most Popular</span>}
      {isCurrentTier && <span className="tier-card__current-badge">Current Plan</span>}
      
      <h3 className="tier-card__name">{tier.name}</h3>
      <div className="tier-card__price">{tier.price}</div>
      <p className="tier-card__description">{tier.description}</p>
      
      <ul className="tier-card__features">
        {tier.features.map((feature, index) => (
          <li
            key={index}
            className={`tier-card__feature ${
              feature.included ? 'tier-card__feature--included' : 'tier-card__feature--excluded'
            } ${feature.highlight ? 'tier-card__feature--highlight' : ''}`}
          >
            <span className="tier-card__feature-icon">
              {feature.included ? '✓' : '×'}
            </span>
            {feature.name}
          </li>
        ))}
      </ul>
      
      {isUpgrade && !isCurrentTier && (
        <LoadingButton
          variant="primary"
          fullWidth
          onClick={onSelect}
          loading={loading}
          loadingText="Processing..."
        >
          Upgrade to {tier.name}
        </LoadingButton>
      )}
      
      {isCurrentTier && (
        <button className="tier-card__current-button" disabled>
          Your Current Plan
        </button>
      )}
      
      {!isUpgrade && !isCurrentTier && (
        <button className="tier-card__downgrade-button" disabled>
          Contact Support to Change
        </button>
      )}
    </div>
  );
}

// ============================================================================
// UPGRADE MODAL
// ============================================================================

export function TierUpgradeModal({
  currentTier,
  onUpgrade,
  isOpen,
  onClose,
}: TierUpgradeProps) {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (tierId: number) => {
    setSelectedTier(tierId);
    setLoading(true);
    try {
      await onUpgrade(tierId);
      onClose();
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Your Plan"
      size="lg"
    >
      <div className="tier-upgrade-modal">
        <p className="tier-upgrade-modal__subtitle">
          Choose the plan that's right for your project
        </p>
        
        <div className="tier-upgrade-modal__grid">
          {TIERS.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              isCurrentTier={tier.id === currentTier}
              isUpgrade={tier.id > currentTier}
              onSelect={() => handleUpgrade(tier.id)}
              loading={loading && selectedTier === tier.id}
            />
          ))}
        </div>
        
        <p className="tier-upgrade-modal__note">
          All plans include our satisfaction guarantee. Contact us if you need a custom solution.
        </p>
      </div>
    </Modal>
  );
}

// ============================================================================
// FEATURE GATE
// ============================================================================

interface FeatureGateProps {
  currentTier: number;
  requiredTier: number;
  featureName: string;
  children: React.ReactNode;
  onUpgradeClick?: () => void;
}

export function FeatureGate({
  currentTier,
  requiredTier,
  featureName,
  children,
  onUpgradeClick,
}: FeatureGateProps) {
  if (currentTier >= requiredTier) {
    return <>{children}</>;
  }

  return (
    <TierUpgradePrompt
      currentTier={currentTier}
      featureName={featureName}
      requiredTier={requiredTier}
      onUpgrade={onUpgradeClick || (() => {})}
    />
  );
}

// ============================================================================
// HOOK FOR TIER GATING
// ============================================================================

export function useTierGate(currentTier: number) {
  return {
    hasAccess: (requiredTier: number) => currentTier >= requiredTier,
    isLocked: (requiredTier: number) => currentTier < requiredTier,
    canUpgrade: (targetTier: number) => targetTier > currentTier,
    currentTier,
    tierName: TIERS.find((t) => t.id === currentTier)?.name || `Tier ${currentTier}`,
    tierInfo: TIERS.find((t) => t.id === currentTier),
    availableUpgrades: TIERS.filter((t) => t.id > currentTier),
  };
}

export default TierUpgradeModal;
