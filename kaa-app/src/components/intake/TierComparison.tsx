/**
 * TierComparison Component
 * Side-by-side comparison of all 4 tiers.
 */

import React, { JSX } from 'react';
import { TIER_DEFINITIONS, TierId } from '../../config/sageTiers';
import { TierCard } from './TierCard';
import './TierComparison.css';

// ============================================================================
// TYPES
// ============================================================================

export interface TierComparisonProps {
  recommendedTier?: TierId;
  selectedTier?: TierId;
  onSelectTier?: (tier: TierId) => void;
  highlightRecommended?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_TIERS: TierId[] = [1, 2, 3, 4];

const TIER_PRICES: Record<TierId, string> = {
  1: '$299',
  2: '$1,499',
  3: '$4,999+',
  4: 'Custom',
};

const COMPARISON_FEATURES = [
  { name: 'Conceptual Design', tiers: [1, 2, 3, 4] },
  { name: 'Detailed Floor Plans', tiers: [2, 3, 4] },
  { name: '3D Renderings', tiers: [1, 2, 3, 4] },
  { name: 'Designer Consultation', tiers: [2, 3, 4] },
  { name: 'Site Visit', tiers: [3, 4] },
  { name: 'Unlimited Revisions', tiers: [4] },
  { name: 'Project Management', tiers: [4] },
  { name: 'Contractor Coordination', tiers: [3, 4] },
  { name: 'Priority Support', tiers: [3, 4] },
  { name: 'Dedicated Team', tiers: [4] },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TierComparison({
  recommendedTier,
  selectedTier,
  onSelectTier,
  highlightRecommended = true,
}: TierComparisonProps): JSX.Element {
  return (
    <div className="tier-comparison">
      <header className="tier-comparison__header">
        <h2 className="tier-comparison__title">Compare All Packages</h2>
        <p className="tier-comparison__subtitle">
          Find the perfect level of service for your project
        </p>
      </header>

      {/* Card View (for larger screens) */}
      <div className="tier-comparison__cards">
        {ALL_TIERS.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            isRecommended={highlightRecommended && tier === recommendedTier}
            isSelected={tier === selectedTier}
            onSelect={onSelectTier ? () => onSelectTier(tier) : undefined}
            showDetails={true}
          />
        ))}
      </div>

      {/* Table View (for detailed comparison) */}
      <div className="tier-comparison__table-wrapper">
        <table className="tier-comparison__table">
          <thead>
            <tr>
              <th className="tier-comparison__feature-header">Feature</th>
              {ALL_TIERS.map((tier) => (
                <th
                  key={tier}
                  className={`tier-comparison__tier-header ${
                    tier === recommendedTier && highlightRecommended
                      ? 'tier-comparison__tier-header--recommended'
                      : ''
                  }`}
                >
                  <div className="tier-comparison__tier-name">
                    {TIER_DEFINITIONS[tier].name}
                  </div>
                  <div className="tier-comparison__tier-price">
                    {TIER_PRICES[tier]}
                  </div>
                  {tier === recommendedTier && highlightRecommended && (
                    <span className="tier-comparison__recommended-badge">
                      Recommended
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FEATURES.map((feature, index) => (
              <tr key={index} className="tier-comparison__row">
                <td className="tier-comparison__feature-name">{feature.name}</td>
                {ALL_TIERS.map((tier) => (
                  <td
                    key={tier}
                    className={`tier-comparison__cell ${
                      feature.tiers.includes(tier)
                        ? 'tier-comparison__cell--included'
                        : 'tier-comparison__cell--excluded'
                    }`}
                  >
                    {feature.tiers.includes(tier) ? (
                      <span className="tier-comparison__check">✓</span>
                    ) : (
                      <span className="tier-comparison__cross">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td></td>
              {ALL_TIERS.map((tier) => (
                <td key={tier} className="tier-comparison__cta-cell">
                  {onSelectTier && (
                    <button
                      className={`tier-comparison__cta ${
                        tier === selectedTier ? 'tier-comparison__cta--selected' : ''
                      } ${
                        tier === recommendedTier && highlightRecommended
                          ? 'tier-comparison__cta--recommended'
                          : ''
                      }`}
                      onClick={() => onSelectTier(tier)}
                    >
                      {tier === selectedTier
                        ? 'Selected'
                        : tier === 4
                        ? 'Contact Us'
                        : 'Select'}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="tier-comparison__legend">
        <span className="tier-comparison__legend-item">
          <span className="tier-comparison__check">✓</span> Included
        </span>
        <span className="tier-comparison__legend-item">
          <span className="tier-comparison__cross">—</span> Not included
        </span>
      </div>
    </div>
  );
}

export default TierComparison;
