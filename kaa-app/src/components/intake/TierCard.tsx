/**
 * TierCard Component
 * Individual tier display with name, price, features, and CTA button.
 */

import React, { JSX } from 'react';
import { TIER_DEFINITIONS, TierId } from '../../config/sageTiers';
import './TierCard.css';

// ============================================================================
// TYPES
// ============================================================================

export interface TierCardProps {
  tier: TierId;
  isRecommended?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_PRICES: Record<TierId, { amount: string; period?: string }> = {
  1: { amount: '$299', period: 'one-time' },
  2: { amount: '$1,499', period: 'one-time' },
  3: { amount: '$4,999+', period: 'starting at' },
  4: { amount: 'Custom', period: 'by invitation' },
};

const TIER_ICONS: Record<TierId, string> = {
  1: '💡',
  2: '🔨',
  3: '🎯',
  4: '👑',
};

const TOUCH_LEVEL_LABELS: Record<string, string> = {
  'no-touch': 'Self-Service',
  'low-touch': 'Guided',
  'hybrid': 'Full-Service',
  'high-touch': 'White Glove',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TierCard({
  tier,
  isRecommended = false,
  isSelected = false,
  onSelect,
  showDetails = true,
  compact = false,
}: TierCardProps): JSX.Element {
  const tierDef = TIER_DEFINITIONS[tier];
  const price = TIER_PRICES[tier];
  const icon = TIER_ICONS[tier];
  const touchLabel = TOUCH_LEVEL_LABELS[tierDef.touchLevel];

  const handleClick = () => {
    if (onSelect) {
      onSelect();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (compact) {
    return (
      <div
        className={`tier-card tier-card--compact ${isRecommended ? 'tier-card--recommended' : ''} ${isSelected ? 'tier-card--selected' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={onSelect ? 0 : undefined}
      >
        <div className="tier-card__icon">{icon}</div>
        <div className="tier-card__info">
          <span className="tier-card__name">{tierDef.name}</span>
          <span className="tier-card__price">{price.amount}</span>
        </div>
        {isRecommended && <span className="tier-card__badge">Recommended</span>}
      </div>
    );
  }

  return (
    <div
      className={`tier-card ${isRecommended ? 'tier-card--recommended' : ''} ${isSelected ? 'tier-card--selected' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={onSelect ? 0 : undefined}
    >
      {isRecommended && (
        <div className="tier-card__recommended-banner">
          ⭐ Recommended for You
        </div>
      )}

      <div className="tier-card__header">
        <span className="tier-card__icon">{icon}</span>
        <h3 className="tier-card__name">{tierDef.name}</h3>
        <span className="tier-card__tagline">{tierDef.tagline}</span>
        <span className="tier-card__touch-level">{touchLabel}</span>
      </div>

      <div className="tier-card__pricing">
        {price.period && (
          <span className="tier-card__price-period">{price.period}</span>
        )}
        <span className="tier-card__price-amount">{price.amount}</span>
      </div>

      {showDetails && (
        <>
          <p className="tier-card__description">{tierDef.description}</p>

          <ul className="tier-card__features">
            {tierDef.deliverables.map((deliverable, index) => (
              <li
                key={index}
                className={`tier-card__feature ${deliverable.included ? 'tier-card__feature--included' : 'tier-card__feature--excluded'}`}
              >
                <span className="tier-card__feature-icon">
                  {deliverable.included ? '✓' : '×'}
                </span>
                <span className="tier-card__feature-name">{deliverable.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {onSelect && (
        <button
          type="button"
          className="tier-card__cta"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          {tier === 4 ? 'Request Consultation' : `Select ${tierDef.name}`}
        </button>
      )}
    </div>
  );
}

export default TierCard;
