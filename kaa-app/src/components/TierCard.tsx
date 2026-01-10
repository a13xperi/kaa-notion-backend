import React from 'react';
import './TierCard.css';

export interface TierData {
  tier: 1 | 2 | 3 | 4;
  name: string;
  tagline: string;
  price: string;
  priceNote?: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

interface TierCardProps {
  data: TierData;
  onSelect?: (tier: 1 | 2 | 3 | 4) => void;
  selected?: boolean;
  disabled?: boolean;
  ctaLabel?: string;
  showCta?: boolean;
  compact?: boolean;
}

// Default tier data for all 4 tiers
export const TIER_DATA: TierData[] = [
  {
    tier: 1,
    name: 'Seedling',
    tagline: 'Quick concept for simple projects',
    price: '$500',
    priceNote: 'One-time',
    features: [
      'AI-assisted concept design',
      '2D plan view rendering',
      'Plant palette suggestions',
      '48-hour turnaround',
      'One revision round',
    ],
  },
  {
    tier: 2,
    name: 'Sprout',
    tagline: 'Detailed plans for confident DIYers',
    price: '$1,500',
    priceNote: 'One-time',
    features: [
      'Full landscape design package',
      'Detailed planting plan',
      'Hardscape layout',
      '3D visualization',
      'Two revision rounds',
      'Plant sourcing guide',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    tier: 3,
    name: 'Canopy',
    tagline: 'Comprehensive design with ongoing support',
    price: '$3,500',
    priceNote: 'Starting at',
    features: [
      'Everything in Sprout',
      'Construction documents',
      'Contractor coordination',
      'Project management support',
      'Three revision rounds',
      '30-day post-delivery support',
    ],
  },
  {
    tier: 4,
    name: 'Legacy',
    tagline: 'Full-service estate and commercial projects',
    price: 'Custom',
    priceNote: 'By consultation',
    features: [
      'Everything in Canopy',
      'Multi-phase master planning',
      'On-site consultations',
      'Vendor management',
      'Unlimited revisions',
      'Dedicated project manager',
      'Priority support',
    ],
    badge: 'Invite Only',
  },
];

export function getTierData(tier: 1 | 2 | 3 | 4): TierData {
  return TIER_DATA[tier - 1];
}

const TierCard: React.FC<TierCardProps> = ({
  data,
  onSelect,
  selected = false,
  disabled = false,
  ctaLabel,
  showCta = true,
  compact = false,
}) => {
  const isInviteOnly = data.tier === 4;
  const buttonLabel = ctaLabel || (isInviteOnly ? 'Request Consultation' : 'Select Plan');

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(data.tier);
    }
  };

  const cardClasses = [
    'tier-card',
    selected && 'tier-card--selected',
    disabled && 'tier-card--disabled',
    data.highlighted && 'tier-card--highlighted',
    isInviteOnly && 'tier-card--invite-only',
    compact && 'tier-card--compact',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses} role="article" aria-label={`${data.name} tier`}>
      {/* Badge */}
      {data.badge && (
        <div className="tier-card-badge" aria-label={data.badge}>
          {data.badge}
        </div>
      )}

      {/* Header */}
      <div className="tier-card-header">
        <span className="tier-card-tier-number">Tier {data.tier}</span>
        <h3 className="tier-card-name">{data.name}</h3>
        <p className="tier-card-tagline">{data.tagline}</p>
      </div>

      {/* Price */}
      <div className="tier-card-price">
        <span className="tier-card-price-value">{data.price}</span>
        {data.priceNote && <span className="tier-card-price-note">{data.priceNote}</span>}
      </div>

      {/* Features */}
      <ul className="tier-card-features" aria-label="Features">
        {data.features.map((feature, index) => (
          <li key={index} className="tier-card-feature">
            <span className="tier-card-feature-check" aria-hidden="true">
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      {showCta && (
        <button
          type="button"
          className="tier-card-cta"
          onClick={handleClick}
          disabled={disabled}
          aria-pressed={selected}
        >
          {selected ? 'Selected' : buttonLabel}
        </button>
      )}
    </div>
  );
};

export default TierCard;
