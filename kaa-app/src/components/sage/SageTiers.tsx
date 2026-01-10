/**
 * SAGE Tiers Comparison Page Component
 * Detailed tier comparison page at /sage/tiers
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTierPricing, TierPricing, redirectToCheckout } from '../../api/checkoutApi';
import SageLogo from '../SageLogo';
import './SageTiers.css';

interface TierFeatures {
  features: string[];
  highlight?: string;
}

const TIER_FEATURES: Record<number, TierFeatures> = {
  1: {
    highlight: 'Best for DIY enthusiasts',
    features: [
      'AI-generated design concept',
      'Plant palette suggestions',
      'Basic layout recommendations',
      'Digital delivery (PDF)',
      '7-day turnaround',
      'Email support',
      'No site visit required',
    ],
  },
  2: {
    highlight: 'Most popular choice',
    features: [
      'Everything in Tier 1',
      'Custom design consultation (virtual)',
      'Two revision rounds',
      'Detailed planting plan',
      'Material specifications',
      'Implementation guide',
      '14-day turnaround',
      'Priority email support',
    ],
  },
  3: {
    highlight: 'Full-service experience',
    features: [
      'Everything in Tier 2',
      'On-site consultation',
      'Professional site survey',
      '3D visualization',
      'Unlimited revisions',
      'Contractor coordination',
      'Project management support',
      '30-day turnaround',
      'Dedicated designer',
    ],
  },
};

export function SageTiers() {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<TierPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Get stored data from session storage
  const getStoredData = () => {
    try {
      const leadId = sessionStorage.getItem('lead_id');
      const intakeData = sessionStorage.getItem('intake_data');
      const recommendation = sessionStorage.getItem('tier_recommendation');
      
      const parsed = intakeData ? JSON.parse(intakeData) : null;
      const rec = recommendation ? JSON.parse(recommendation) : null;
      
      return {
        leadId: leadId || undefined,
        email: parsed?.email || undefined,
        recommendedTier: rec?.tier || undefined,
      };
    } catch {
      return {};
    }
  };

  const storedData = getStoredData();
  const recommendedTier = storedData.recommendedTier;

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const tierPricing = await getTierPricing();
        setPricing(tierPricing);
        setLoading(false);
      } catch (err) {
        setError('Failed to load pricing information');
        setLoading(false);
        console.error('Pricing fetch error:', err);
      }
    };

    fetchPricing();
  }, []);

  const handleSelectTier = async (tier: number) => {
    setSelectedTier(tier);
    setCheckoutLoading(true);

    const effectiveLeadId = storedData.leadId || `mock-lead-${Date.now()}`;
    if (!storedData.leadId) {
      sessionStorage.setItem('lead_id', effectiveLeadId);
      sessionStorage.setItem('selected_tier', String(tier));
    }

    try {
      await redirectToCheckout({
        leadId: effectiveLeadId,
        tier: tier as 1 | 2 | 3,
        email: storedData.email || '',
      });
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
      setSelectedTier(null);
    }
  };

  const handleGetStarted = () => {
    navigate('/sage/get-started');
  };

  if (loading) {
    return (
      <div className="sage-tiers">
        <div className="sage-tiers__loading">Loading pricing information...</div>
      </div>
    );
  }

  if (error && !pricing.length) {
    return (
      <div className="sage-tiers">
        <div className="sage-tiers__error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Use default pricing if API doesn't return data
  const defaultPricing: TierPricing[] = [
    { tier: 1, name: 'The Concept', description: 'DIY guidance', amount: 29900, currency: 'usd', formattedPrice: '$299' },
    { tier: 2, name: 'The Builder', description: 'Low-touch design', amount: 149900, currency: 'usd', formattedPrice: '$1,499' },
    { tier: 3, name: 'The Concierge', description: 'Full service', amount: 499900, currency: 'usd', formattedPrice: '$4,999' },
  ];

  const displayPricing = pricing.length > 0 ? pricing : defaultPricing;

  return (
    <div className="sage-tiers">
      <div className="sage-tiers__container">
        {/* Header */}
        <div className="sage-tiers__header">
          <SageLogo size="large" showText={true} className="sage-tiers__logo" />
          <h1 className="sage-tiers__title">Choose Your Service Tier</h1>
          <p className="sage-tiers__subtitle">
            Select the service level that best fits your landscape project needs
          </p>
        </div>

        {recommendedTier && (
          <div className="sage-tiers__recommendation">
            <p className="sage-tiers__recommendation-text">
              Based on your intake form, we recommend <strong>Tier {recommendedTier}</strong>
            </p>
          </div>
        )}

        {/* Tier Cards */}
        <div className="sage-tiers__cards">
          {displayPricing.map((tierPricing) => {
            const tierFeatures = TIER_FEATURES[tierPricing.tier];
            const isRecommended = recommendedTier === tierPricing.tier;
            const isPopular = tierPricing.tier === 2;
            const isSelected = selectedTier === tierPricing.tier;

            return (
              <div
                key={tierPricing.tier}
                className={`sage-tiers__card ${
                  isPopular ? 'sage-tiers__card--popular' : ''
                } ${isRecommended ? 'sage-tiers__card--recommended' : ''} ${
                  isSelected ? 'sage-tiers__card--selected' : ''
                }`}
              >
                {isPopular && (
                  <div className="sage-tiers__badge">Most Popular</div>
                )}
                {isRecommended && !isPopular && (
                  <div className="sage-tiers__badge sage-tiers__badge--recommended">
                    Recommended
                  </div>
                )}

                <div className="sage-tiers__card-header">
                  <div className="sage-tiers__tier-number">Tier {tierPricing.tier}</div>
                  <h2 className="sage-tiers__tier-name">{tierPricing.name}</h2>
                  <div className="sage-tiers__tier-price">
                    ${(tierPricing.amount / 100).toLocaleString()}
                    {tierPricing.tier === 3 && <span className="sage-tiers__price-note">+</span>}
                  </div>
                  {tierFeatures?.highlight && (
                    <p className="sage-tiers__tier-highlight">{tierFeatures.highlight}</p>
                  )}
                </div>

                <div className="sage-tiers__card-body">
                  <ul className="sage-tiers__features">
                    {tierFeatures?.features.map((feature, idx) => (
                      <li key={idx} className="sage-tiers__feature">
                        <span className="sage-tiers__feature-check">✓</span>
                        <span className="sage-tiers__feature-text">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="sage-tiers__card-footer">
                  <button
                    className={`sage-tiers__select-button ${
                      isSelected ? 'sage-tiers__select-button--selected' : ''
                    }`}
                    onClick={() => handleSelectTier(tierPricing.tier)}
                    disabled={checkoutLoading}
                    type="button"
                  >
                    {checkoutLoading && isSelected
                      ? 'Processing...'
                      : isRecommended
                      ? 'Select Recommended Tier'
                      : `Select Tier ${tierPricing.tier}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="sage-tiers__comparison">
          <h2 className="sage-tiers__comparison-title">Detailed Feature Comparison</h2>
          <div className="sage-tiers__comparison-table">
            <table className="sage-tiers__table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Tier 1</th>
                  <th>Tier 2</th>
                  <th>Tier 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>AI-Generated Design Concept</td>
                  <td>✓</td>
                  <td>✓</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Custom Design Consultation</td>
                  <td>—</td>
                  <td>✓ Virtual</td>
                  <td>✓ On-site</td>
                </tr>
                <tr>
                  <td>Site Visit</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>3D Visualization</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Revision Rounds</td>
                  <td>1</td>
                  <td>2</td>
                  <td>Unlimited</td>
                </tr>
                <tr>
                  <td>Contractor Coordination</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Project Management</td>
                  <td>—</td>
                  <td>—</td>
                  <td>✓</td>
                </tr>
                <tr>
                  <td>Turnaround Time</td>
                  <td>7 days</td>
                  <td>14 days</td>
                  <td>30 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA Section */}
        <div className="sage-tiers__cta">
          <h2 className="sage-tiers__cta-title">Not Sure Which Tier?</h2>
          <p className="sage-tiers__cta-description">
            Take our quick intake form and we'll recommend the perfect tier for your project.
          </p>
          <button
            className="sage-tiers__cta-button"
            onClick={handleGetStarted}
            type="button"
          >
            Get Personalized Recommendation →
          </button>
        </div>

        {/* Tier 4 Notice */}
        <div className="sage-tiers__tier4-notice">
          <p className="sage-tiers__tier4-text">
            Looking for premium white-glove service? <strong>KAA Tier 4</strong> offers 
            full-service estate and commercial projects with custom pricing. 
            <a href="/apply" className="sage-tiers__tier4-link"> Apply here</a>.
          </p>
        </div>

        {error && pricing.length > 0 && (
          <div className="sage-tiers__error-banner">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SageTiers;
