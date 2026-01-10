import React, { useState } from 'react';
import TierCard, { TIER_DATA, TierData } from './TierCard';
import './TierComparison.css';

interface TierComparisonProps {
  onSelectTier: (tier: 1 | 2 | 3 | 4) => void;
  selectedTier?: 1 | 2 | 3 | 4;
  recommendedTier?: 1 | 2 | 3 | 4;
  disabledTiers?: (1 | 2 | 3 | 4)[];
  showHeader?: boolean;
  compact?: boolean;
}

const TierComparison: React.FC<TierComparisonProps> = ({
  onSelectTier,
  selectedTier,
  recommendedTier,
  disabledTiers = [],
  showHeader = true,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(recommendedTier || 2);

  // Add recommended badge to the recommended tier
  const getTierDataWithRecommendation = (tierData: TierData): TierData => {
    if (tierData.tier === recommendedTier) {
      return {
        ...tierData,
        badge: 'Recommended',
        highlighted: true,
      };
    }
    return tierData;
  };

  const handleTierSelect = (tier: 1 | 2 | 3 | 4) => {
    if (!disabledTiers.includes(tier)) {
      onSelectTier(tier);
    }
  };

  return (
    <div className={`tier-comparison ${compact ? 'tier-comparison--compact' : ''}`}>
      {showHeader && (
        <div className="tier-comparison-header">
          <h2 className="tier-comparison-title">Choose Your Plan</h2>
          <p className="tier-comparison-subtitle">
            Select the tier that best fits your project needs
          </p>
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="tier-comparison-tabs" role="tablist" aria-label="Tier selection">
        {TIER_DATA.map((tier) => (
          <button
            key={tier.tier}
            role="tab"
            aria-selected={activeTab === tier.tier}
            aria-controls={`tier-panel-${tier.tier}`}
            className={`tier-comparison-tab ${activeTab === tier.tier ? 'tier-comparison-tab--active' : ''} ${recommendedTier === tier.tier ? 'tier-comparison-tab--recommended' : ''}`}
            onClick={() => setActiveTab(tier.tier)}
          >
            <span className="tier-comparison-tab-number">Tier {tier.tier}</span>
            <span className="tier-comparison-tab-name">{tier.name}</span>
            {recommendedTier === tier.tier && (
              <span className="tier-comparison-tab-badge">Recommended</span>
            )}
          </button>
        ))}
      </div>

      {/* Mobile: Single Card View */}
      <div className="tier-comparison-mobile">
        {TIER_DATA.map((tier) => (
          <div
            key={tier.tier}
            id={`tier-panel-${tier.tier}`}
            role="tabpanel"
            aria-labelledby={`tier-tab-${tier.tier}`}
            className={`tier-comparison-panel ${activeTab === tier.tier ? 'tier-comparison-panel--active' : ''}`}
          >
            <TierCard
              data={getTierDataWithRecommendation(tier)}
              onSelect={handleTierSelect}
              selected={selectedTier === tier.tier}
              disabled={disabledTiers.includes(tier.tier)}
              compact={compact}
            />
          </div>
        ))}
      </div>

      {/* Desktop: Grid View */}
      <div className="tier-comparison-grid">
        {TIER_DATA.map((tier) => (
          <TierCard
            key={tier.tier}
            data={getTierDataWithRecommendation(tier)}
            onSelect={handleTierSelect}
            selected={selectedTier === tier.tier}
            disabled={disabledTiers.includes(tier.tier)}
            compact={compact}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="tier-comparison-table-container">
        <h3 className="tier-comparison-table-title">Compare Features</h3>
        <div className="tier-comparison-table-wrapper">
          <table className="tier-comparison-table">
            <thead>
              <tr>
                <th className="tier-comparison-feature-header">Feature</th>
                {TIER_DATA.map((tier) => (
                  <th
                    key={tier.tier}
                    className={`tier-comparison-tier-header ${recommendedTier === tier.tier ? 'tier-comparison-tier-header--recommended' : ''}`}
                  >
                    <span className="tier-comparison-tier-name">{tier.name}</span>
                    <span className="tier-comparison-tier-price">{tier.price}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FeatureRow feature="Concept Design" tiers={[true, true, true, true]} />
              <FeatureRow feature="2D Plan View" tiers={[true, true, true, true]} />
              <FeatureRow feature="Plant Palette" tiers={[true, true, true, true]} />
              <FeatureRow feature="3D Visualization" tiers={[false, true, true, true]} />
              <FeatureRow feature="Detailed Planting Plan" tiers={[false, true, true, true]} />
              <FeatureRow feature="Hardscape Layout" tiers={[false, true, true, true]} />
              <FeatureRow feature="Construction Documents" tiers={[false, false, true, true]} />
              <FeatureRow feature="Contractor Coordination" tiers={[false, false, true, true]} />
              <FeatureRow feature="Project Management" tiers={[false, false, true, true]} />
              <FeatureRow feature="On-site Consultations" tiers={[false, false, false, true]} />
              <FeatureRow feature="Vendor Management" tiers={[false, false, false, true]} />
              <FeatureRow feature="Dedicated Project Manager" tiers={[false, false, false, true]} />
              <FeatureRow
                feature="Revisions"
                tiers={['1 round', '2 rounds', '3 rounds', 'Unlimited']}
              />
              <FeatureRow
                feature="Turnaround"
                tiers={['48 hours', '1 week', '2 weeks', 'Custom']}
              />
              <FeatureRow
                feature="Support"
                tiers={['Email', 'Email', '30-day post-delivery', 'Priority']}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Section */}
      <div className="tier-comparison-help">
        <p className="tier-comparison-help-text">
          Not sure which tier is right for you?{' '}
          <button
            type="button"
            className="tier-comparison-help-link"
            onClick={() => handleTierSelect(4)}
          >
            Request a consultation
          </button>{' '}
          with our team.
        </p>
      </div>
    </div>
  );
};

// Feature Row Component
interface FeatureRowProps {
  feature: string;
  tiers: (boolean | string)[];
}

const FeatureRow: React.FC<FeatureRowProps> = ({ feature, tiers }) => {
  return (
    <tr className="tier-comparison-feature-row">
      <td className="tier-comparison-feature-name">{feature}</td>
      {tiers.map((value, index) => (
        <td key={index} className="tier-comparison-feature-value">
          {typeof value === 'boolean' ? (
            value ? (
              <span className="tier-comparison-check" aria-label="Included">
                ✓
              </span>
            ) : (
              <span className="tier-comparison-dash" aria-label="Not included">
                —
              </span>
            )
          ) : (
            <span className="tier-comparison-text">{value}</span>
          )}
        </td>
      ))}
    </tr>
  );
};

export default TierComparison;
