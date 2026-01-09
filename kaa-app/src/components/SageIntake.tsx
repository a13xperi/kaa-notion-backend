import React, { useState } from 'react';
import logger from '../utils/logger';
import './SageIntake.css';

interface IntakeFormData {
  email: string;
  name: string;
  projectAddress: string;
  budgetRange: string;
  timeline: string;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
}

interface IntakeResponse {
  success: boolean;
  leadId: string;
  recommendedTier: number;
  tierName: string;
  confidence: string;
  routingReason: string;
  needsManualReview: boolean;
  nextUrl: string;
}

interface SageIntakeProps {
  onComplete: (response: IntakeResponse) => void;
  onBack: () => void;
}

const BUDGET_OPTIONS = [
  { value: '', label: 'Select a budget range' },
  { value: 'under-5k', label: 'Under $5,000' },
  { value: '5k-10k', label: '$5,000 - $10,000' },
  { value: '10k-25k', label: '$10,000 - $25,000' },
  { value: '25k-50k', label: '$25,000 - $50,000' },
  { value: '50k+', label: '$50,000+' },
];

const TIMELINE_OPTIONS = [
  { value: '', label: 'Select your timeline' },
  { value: '< 2 weeks', label: 'ASAP (under 2 weeks)' },
  { value: '2-4 weeks', label: '2-4 weeks' },
  { value: '4-8 weeks', label: '1-2 months' },
  { value: '2-3 months', label: '2-3 months' },
  { value: '3-6 months', label: '3-6 months' },
  { value: '6+ months', label: 'Flexible / No rush' },
];

const PROJECT_TYPE_OPTIONS = [
  { value: '', label: 'Select project type' },
  { value: 'simple-renovation', label: 'Simple Renovation / Refresh' },
  { value: 'garden-design', label: 'Garden Design' },
  { value: 'patio-deck', label: 'Patio / Deck Addition' },
  { value: 'outdoor-living', label: 'Outdoor Living Space' },
  { value: 'pool-landscape', label: 'Pool Landscape' },
  { value: 'new-build', label: 'New Build / New Construction' },
  { value: 'full-property', label: 'Full Property Design' },
  { value: 'estate-commercial', label: 'Estate / Commercial Project' },
];

