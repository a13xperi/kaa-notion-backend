import React, { useState } from 'react';
import './IntakeForm.css';

/**
 * Budget range options
 */
const BUDGET_OPTIONS = [
  { value: 'under_500', label: 'Under $500', description: 'DIY guidance' },
  { value: '500_2000', label: '$500 - $2,000', description: 'Basic design help' },
  { value: '2000_5000', label: '$2,000 - $5,000', description: 'Design package' },
  { value: '5000_15000', label: '$5,000 - $15,000', description: 'Comprehensive design' },
  { value: '15000_50000', label: '$15,000 - $50,000', description: 'Full service' },
  { value: 'over_50000', label: '$50,000+', description: 'Premium service' },
  { value: 'not_sure', label: "I'm not sure", description: 'We can help you figure it out' },
];

/**
 * Timeline options
 */
const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'As soon as possible', description: 'Fast track' },
  { value: '2_4_weeks', label: '2-4 weeks', description: 'Quick turnaround' },
  { value: '1_2_months', label: '1-2 months', description: 'Standard timeline' },
  { value: '2_4_months', label: '2-4 months', description: 'Extended timeline' },
  { value: '4_plus_months', label: '4+ months', description: 'Long-term project' },
  { value: 'flexible', label: 'Flexible', description: 'No rush' },
];

/**
 * Project type options
 */
const PROJECT_TYPE_OPTIONS = [
  { value: 'simple_consultation', label: 'Simple Consultation', description: 'Quick advice on landscaping' },
  { value: 'small_renovation', label: 'Small Renovation', description: 'Minor updates to existing landscape' },
  { value: 'standard_renovation', label: 'Standard Renovation', description: 'Full landscape redesign' },
  { value: 'addition', label: 'Home Addition', description: 'New outdoor living space' },
  { value: 'new_build', label: 'New Build', description: 'Landscape for new construction' },
  { value: 'commercial', label: 'Commercial Project', description: 'Business or commercial property' },
  { value: 'complex', label: 'Complex/Custom', description: 'Unique or multi-phase project' },
];

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

