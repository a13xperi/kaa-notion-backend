import React from 'react';
import './TierRecommendation.css';

/**
 * Tier information for display
 */
interface TierInfo {
  id: 1 | 2 | 3 | 4;
  name: string;
  tagline: string;
  priceDisplay: string;
  features: string[];
}

/**
 * Factor that influenced the tier recommendation
 */
interface TierFactor {
  factor: 'budget' | 'timeline' | 'project_type' | 'assets';
  suggestedTier: 1 | 2 | 3 | 4;
  weight: number;
  description: string;
}

/**
 * Tier recommendation from the API
 */
interface TierRecommendationData {
  tier: 1 | 2 | 3 | 4;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  needsManualReview: boolean;
  factors: TierFactor[];
}

interface TierRecommendationProps {
  recommendation: TierRecommendationData;
  onSelectTier: (tier: 1 | 2 | 3 | 4) => void;
  onViewAllTiers?: () => void;
  isLoading?: boolean;
}

/**
 * Tier data for display
 */
const TIER_DATA: Record<number, TierInfo> = {
  1: {
    id: 1,
    name: 'The Concept',
    tagline: 'DIY Guidance',
    priceDisplay: '$299',
    features: [
      'Professional concept design',
      'Plant and material recommendations',
      'DIY implementation guide',
      'Digital delivery in 2-4 weeks',
    ],
  },
  2: {
    id: 2,
    name: 'The Builder',
    tagline: 'Design Package',
    priceDisplay: '$1,499',
    features: [
      'Complete design package',
      'Detailed planting plans',
      'Material specifications',
      'Designer review sessions',
      'Revision rounds included',
    ],
  },
  3: {
    id: 3,
    name: 'The Concierge',
    tagline: 'Full Service',
    priceDisplay: 'Starting at $4,999',
    features: [
      'On-site consultation',
      'Complete design and planning',
      'Contractor coordination',
      'Project management',
      'Multiple revision rounds',
    ],
  },
  4: {
    id: 4,
    name: 'KAA White Glove',
    tagline: 'Luxury Service',
    priceDisplay: 'By Invitation',
    features: [
      'Exclusive, invitation-only service',
      'Dedicated design team',
      'Full project oversight',
      'Premium materials sourcing',
      'Ongoing maintenance planning',
    ],
  },
};

const getConfidenceLabel = (confidence: 'high' | 'medium' | 'low'): string => {
  switch (confidence) {
    case 'high': return 'Strong Match';
    case 'medium': return 'Good Match';
    case 'low': return 'Suggested Match';
  }
};

const getConfidenceColor = (confidence: 'high' | 'medium' | 'low'): string => {
  switch (confidence) {
    case 'high': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'low': return '#6b7280';
  }
};

const getFactorIcon = (factor: string): string => {
  switch (factor) {
    case 'budget': return '$';
    case 'timeline': return '⏱';
    case 'project_type': return '🏠';
    case 'assets': return '📄';
    default: return '•';
  }
};

const getFactorLabel = (factor: string): string => {
  switch (factor) {
    case 'budget': return 'Budget';
    case 'timeline': return 'Timeline';
    case 'project_type': return 'Project Type';
    case 'assets': return 'Existing Materials';
    default: return factor;
  }
};

const TierRecommendation: React.FC<TierRecommendationProps> = ({
  recommendation,
  onSelectTier,
  onViewAllTiers,
  isLoading = false,
}) => {
  const tierInfo = TIER_DATA[recommendation.tier];
  const isInviteOnly = recommendation.tier === 4;

  return (
    <div className="tier-recommendation">
      {/* Header */}
      <div className="tier-rec-header">
        <div className="tier-rec-badge">
          <span
            className="tier-rec-confidence"
            style={{ backgroundColor: getConfidenceColor(recommendation.confidence) }}
          >
            {getConfidenceLabel(recommendation.confidence)}
          </span>
        </div>
        <h2 className="tier-rec-title">Your Recommended Service</h2>
        <p className="tier-rec-subtitle">
          Based on your project details, we recommend:
        </p>
      </div>

      {/* Main Tier Card */}
      <div className={`tier-rec-card ${isInviteOnly ? 'invite-only' : ''}`}>
        <div className="tier-rec-card-header">
          <div className="tier-rec-tier-badge">Tier {recommendation.tier}</div>
          <h3 className="tier-rec-name">{tierInfo.name}</h3>
          <p className="tier-rec-tagline">{tierInfo.tagline}</p>
        </div>

        <div className="tier-rec-price">
          <span className="tier-rec-price-value">{tierInfo.priceDisplay}</span>
          {!isInviteOnly && <span className="tier-rec-price-note">one-time</span>}
        </div>

        <ul className="tier-rec-features">
          {tierInfo.features.map((feature, index) => (
            <li key={index} className="tier-rec-feature">
              <span className="tier-rec-feature-check">✓</span>
              {feature}
            </li>
          ))}
        </ul>

        {!isInviteOnly ? (
          <button
            className="tier-rec-cta"
            onClick={() => onSelectTier(recommendation.tier)}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : `Get Started with ${tierInfo.name}`}
          </button>
        ) : (
          <div className="tier-rec-invite-notice">
            <p>Our team will review your project and reach out if this tier is a fit.</p>
            <button
              className="tier-rec-cta tier-rec-cta-secondary"
              onClick={() => onSelectTier(recommendation.tier)}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Request Consultation'}
            </button>
          </div>
        )}
      </div>

      {/* Recommendation Reason */}
      <div className="tier-rec-reason">
        <h4 className="tier-rec-reason-title">Why we recommend this tier</h4>
        <p className="tier-rec-reason-text">{recommendation.reason}</p>
      </div>

      {/* Factors Breakdown */}
      <div className="tier-rec-factors">
        <h4 className="tier-rec-factors-title">Based on your inputs</h4>
        <div className="tier-rec-factors-grid">
          {recommendation.factors.map((factor, index) => (
            <div key={index} className="tier-rec-factor">
              <div className="tier-rec-factor-icon">{getFactorIcon(factor.factor)}</div>
              <div className="tier-rec-factor-content">
                <span className="tier-rec-factor-label">{getFactorLabel(factor.factor)}</span>
                <span className="tier-rec-factor-tier">
                  Suggests Tier {factor.suggestedTier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Review Notice */}
      {recommendation.needsManualReview && (
        <div className="tier-rec-review-notice">
          <div className="tier-rec-review-icon">👤</div>
          <div className="tier-rec-review-content">
            <h5>A specialist will review your project</h5>
            <p>
              Your project has some unique characteristics. Our team will personally
              review your requirements to ensure the best service match.
            </p>
          </div>
        </div>
      )}

      {/* View All Tiers Link */}
      {onViewAllTiers && (
        <div className="tier-rec-footer">
          <button className="tier-rec-view-all" onClick={onViewAllTiers}>
            Compare all service tiers
          </button>
        </div>
      )}
    </div>
  );
};

export default TierRecommendation;