const SageIntake: React.FC<SageIntakeProps> = ({ onComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<IntakeFormData>({
    email: '',
    name: '',
    projectAddress: '',
    budgetRange: '',
    timeline: '',
    projectType: '',
    hasSurvey: false,
    hasDrawings: false,
  });

  const totalSteps = 3;

  const updateField = (field: keyof IntakeFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user updates
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.email.trim()) {
        errors.email = 'Email is required';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          errors.email = 'Please enter a valid email address';
        }
      }
      if (!formData.name.trim()) {
        errors.name = 'Name is required';
      }
    }

    if (step === 2) {
      if (!formData.projectAddress.trim()) {
        errors.projectAddress = 'Project address is required';
      }
      if (!formData.projectType) {
        errors.projectType = 'Please select a project type';
      }
    }

    if (step === 3) {
      if (!formData.budgetRange) {
        errors.budgetRange = 'Please select a budget range';
      }
      if (!formData.timeline) {
        errors.timeline = 'Please select a timeline';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      logger.info('[SageIntake] Submitting intake form to:', `${apiUrl}/api/sage/intake`);

      const response = await fetch(`${apiUrl}/api/sage/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          name: formData.name.trim(),
          projectAddress: formData.projectAddress.trim(),
          budgetRange: formData.budgetRange,
          timeline: formData.timeline,
          projectType: formData.projectType,
          hasSurvey: formData.hasSurvey,
          hasDrawings: formData.hasDrawings,
        }),
      });

      const data = await response.json();
      logger.info('[SageIntake] Response:', data);

      if (!response.ok) {
        if (data.field) {
          setFieldErrors({ [data.field]: data.error });
          // Navigate to the step with the error
          if (data.field === 'email' || data.field === 'name') {
            setCurrentStep(1);
          } else if (data.field === 'projectAddress' || data.field === 'projectType') {
            setCurrentStep(2);
          } else {
            setCurrentStep(3);
          }
        } else {
          setError(data.error || 'Failed to submit form');
        }
        setIsSubmitting(false);
        return;
      }

      // Success - call onComplete with the response
      onComplete(data as IntakeResponse);
    } catch (err) {
      logger.error('[SageIntake] Error submitting form:', err);
      setError('Connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="sage-step-indicator">
      {[1, 2, 3].map(step => (
        <div
          key={step}
          className={`step-dot ${currentStep >= step ? 'active' : ''} ${currentStep === step ? 'current' : ''}`}
        >
          {currentStep > step ? '✓' : step}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="sage-form-step">
      <h2 className="step-title">Let's get to know you</h2>
      <p className="step-description">We'll use this information to personalize your experience.</p>

      <div className="form-group">
        <label htmlFor="name" className="form-label">Your Name</label>
        <input
          type="text"
          id="name"
          className={`form-input ${fieldErrors.name ? 'error' : ''}`}
          placeholder="e.g., Sarah Johnson"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          autoFocus
          disabled={isSubmitting}
        />
        {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email Address</label>
        <input
          type="email"
          id="email"
          className={`form-input ${fieldErrors.email ? 'error' : ''}`}
          placeholder="e.g., sarah@example.com"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          disabled={isSubmitting}
        />
        {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
        <p className="form-hint">We'll send your project details and updates here.</p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="sage-form-step">
      <h2 className="step-title">Tell us about your project</h2>
      <p className="step-description">Help us understand what you're looking to create.</p>

      <div className="form-group">
        <label htmlFor="projectAddress" className="form-label">Project Address</label>
        <input
          type="text"
          id="projectAddress"
          className={`form-input ${fieldErrors.projectAddress ? 'error' : ''}`}
          placeholder="e.g., 123 Oak Street, Austin, TX 78701"
          value={formData.projectAddress}
          onChange={(e) => updateField('projectAddress', e.target.value)}
          autoFocus
          disabled={isSubmitting}
        />
        {fieldErrors.projectAddress && <p className="field-error">{fieldErrors.projectAddress}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="projectType" className="form-label">Project Type</label>
        <select
          id="projectType"
          className={`form-select ${fieldErrors.projectType ? 'error' : ''}`}
          value={formData.projectType}
          onChange={(e) => updateField('projectType', e.target.value)}
          disabled={isSubmitting}
        >
          {PROJECT_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {fieldErrors.projectType && <p className="field-error">{fieldErrors.projectType}</p>}
      </div>

      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.hasSurvey}
            onChange={(e) => updateField('hasSurvey', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="checkbox-custom"></span>
          <span>I have a property survey</span>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.hasDrawings}
            onChange={(e) => updateField('hasDrawings', e.target.checked)}
            disabled={isSubmitting}
          />
          <span className="checkbox-custom"></span>
          <span>I have existing drawings or plans</span>
        </label>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="sage-form-step">
      <h2 className="step-title">Budget & Timeline</h2>
      <p className="step-description">This helps us recommend the right service tier for you.</p>

      <div className="form-group">
        <label htmlFor="budgetRange" className="form-label">Budget Range</label>
        <select
          id="budgetRange"
          className={`form-select ${fieldErrors.budgetRange ? 'error' : ''}`}
          value={formData.budgetRange}
          onChange={(e) => updateField('budgetRange', e.target.value)}
          autoFocus
          disabled={isSubmitting}
        >
          {BUDGET_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {fieldErrors.budgetRange && <p className="field-error">{fieldErrors.budgetRange}</p>}
        <p className="form-hint">Select an approximate range for your project budget.</p>
      </div>

      <div className="form-group">
        <label htmlFor="timeline" className="form-label">Desired Timeline</label>
        <select
          id="timeline"
          className={`form-select ${fieldErrors.timeline ? 'error' : ''}`}
          value={formData.timeline}
          onChange={(e) => updateField('timeline', e.target.value)}
          disabled={isSubmitting}
        >
          {TIMELINE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {fieldErrors.timeline && <p className="field-error">{fieldErrors.timeline}</p>}
      </div>
    </div>
  );

  return (
    <div className="sage-intake-page">
      <div className="sage-intake-container">
        {/* Back Button */}
        <button
          className="sage-back-button"
          onClick={onBack}
          aria-label="Go back to home page"
          disabled={isSubmitting}
        >
          <span aria-hidden="true">←</span> Back
        </button>

        {/* Header */}
        <div className="sage-intake-header">
          <div className="sage-intake-logo">
            <span className="sage-wizard">🧙‍♀️</span>
          </div>
          <h1 className="sage-intake-title">Get Started with Sage</h1>
          <p className="sage-intake-subtitle">
            Let's design your dream outdoor space together
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form */}
        <form className="sage-intake-form" onSubmit={handleSubmit}>
          {error && (
            <div className="form-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="sage-form-nav">
            {currentStep > 1 && (
              <button
                type="button"
                className="nav-button prev-button"
                onClick={handlePrev}
                disabled={isSubmitting}
              >
                ← Previous
              </button>
            )}

            {currentStep < totalSteps ? (
              <button
                type="button"
                className="nav-button next-button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                className="nav-button submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="submit-spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Find My Perfect Plan
                    <span className="submit-arrow">→</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="sage-intake-footer">
          <p className="privacy-note">
            Your information is secure and will only be used to create your personalized landscape plan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SageIntake;
