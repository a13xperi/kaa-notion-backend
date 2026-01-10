/**
 * TierRecommendation Component
 * Displays the recommended tier with pricing and features after form submission.
 */

import React, { JSX } from 'react';
import { TierRecommendation as TierRecResult } from '../../utils/tierRouter';
import { TIER_DEFINITIONS, TierId } from '../../config/sageTiers';
import { TierCard } from './TierCard';
import './TierRecommendation.css';

// ============================================================================
// TYPES
// ============================================================================

export interface TierRecommendationProps {
  recommendation: TierRecResult;
  onSelectTier: (tier: TierId) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIER_PRICES: Record<TierId, string> = {
  1: '$299',
  2: '$1,499',
  3: '$4,999',
  4: 'Custom',
};

const CONFIDENCE_LABELS = {
  high: { label: 'Perfect Match', color: 'green', icon: '✓' },
  medium: { label: 'Good Fit', color: 'blue', icon: '●' },
  low: { label: 'Review Recommended', color: 'orange', icon: '!' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TierRecommendation({
  recommendation,
  onSelectTier,
  onBack,
  isLoading = false,
}: TierRecommendationProps): JSX.Element {
  const { tier, reason, confidence, needsManualReview, factors, redFlags, alternativeTiers } = recommendation;
  const tierDef = TIER_DEFINITIONS[tier];
  const confidenceInfo = CONFIDENCE_LABELS[confidence];

  if (isLoading) {
    return (
      <div className="tier-recommendation tier-recommendation--loading">
        <div className="tier-recommendation__spinner" />
        <p>Analyzing your project...</p>
      </div>
    );
  }

  return (
    <div className="tier-recommendation">
      {/* Header */}
      <header className="tier-recommendation__header">
        <h1 className="tier-recommendation__title">Your Perfect Package</h1>
        <p className="tier-recommendation__subtitle">
          Based on your project details, we recommend:
        </p>
      </header>

      {/* Confidence Badge */}
      <div className={`tier-recommendation__confidence tier-recommendation__confidence--${confidence}`}>
        <span className="tier-recommendation__confidence-icon">{confidenceInfo.icon}</span>
        <span className="tier-recommendation__confidence-label">{confidenceInfo.label}</span>
      </div>

      {/* Main Recommendation */}
      <div className="tier-recommendation__main">
        <TierCard
          tier={tier}
          isRecommended={true}
          onSelect={() => onSelectTier(tier)}
          showDetails={true}
        />
      </div>

      {/* Reason */}
      <div className="tier-recommendation__reason">
        <h3>Why This Package?</h3>
        <p>{reason}</p>
        
        {factors.length > 0 && (
          <ul className="tier-recommendation__factors">
            {factors.map((factor, index) => (
              <li key={index} className="tier-recommendation__factor">
                <span className="tier-recommendation__factor-icon">
                  {factor.factor === 'budget' && '💰'}
                  {factor.factor === 'timeline' && '⏱️'}
                  {factor.factor === 'assets' && '📄'}
                  {factor.factor === 'project_type' && '🏠'}
                </span>
                <span className="tier-recommendation__factor-text">{factor.description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Red Flags */}
      {redFlags.length > 0 && (
        <div className="tier-recommendation__warnings">
          <h3>⚠️ Things to Consider</h3>
          <ul>
            {redFlags.map((flag, index) => (
              <li key={index}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual Review Notice */}
      {needsManualReview && (
        <div className="tier-recommendation__review-notice">
          <span className="tier-recommendation__review-icon">👋</span>
          <div className="tier-recommendation__review-content">
            <h4>We'll Be in Touch</h4>
            <p>
              Your project has some unique requirements. Our team will review your 
              submission and reach out within 24 hours to discuss the best options.
            </p>
          </div>
        </div>
      )}

      {/* Alternative Tiers */}
      {alternativeTiers.length > 0 && (
        <div className="tier-recommendation__alternatives">
          <h3>Other Options</h3>
          <p className="tier-recommendation__alternatives-subtitle">
            Based on your project, you might also consider:
          </p>
          <div className="tier-recommendation__alternatives-grid">
            {alternativeTiers.map((altTier) => (
              <TierCard
                key={altTier}
                tier={altTier}
                isRecommended={false}
                onSelect={() => onSelectTier(altTier)}
                showDetails={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="tier-recommendation__actions">
        {onBack && (
          <button
            type="button"
            className="tier-recommendation__btn tier-recommendation__btn--secondary"
            onClick={onBack}
          >
            ← Edit My Answers
          </button>
        )}
        <button
          type="button"
          className="tier-recommendation__btn tier-recommendation__btn--primary"
          onClick={() => onSelectTier(tier)}
        >
          {needsManualReview ? 'Request Consultation' : `Continue with ${tierDef.name}`}
        </button>
      </div>

      {/* Price Note */}
      <p className="tier-recommendation__price-note">
        Starting at {TIER_PRICES[tier]}
        {tier >= 3 && ' • Custom pricing available'}
      </p>
    </div>
  );
}

export default TierRecommendation;
