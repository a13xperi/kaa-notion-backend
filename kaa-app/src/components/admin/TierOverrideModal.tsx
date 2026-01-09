/**
 * TierOverrideModal Component
 * Modal to change a lead's recommended tier with reason.
 */

import React, { JSX, useState } from 'react';
import { Lead } from '../../types/admin.types';
import { TIER_NAMES, TIER_PRICES } from '../../types/portal.types';
import './TierOverrideModal.css';

// ============================================================================
// TYPES
// ============================================================================

interface TierOverrideModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (leadId: string, newTier: number, reason: string) => void;
  isSubmitting?: boolean;
}

// ============================================================================
// TIER DESCRIPTIONS
// ============================================================================

const TIER_DESCRIPTIONS: Record<number, string> = {
  1: 'DIY Guidance - Basic plant palette, layout tips, and resources for self-implementation.',
  2: 'Design Package - Complete planting plan with detailed specifications, delivered digitally.',
  3: 'Full Service - Comprehensive design with project management and contractor coordination.',
  4: 'KAA Premium - White-glove luxury experience with on-site consultations and full execution.',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TierOverrideModal({
  lead,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}: TierOverrideModalProps): JSX.Element | null {
  const [selectedTier, setSelectedTier] = useState<number>(lead.recommendedTier);
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedTier === lead.recommendedTier) {
      setError('Please select a different tier');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the tier change');
      return;
    }

    onConfirm(lead.id, selectedTier, reason.trim());
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedTier(lead.recommendedTier);
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="tier-modal__overlay" onClick={handleClose}>
      <div className="tier-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tier-modal__header">
          <h2 className="tier-modal__title">⚙️ Override Tier</h2>
          <button
            className="tier-modal__close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Lead Info */}
        <div className="tier-modal__lead-info">
          <span className="tier-modal__lead-email">{lead.email}</span>
          <span className="tier-modal__lead-address">{lead.projectAddress}</span>
          <div className="tier-modal__current-tier">
            <span className="tier-modal__label">Current Recommendation:</span>
            <span className={`tier-modal__tier-badge tier-${lead.recommendedTier}`}>
              {TIER_NAMES[lead.recommendedTier]}
            </span>
          </div>
          {lead.routingReason && (
            <div className="tier-modal__routing-reason">
              <span className="tier-modal__label">Routing Reason:</span>
              <span className="tier-modal__reason-text">{lead.routingReason}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="tier-modal__form">
          {/* Tier Selection */}
          <div className="tier-modal__field">
            <label className="tier-modal__label">Select New Tier:</label>
            <div className="tier-modal__tier-options">
              {[1, 2, 3, 4].map((tier) => (
                <div
                  key={tier}
                  className={`tier-modal__tier-option ${
                    selectedTier === tier ? 'tier-modal__tier-option--selected' : ''
                  } ${tier === lead.recommendedTier ? 'tier-modal__tier-option--current' : ''}`}
                  onClick={() => setSelectedTier(tier)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tier-modal__option-header">
                    <span className={`tier-modal__option-badge tier-${tier}`}>
                      {TIER_NAMES[tier]}
                    </span>
                    <span className="tier-modal__option-price">
                      {TIER_PRICES[tier]}
                    </span>
                  </div>
                  <p className="tier-modal__option-desc">
                    {TIER_DESCRIPTIONS[tier]}
                  </p>
                  {tier === lead.recommendedTier && (
                    <span className="tier-modal__current-label">
                      (Current)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="tier-modal__field">
            <label htmlFor="tier-reason" className="tier-modal__label">
              Reason for Override: <span className="tier-modal__required">*</span>
            </label>
            <textarea
              id="tier-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this lead should be assigned to a different tier..."
              className="tier-modal__textarea"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="tier-modal__error">
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="tier-modal__actions">
            <button
              type="button"
              className="tier-modal__btn tier-modal__btn--cancel"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tier-modal__btn tier-modal__btn--confirm"
              disabled={isSubmitting || selectedTier === lead.recommendedTier}
            >
              {isSubmitting ? 'Updating...' : 'Confirm Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TierOverrideModal;
