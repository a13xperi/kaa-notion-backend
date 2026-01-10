import React, { useState, useEffect, useRef } from 'react';
import './TierOverrideModal.css';

// Types
export interface TierOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tier: number, reason: string) => void;
  currentTier: number | null;
  currentTierName: string | null;
  leadName: string;
  leadEmail: string;
  isSubmitting?: boolean;
}

// Tier data
interface TierInfo {
  tier: number;
  name: string;
  price: string;
  description: string;
  features: string[];
  color: string;
  bgColor: string;
}

const TIERS: TierInfo[] = [
  {
    tier: 1,
    name: 'Seedling',
    price: '$500',
    description: 'Quick consultations and simple plans',
    features: ['Basic site assessment', 'Concept sketch', '1 revision'],
    color: '#22c55e',
    bgColor: '#f0fdf4',
  },
  {
    tier: 2,
    name: 'Sprout',
    price: '$1,500',
    description: 'Standard residential projects',
    features: ['Full site analysis', 'Detailed plan', '2 revisions', 'Plant schedule'],
    color: '#10b981',
    bgColor: '#ecfdf5',
  },
  {
    tier: 3,
    name: 'Canopy',
    price: '$3,500',
    description: 'Complex residential or small commercial',
    features: ['Comprehensive design', '3D visualization', '3 revisions', 'Implementation guide'],
    color: '#0d9488',
    bgColor: '#f0fdfa',
  },
  {
    tier: 4,
    name: 'Forest',
    price: 'Custom',
    description: 'Large-scale or specialty projects',
    features: ['Full service design', 'Project management', 'Unlimited revisions', 'Ongoing support'],
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
];

// Common override reasons
const COMMON_REASONS = [
  'Project scope requires higher tier features',
  'Budget constraints - recommend lower tier',
  'Timeline requires expedited service',
  'Complex site conditions',
  'Client requested specific tier',
  'Commercial project - upgraded tier',
  'Repeat client - special consideration',
];

// Icons
const CloseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// Tier Card Component
const TierCard: React.FC<{
  tier: TierInfo;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}> = ({ tier, isSelected, isCurrent, onSelect }) => (
  <button
    type="button"
    className={`tier-option ${isSelected ? 'tier-option--selected' : ''} ${isCurrent ? 'tier-option--current' : ''}`}
    onClick={onSelect}
    style={{
      borderColor: isSelected ? tier.color : undefined,
      backgroundColor: isSelected ? tier.bgColor : undefined,
    }}
  >
    <div className="tier-option-header">
      <div className="tier-option-name" style={{ color: tier.color }}>
        {tier.name}
      </div>
      <div className="tier-option-price">{tier.price}</div>
      {isCurrent && <span className="current-badge">Current</span>}
    </div>
    <p className="tier-option-description">{tier.description}</p>
    <ul className="tier-option-features">
      {tier.features.slice(0, 3).map((feature, idx) => (
        <li key={idx}>
          <CheckIcon />
          {feature}
        </li>
      ))}
    </ul>
    {isSelected && (
      <div className="tier-option-check" style={{ backgroundColor: tier.color }}>
        <CheckIcon />
      </div>
    )}
  </button>
);

const TierOverrideModal: React.FC<TierOverrideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentTier,
  currentTierName,
  leadName,
  leadEmail,
  isSubmitting = false,
}) => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [showReasonSuggestions, setShowReasonSuggestions] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTier(null);
      setReason('');
      setShowReasonSuggestions(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTier && reason.trim()) {
      onConfirm(selectedTier, reason.trim());
    }
  };

  // Select reason suggestion
  const selectReasonSuggestion = (suggestion: string) => {
    setReason(suggestion);
    setShowReasonSuggestions(false);
    reasonInputRef.current?.focus();
  };

  // Validation
  const isValid = selectedTier !== null && selectedTier !== currentTier && reason.trim().length >= 10;
  const isSameTier = selectedTier === currentTier;

  if (!isOpen) return null;

  return (
    <div className="tier-override-backdrop" onClick={handleBackdropClick}>
      <div
        className="tier-override-modal"
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="modal-title" className="modal-title">Override Tier Recommendation</h2>
            <p className="modal-subtitle">
              Changing tier for <strong>{leadName || leadEmail}</strong>
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {/* Current Tier Info */}
            {currentTier && (
              <div className="current-tier-info">
                <AlertIcon />
                <span>
                  Algorithm recommended <strong>{currentTierName}</strong> (Tier {currentTier})
                </span>
              </div>
            )}

            {/* Tier Selection */}
            <div className="tier-selection">
              <label className="field-label">Select New Tier</label>
              <div className="tier-options-grid">
                {TIERS.map((tier) => (
                  <TierCard
                    key={tier.tier}
                    tier={tier}
                    isSelected={selectedTier === tier.tier}
                    isCurrent={currentTier === tier.tier}
                    onSelect={() => setSelectedTier(tier.tier)}
                  />
                ))}
              </div>
              {isSameTier && selectedTier && (
                <p className="tier-same-warning">
                  This is the current recommended tier. Select a different tier to override.
                </p>
              )}
            </div>

            {/* Reason Input */}
            <div className="reason-field">
              <label className="field-label" htmlFor="override-reason">
                Reason for Override <span className="required">*</span>
              </label>
              <div className="reason-input-wrapper">
                <textarea
                  id="override-reason"
                  ref={reasonInputRef}
                  className="reason-textarea"
                  placeholder="Explain why you're overriding the tier recommendation..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onFocus={() => setShowReasonSuggestions(true)}
                  rows={3}
                  required
                  minLength={10}
                />
                <span className="character-count">
                  {reason.length} / 10 min
                </span>
              </div>

              {/* Reason Suggestions */}
              {showReasonSuggestions && reason.length < 10 && (
                <div className="reason-suggestions">
                  <span className="suggestions-label">Common reasons:</span>
                  <div className="suggestions-list">
                    {COMMON_REASONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => selectReasonSuggestion(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Saving...
                </>
              ) : (
                <>
                  Confirm Override
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TierOverrideModal;