interface IntakeFormProps {
  onSubmit: (data: IntakeFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormErrors {
  email?: string;
  name?: string;
  projectAddress?: string;
  budgetRange?: string;
  timeline?: string;
  projectType?: string;
}

const TOTAL_STEPS = 5;

const IntakeForm: React.FC<IntakeFormProps> = ({ onSubmit, onCancel, isLoading = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return undefined;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1:
        const emailError = validateEmail(formData.email);
        if (emailError) newErrors.email = emailError;
        if (!formData.projectAddress || formData.projectAddress.length < 5) {
          newErrors.projectAddress = 'Please enter a valid project address';
        }
        break;
      case 2:
        if (!formData.budgetRange) {
          newErrors.budgetRange = 'Please select a budget range';
        }
        break;
      case 3:
        if (!formData.timeline) {
          newErrors.timeline = 'Please select a timeline';
        }
        break;
      case 4:
        if (!formData.projectType) {
          newErrors.projectType = 'Please select a project type';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (): void => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = (): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field: keyof IntakeFormData, value: string | boolean): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => new Set(prev).add(field));

    // Clear error when user types
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate all steps
    let isValid = true;
    for (let step = 1; step <= TOTAL_STEPS - 1; step++) {
      if (!validateStep(step)) {
        isValid = false;
        setCurrentStep(step);
        break;
      }
    }

    if (isValid) {
      await onSubmit(formData);
    }
  };

  const renderProgressBar = (): React.JSX.Element => (
    <div className="intake-progress">
      <div className="intake-progress-bar">
        <div
          className="intake-progress-fill"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <div className="intake-progress-steps">
        {['Contact', 'Budget', 'Timeline', 'Project', 'Review'].map((label, index) => (
          <div
            key={label}
            className={`intake-progress-step ${index + 1 <= currentStep ? 'active' : ''} ${index + 1 < currentStep ? 'completed' : ''}`}
          >
            <span className="intake-step-number">{index + 1}</span>
            <span className="intake-step-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = (): React.JSX.Element => (
    <div className="intake-step">
      <h2 className="intake-step-title">Let's get started</h2>
      <p className="intake-step-description">Tell us how to reach you and where your project is located.</p>

      <div className="intake-field">
        <label htmlFor="email" className="intake-label">
          Email Address <span className="required">*</span>
        </label>
        <input
          type="email"
          id="email"
          className={`intake-input ${errors.email ? 'error' : ''}`}
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="your@email.com"
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && <span id="email-error" className="intake-error">{errors.email}</span>}
      </div>

      <div className="intake-field">
        <label htmlFor="name" className="intake-label">
          Your Name <span className="optional">(optional)</span>
        </label>
        <input
          type="text"
          id="name"
          className="intake-input"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="John Smith"
        />
      </div>

      <div className="intake-field">
        <label htmlFor="projectAddress" className="intake-label">
          Project Address <span className="required">*</span>
        </label>
        <input
          type="text"
          id="projectAddress"
          className={`intake-input ${errors.projectAddress ? 'error' : ''}`}
          value={formData.projectAddress}
          onChange={(e) => handleInputChange('projectAddress', e.target.value)}
          placeholder="123 Main St, City, State 12345"
          aria-describedby={errors.projectAddress ? 'address-error' : undefined}
          aria-invalid={!!errors.projectAddress}
        />
        {errors.projectAddress && <span id="address-error" className="intake-error">{errors.projectAddress}</span>}
      </div>
    </div>
  );

  const renderStep2 = (): React.JSX.Element => (
    <div className="intake-step">
      <h2 className="intake-step-title">What's your budget?</h2>
      <p className="intake-step-description">This helps us recommend the right service tier for you.</p>

      <div className="intake-options" role="radiogroup" aria-label="Budget range">
        {BUDGET_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`intake-option ${formData.budgetRange === option.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="budgetRange"
              value={option.value}
              checked={formData.budgetRange === option.value}
              onChange={(e) => handleInputChange('budgetRange', e.target.value)}
              className="intake-radio"
            />
            <div className="intake-option-content">
              <span className="intake-option-label">{option.label}</span>
              <span className="intake-option-description">{option.description}</span>
            </div>
          </label>
        ))}
      </div>
      {errors.budgetRange && <span className="intake-error">{errors.budgetRange}</span>}
    </div>
  );

  const renderStep3 = (): React.JSX.Element => (
    <div className="intake-step">
      <h2 className="intake-step-title">When do you need this done?</h2>
      <p className="intake-step-description">Your timeline helps us plan accordingly.</p>

      <div className="intake-options" role="radiogroup" aria-label="Timeline">
        {TIMELINE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`intake-option ${formData.timeline === option.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="timeline"
              value={option.value}
              checked={formData.timeline === option.value}
              onChange={(e) => handleInputChange('timeline', e.target.value)}
              className="intake-radio"
            />
            <div className="intake-option-content">
              <span className="intake-option-label">{option.label}</span>
              <span className="intake-option-description">{option.description}</span>
            </div>
          </label>
        ))}
      </div>
      {errors.timeline && <span className="intake-error">{errors.timeline}</span>}
    </div>
  );

  const renderStep4 = (): React.JSX.Element => (
    <div className="intake-step">
      <h2 className="intake-step-title">What type of project is this?</h2>
      <p className="intake-step-description">Select the option that best describes your project.</p>

      <div className="intake-options" role="radiogroup" aria-label="Project type">
        {PROJECT_TYPE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`intake-option ${formData.projectType === option.value ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="projectType"
              value={option.value}
              checked={formData.projectType === option.value}
              onChange={(e) => handleInputChange('projectType', e.target.value)}
              className="intake-radio"
            />
            <div className="intake-option-content">
              <span className="intake-option-label">{option.label}</span>
              <span className="intake-option-description">{option.description}</span>
            </div>
          </label>
        ))}
      </div>
      {errors.projectType && <span className="intake-error">{errors.projectType}</span>}

      <div className="intake-assets">
        <h3 className="intake-assets-title">Do you have any existing materials?</h3>
        <p className="intake-assets-description">Having these can speed up the process.</p>

        <label className="intake-checkbox-label">
          <input
            type="checkbox"
            checked={formData.hasSurvey}
            onChange={(e) => handleInputChange('hasSurvey', e.target.checked)}
            className="intake-checkbox"
          />
          <span>I have a property survey</span>
        </label>

        <label className="intake-checkbox-label">
          <input
            type="checkbox"
            checked={formData.hasDrawings}
            onChange={(e) => handleInputChange('hasDrawings', e.target.checked)}
            className="intake-checkbox"
          />
          <span>I have existing drawings or plans</span>
        </label>
      </div>
    </div>
  );

  const renderStep5 = (): React.JSX.Element => {
    const getBudgetLabel = (): string => BUDGET_OPTIONS.find(o => o.value === formData.budgetRange)?.label || '';
    const getTimelineLabel = (): string => TIMELINE_OPTIONS.find(o => o.value === formData.timeline)?.label || '';
    const getProjectTypeLabel = (): string => PROJECT_TYPE_OPTIONS.find(o => o.value === formData.projectType)?.label || '';

    return (
      <div className="intake-step">
        <h2 className="intake-step-title">Review your information</h2>
        <p className="intake-step-description">Please confirm everything looks correct before submitting.</p>

        <div className="intake-review">
          <div className="intake-review-section">
            <h3>Contact Information</h3>
            <div className="intake-review-item">
              <span className="intake-review-label">Email:</span>
              <span className="intake-review-value">{formData.email}</span>
            </div>
            {formData.name && (
              <div className="intake-review-item">
                <span className="intake-review-label">Name:</span>
                <span className="intake-review-value">{formData.name}</span>
              </div>
            )}
            <div className="intake-review-item">
              <span className="intake-review-label">Project Address:</span>
              <span className="intake-review-value">{formData.projectAddress}</span>
            </div>
          </div>

          <div className="intake-review-section">
            <h3>Project Details</h3>
            <div className="intake-review-item">
              <span className="intake-review-label">Budget:</span>
              <span className="intake-review-value">{getBudgetLabel()}</span>
            </div>
            <div className="intake-review-item">
              <span className="intake-review-label">Timeline:</span>
              <span className="intake-review-value">{getTimelineLabel()}</span>
            </div>
            <div className="intake-review-item">
              <span className="intake-review-label">Project Type:</span>
              <span className="intake-review-value">{getProjectTypeLabel()}</span>
            </div>
          </div>

          <div className="intake-review-section">
            <h3>Existing Materials</h3>
            <div className="intake-review-item">
              <span className="intake-review-label">Property Survey:</span>
              <span className="intake-review-value">{formData.hasSurvey ? 'Yes' : 'No'}</span>
            </div>
            <div className="intake-review-item">
              <span className="intake-review-label">Drawings/Plans:</span>
              <span className="intake-review-value">{formData.hasDrawings ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentStep = (): React.JSX.Element => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="intake-form-container">
      <form className="intake-form" onSubmit={handleSubmit}>
        {renderProgressBar()}

        <div className="intake-content">
          {renderCurrentStep()}
        </div>

        <div className="intake-actions">
          {currentStep > 1 && (
            <button
              type="button"
              className="intake-btn intake-btn-secondary"
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </button>
          )}

          {onCancel && currentStep === 1 && (
            <button
              type="button"
              className="intake-btn intake-btn-secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
          )}

          <div className="intake-actions-spacer" />

          {currentStep < TOTAL_STEPS ? (
            <button
              type="button"
              className="intake-btn intake-btn-primary"
              onClick={handleNext}
              disabled={isLoading}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              className="intake-btn intake-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Submitting...' : 'Get My Recommendation'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default IntakeForm;
