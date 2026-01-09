import React, { useState } from 'react';
import SageLogo from './SageLogo';
import './SageGetStarted.css';

interface SageGetStartedProps {
  onBack: () => void;
  onComplete: (nextUrl: string, tier: number) => void;
}

interface IntakeFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  projectAddress: string;
  budgetRange: string;
  timeline: string;
  projectType: string;
  hasSurvey: boolean;
  hasDrawings: boolean;
  projectDescription: string;
}

const BUDGET_OPTIONS = [
  { value: '0-25k', label: 'Under $25,000' },
  { value: '25k-50k', label: '$25,000 - $50,000' },
  { value: '50k-75k', label: '$50,000 - $75,000' },
  { value: '75k-100k', label: '$75,000 - $100,000' },
  { value: '100k-150k', label: '$100,000 - $150,000' },
  { value: '150k-200k', label: '$150,000 - $200,000' },
  { value: '200k+', label: 'Over $200,000' },
  { value: 'percentage', label: 'Prefer percentage-based pricing' },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP (within 2 weeks)' },
  { value: '2-4weeks', label: '2-4 weeks' },
  { value: '1-2months', label: '1-2 months' },
  { value: '2-3months', label: '2-3 months' },
  { value: '3-6months', label: '3-6 months' },
  { value: '6+months', label: '6+ months / Flexible' },
];

const PROJECT_TYPE_OPTIONS = [
  { value: 'simple_renovation', label: 'Simple Renovation' },
  { value: 'standard_renovation', label: 'Standard Renovation' },
  { value: 'major_renovation', label: 'Major Renovation' },
  { value: 'addition', label: 'Addition / Extension' },
  { value: 'new_build', label: 'New Build' },
  { value: 'multiple', label: 'Multiple Properties / Complex' },
];

function SageGetStarted({ onBack, onComplete }: SageGetStartedProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<IntakeFormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    projectAddress: '',
    budgetRange: '',
    timeline: '',
    projectType: '',
    hasSurvey: false,
    hasDrawings: false,
    projectDescription: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError(null);
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.email) {
          setError('Email is required');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;
      case 2:
        if (!formData.budgetRange) {
          setError('Please select a budget range');
          return false;
        }
        if (!formData.timeline) {
          setError('Please select a timeline');
          return false;
        }
        return true;
      case 3:
        if (!formData.projectType) {
          setError('Please select a project type');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/sage/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.join(', ') || data.error || 'Submission failed');
      }

      console.log('Intake submitted:', data);
      onComplete(data.nextUrl, data.recommendedTier);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="sage-step-indicator">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`sage-step-dot ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
        >
          {s < step ? '✓' : s}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="sage-form-step">
      <h2>Let's start with your contact info</h2>
      <p className="sage-step-description">We'll use this to send your design recommendations.</p>

      <div className="sage-form-group">
        <label htmlFor="email">Email *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="sage-form-row">
        <div className="sage-form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="First name"
          />
        </div>
        <div className="sage-form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="Last name"
          />
        </div>
      </div>

      <div className="sage-form-group">
        <label htmlFor="phone">Phone (optional)</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleInputChange}
          placeholder="(555) 555-5555"
        />
      </div>

      <div className="sage-form-group">
        <label htmlFor="projectAddress">Project Address (optional)</label>
        <input
          type="text"
          id="projectAddress"
          name="projectAddress"
          value={formData.projectAddress}
          onChange={handleInputChange}
          placeholder="123 Main St, City, State"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="sage-form-step">
      <h2>Tell us about your project scope</h2>
      <p className="sage-step-description">
        This helps us recommend the right service tier for you.
      </p>

      <div className="sage-form-group">
        <label htmlFor="budgetRange">Budget Range *</label>
        <select
          id="budgetRange"
          name="budgetRange"
          value={formData.budgetRange}
          onChange={handleInputChange}
          required
        >
          <option value="">Select your budget range</option>
          {BUDGET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sage-form-group">
        <label htmlFor="timeline">Timeline *</label>
        <select
          id="timeline"
          name="timeline"
          value={formData.timeline}
          onChange={handleInputChange}
          required
        >
          <option value="">When do you need this completed?</option>
          {TIMELINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="sage-form-step">
      <h2>Project details</h2>
      <p className="sage-step-description">
        Almost done! Tell us about your project type and what you already have.
      </p>

      <div className="sage-form-group">
        <label htmlFor="projectType">Project Type *</label>
        <select
          id="projectType"
          name="projectType"
          value={formData.projectType}
          onChange={handleInputChange}
          required
        >
          <option value="">Select your project type</option>
          {PROJECT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sage-form-group sage-checkbox-group">
        <label className="sage-checkbox">
          <input
            type="checkbox"
            name="hasSurvey"
            checked={formData.hasSurvey}
            onChange={handleInputChange}
          />
          <span>I have an existing property survey</span>
        </label>
        <label className="sage-checkbox">
          <input
            type="checkbox"
            name="hasDrawings"
            checked={formData.hasDrawings}
            onChange={handleInputChange}
          />
          <span>I have existing drawings or floor plans</span>
        </label>
      </div>

      <div className="sage-form-group">
        <label htmlFor="projectDescription">Tell us more (optional)</label>
        <textarea
          id="projectDescription"
          name="projectDescription"
          value={formData.projectDescription}
          onChange={handleInputChange}
          placeholder="Describe your project, goals, or any special requirements..."
          rows={4}
        />
      </div>
    </div>
  );

  return (
    <div className="sage-get-started">
      <div className="sage-get-started-header">
        <button className="sage-back-button" onClick={handleBack}>
          ← Back
        </button>
        <SageLogo size="small" />
      </div>

      <div className="sage-get-started-content">
        {renderStepIndicator()}

        {error && <div className="sage-error-message">{error}</div>}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="sage-form-actions">
          {step < 3 ? (
            <button className="sage-button primary" onClick={handleNext}>
              Continue
            </button>
          ) : (
            <button
              className="sage-button primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Get My Recommendation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default SageGetStarted;
