/**
 * Pricing Page Component
 * Displays all service tiers with pricing and features.
 */

import { useState, useEffect } from 'react';
import { getTierPricing, TierPricing, redirectToCheckout } from '../../api/checkoutApi';
import './PricingPage.css';

interface PricingPageProps {
  leadId?: string;
  userEmail?: string;
  recommendedTier?: number;
}

// Helper to get stored intake data
function getStoredIntakeData() {
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
}

// Get recommended tier from URL params
function getRecommendedTierFromURL(): number | undefined {
  const params = new URLSearchParams(window.location.search);
  const tier = params.get('tier');
  return tier ? parseInt(tier, 10) : undefined;
}

// Tier features configuration
const TIER_FEATURES: Record<number, { features: string[]; highlight?: string }> = {
  1: {
    highlight: 'Best for DIY enthusiasts',
    features: [
      'AI-generated design concept',
      'Plant palette suggestions',
      'Basic layout recommendations',
      'Digital delivery (PDF)',
      '7-day turnaround',
    ],
  },
  2: {
    highlight: 'Most popular choice',
    features: [
      'Everything in Tier 1',
      'Custom design consultation',
      'Two revision rounds',
      'Detailed planting plan',
      'Material specifications',
      'Implementation guide',
      '14-day turnaround',
    ],
  },
  3: {
    highlight: 'Full-service experience',
    features: [
      'Everything in Tier 2',
      'On-site consultation',
      'Professional site survey',
      'Unlimited revisions',
      'Contractor coordination',
      '3D visualization',
      'Project management support',
      '30-day turnaround',
    ],
  },
};

export function PricingPage({ leadId: propLeadId, userEmail: propEmail, recommendedTier: propRecommendedTier }: PricingPageProps) {
  const [pricing, setPricing] = useState<TierPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Get stored data from session storage or URL
  const storedData = getStoredIntakeData();
  const urlRecommendedTier = getRecommendedTierFromURL();
  
  // Use props first, then stored data, then URL params
  const leadId = propLeadId || storedData.leadId;
  const userEmail = propEmail || storedData.email;
  const recommendedTier = propRecommendedTier || storedData.recommendedTier || urlRecommendedTier;

  useEffect(() => {
    async function fetchPricing() {
      try {
        const data = await getTierPricing();
        setPricing(data);
      } catch (err) {
        // If API fails, use default pricing
        setPricing([
          { tier: 1, name: 'SAGE Tier 1 - DIY Guidance', description: 'Self-guided landscape planning', amount: 29900, currency: 'usd', formattedPrice: '$299' },
          { tier: 2, name: 'SAGE Tier 2 - Design Package', description: 'Professional design consultation', amount: 149900, currency: 'usd', formattedPrice: '$1,499' },
          { tier: 3, name: 'SAGE Tier 3 - Full Service', description: 'Complete design and project management', amount: 499900, currency: 'usd', formattedPrice: '$4,999' },
        ]);
        console.warn('Using default pricing - API unavailable');
      } finally {
        setLoading(false);
      }
    }

    fetchPricing();
  }, []);

  const handleSelectTier = async (tier: number) => {
    // If no lead ID, store selection and redirect to intake
    if (!leadId) {
      sessionStorage.setItem('selected_tier', String(tier));
      window.location.href = '/get-started';
      return;
    }

    setSelectedTier(tier);
    setCheckoutLoading(true);

    try {
      await redirectToCheckout({
        leadId,
        tier: tier as 1 | 2 | 3,
        email: userEmail || '',
      });
    } catch (err) {
      setError('Failed to start checkout. Please try again.');
      console.error('Checkout error:', err);
      setCheckoutLoading(false);
      setSelectedTier(null);
    }
  };

  if (loading) {
    return (
      <div className="pricing-page">
        <div className="pricing-page__loading">
          <div className="pricing-page__spinner" />
          <p>Loading pricing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pricing-page">
        <div className="pricing-page__error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-page__header">
        <h1 className="pricing-page__title">Choose Your Design Package</h1>
        <p className="pricing-page__subtitle">
          Select the service level that best fits your landscape project
        </p>
      </div>

      <div className="pricing-page__grid">
        {pricing.map((tier) => {
          const features = TIER_FEATURES[tier.tier];
          const isRecommended = recommendedTier === tier.tier;
          const isSelected = selectedTier === tier.tier;

          return (
            <div
              key={tier.tier}
              className={`pricing-card ${isRecommended ? 'pricing-card--recommended' : ''} ${
                isSelected ? 'pricing-card--selected' : ''
              }`}
            >
              {isRecommended && (
                <div className="pricing-card__badge">Recommended for You</div>
              )}

              <div className="pricing-card__header">
                <span className="pricing-card__tier">Tier {tier.tier}</span>
                <h2 className="pricing-card__name">{tier.name.replace(/SAGE Tier \d - /, '')}</h2>
                {features?.highlight && (
                  <p className="pricing-card__highlight">{features.highlight}</p>
                )}
              </div>

              <div className="pricing-card__price">
                <span className="pricing-card__amount">{tier.formattedPrice}</span>
                <span className="pricing-card__term">one-time</span>
              </div>

              <p className="pricing-card__description">{tier.description}</p>

              <ul className="pricing-card__features">
                {features?.features.map((feature, index) => (
                  <li key={index} className="pricing-card__feature">
                    <span className="pricing-card__feature-icon">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`pricing-card__button ${
                  isRecommended ? 'pricing-card__button--primary' : ''
                }`}
                onClick={() => handleSelectTier(tier.tier)}
                disabled={checkoutLoading}
              >
                {checkoutLoading && isSelected ? (
                  <>
                    <span className="pricing-card__spinner" />
                    Processing...
                  </>
                ) : leadId ? (
                  'Select & Checkout'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="pricing-page__tier4">
        <div className="pricing-page__tier4-content">
          <h3>Looking for White Glove Service?</h3>
          <p>
            Our Tier 4 premium service is by invitation only. 
            Contact us to discuss your luxury landscape project.
          </p>
          <a href="/contact" className="pricing-page__tier4-link">
            Contact Us →
          </a>
        </div>
      </div>

      <div className="pricing-page__faq">
        <h2>Frequently Asked Questions</h2>
        <div className="pricing-page__faq-grid">
          <div className="pricing-page__faq-item">
            <h4>What's included in each tier?</h4>
            <p>
              Each tier builds upon the previous, offering more personalized service
              and detailed deliverables. Tier 1 is DIY-focused, Tier 2 includes consultation,
              and Tier 3 provides full project management.
            </p>
          </div>
          <div className="pricing-page__faq-item">
            <h4>Can I upgrade later?</h4>
            <p>
              Yes! You can upgrade to a higher tier at any time. We'll credit your
              previous payment toward the upgrade cost.
            </p>
          </div>
          <div className="pricing-page__faq-item">
            <h4>What's your refund policy?</h4>
            <p>
              We offer a full refund if you're not satisfied within 14 days of
              receiving your initial deliverables.
            </p>
          </div>
          <div className="pricing-page__faq-item">
            <h4>Do you serve my area?</h4>
            <p>
              Tiers 1 and 2 are available nationwide. Tier 3 site visits are
              currently limited to select metropolitan areas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
