/**
 * IntakeForm Component
 * Multi-step intake form with budget, timeline, project type, address, and assets.
 */

import React, { useState, useCallback, JSX } from 'react';
import { 
  IntakeFormData, 
  recommendTier, 
  TierRecommendation,
  ProjectType,
} from '../../utils/tierRouter';
import './IntakeForm.css';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeFormProps {
  onSubmit: (data: IntakeFormData, recommendation: TierRecommendation) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

interface FormData {
  // Step 1: Contact
  email: string;
  name: string;
  
  // Step 2: Project
  projectAddress: string;
  projectType: ProjectType | '';
  
  // Step 3: Budget & Timeline
  budget: number;
  budgetRange: string;
  timelineWeeks: number;
  timeline: string;
  
  // Step 4: Assets
  hasSurvey: boolean;
  hasDrawings: boolean;
  description: string;
}

interface ValidationErrors {
  [key: string]: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Contact Info', icon: '👤' },
  { id: 2, title: 'Project Details', icon: '🏠' },
  { id: 3, title: 'Budget & Timeline', icon: '💰' },
  { id: 4, title: 'Existing Assets', icon: '📄' },
];

const PROJECT_TYPES: { value: ProjectType; label: string; description: string }[] = [
  { value: 'simple_renovation', label: 'Simple Renovation', description: 'Minor updates to existing space' },
  { value: 'standard_renovation', label: 'Standard Renovation', description: 'Moderate changes to layout or finishes' },
  { value: 'small_addition', label: 'Small Addition', description: 'Expanding existing structure' },
  { value: 'standard_addition', label: 'Standard Addition', description: 'Significant new space addition' },
  { value: 'major_renovation', label: 'Major Renovation', description: 'Extensive structural changes' },
  { value: 'new_build', label: 'New Build', description: 'New construction from ground up' },
  { value: 'complex', label: 'Complex Project', description: 'Multi-phase or specialized requirements' },
  { value: 'multiple_properties', label: 'Multiple Properties', description: 'Portfolio or estate project' },
];

const BUDGET_RANGES = [
  { value: 'under_5k', label: 'Under $5,000', min: 2500, max: 5000 },
  { value: '5k_10k', label: '$5,000 - $10,000', min: 5000, max: 10000 },
  { value: '10k_15k', label: '$10,000 - $15,000', min: 10000, max: 15000 },
  { value: '15k_25k', label: '$15,000 - $25,000', min: 15000, max: 25000 },
  { value: '25k_35k', label: '$25,000 - $35,000', min: 25000, max: 35000 },
  { value: 'over_35k', label: 'Over $35,000', min: 35000, max: 100000 },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP (1-2 weeks)', weeks: 1 },
  { value: 'fast', label: 'Fast (2-4 weeks)', weeks: 3 },
  { value: 'standard', label: 'Standard (4-8 weeks)', weeks: 6 },
  { value: 'extended', label: 'Extended (8-12 weeks)', weeks: 10 },
  { value: 'flexible', label: 'Flexible (12+ weeks)', weeks: 16 },
];

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialFormData: FormData = {
  email: '',
  name: '',
  projectAddress: '',
  projectType: '',
  budget: 0,
  budgetRange: '',
  timelineWeeks: 0,
  timeline: '',
  hasSurvey: false,
  hasDrawings: false,
  description: '',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function IntakeForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: IntakeFormProps): JSX.Element {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateStep = useCallback((step: number): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        break;

      case 2:
        if (!formData.projectAddress.trim()) {
          newErrors.projectAddress = 'Project address is required';
        }
        if (!formData.projectType) {
          newErrors.projectType = 'Please select a project type';
        }
        break;

      case 3:
        if (!formData.budgetRange) {
          newErrors.budgetRange = 'Please select a budget range';
        }
        if (!formData.timeline) {
          newErrors.timeline = 'Please select a timeline';
        }
        break;

      case 4:
        // Assets step has no required fields
        break;
    }

    return newErrors;
  }, [formData]);

  const validateAllSteps = useCallback((): boolean => {
    let allErrors: ValidationErrors = {};
    for (let step = 1; step <= 4; step++) {
      const stepErrors = validateStep(step);
      allErrors = { ...allErrors, ...stepErrors };
    }
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  }, [validateStep]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Handle budget range selection
    if (name === 'budgetRange') {
      const budgetOption = BUDGET_RANGES.find((b) => b.value === value);
      if (budgetOption) {
        setFormData((prev) => ({
          ...prev,
          budget: Math.round((budgetOption.min + budgetOption.max) / 2),
        }));
      }
    }

    // Handle timeline selection
    if (name === 'timeline') {
      const timelineOption = TIMELINE_OPTIONS.find((t) => t.value === value);
      if (timelineOption) {
        setFormData((prev) => ({
          ...prev,
          timelineWeeks: timelineOption.weeks,
        }));
      }
    }

    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => new Set(prev).add(field));
    const stepErrors = validateStep(currentStep);
    if (stepErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: stepErrors[field] }));
    }
  }, [currentStep, validateStep]);

  const handleNextStep = useCallback(() => {
    const stepErrors = validateStep(currentStep);
    setErrors((prev) => ({ ...prev, ...stepErrors }));

    if (Object.keys(stepErrors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  }, [currentStep, validateStep]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllSteps()) {
      return;
    }

    // Build IntakeFormData with all fields including contact info
    const intakeData = {
      email: formData.email,
      name: formData.name,
      budget: formData.budget,
      budgetRange: formData.budgetRange,
      timelineWeeks: formData.timelineWeeks,
      timeline: formData.timeline,
      projectType: formData.projectType as ProjectType,
      hasSurvey: formData.hasSurvey,
      hasDrawings: formData.hasDrawings,
      projectAddress: formData.projectAddress,
      description: formData.description,
    };

    // Get tier recommendation
    const recommendation = recommendTier({
      budget: formData.budget,
      timelineWeeks: formData.timelineWeeks,
      projectType: formData.projectType as ProjectType,
      hasSurvey: formData.hasSurvey,
      hasDrawings: formData.hasDrawings,
      projectAddress: formData.projectAddress,
    });

    onSubmit(intakeData as any, recommendation);
  }, [formData, validateAllSteps, onSubmit]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStepIndicator = () => (
    <div className="intake-form__steps">
      {STEPS.map((step) => (
        <div
          key={step.id}
          className={`intake-form__step ${
            currentStep === step.id ? 'intake-form__step--active' : ''
          } ${currentStep > step.id ? 'intake-form__step--completed' : ''}`}
          onClick={() => currentStep > step.id && setCurrentStep(step.id)}
        >
          <span className="intake-form__step-icon">{step.icon}</span>
          <span className="intake-form__step-title">{step.title}</span>
          <span className="intake-form__step-number">{step.id}</span>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="intake-form__step-content">
      <h2 className="intake-form__step-heading">Let's get started</h2>
      <p className="intake-form__step-description">
        Tell us a bit about yourself so we can personalize your experience.
      </p>

      <div className="intake-form__field">
        <label htmlFor="name">Full Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          onBlur={() => handleBlur('name')}
          placeholder="Jane Smith"
          className={errors.name ? 'intake-form__input--error' : ''}
        />
        {errors.name && <span className="intake-form__error">{errors.name}</span>}
      </div>

      <div className="intake-form__field">
        <label htmlFor="email">Email Address *</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={() => handleBlur('email')}
          placeholder="jane@example.com"
          className={errors.email ? 'intake-form__input--error' : ''}
        />
        {errors.email && <span className="intake-form__error">{errors.email}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="intake-form__step-content">
      <h2 className="intake-form__step-heading">About Your Project</h2>
      <p className="intake-form__step-description">
        Tell us about the property and the type of project you're planning.
      </p>

      <div className="intake-form__field">
        <label htmlFor="projectAddress">Project Address *</label>
        <input
          type="text"
          id="projectAddress"
          name="projectAddress"
          value={formData.projectAddress}
          onChange={handleInputChange}
          onBlur={() => handleBlur('projectAddress')}
          placeholder="123 Main Street, City, State, ZIP"
          className={errors.projectAddress ? 'intake-form__input--error' : ''}
        />
        {errors.projectAddress && (
          <span className="intake-form__error">{errors.projectAddress}</span>
        )}
      </div>

      <div className="intake-form__field">
        <label>Project Type *</label>
        <div className="intake-form__project-types">
          {PROJECT_TYPES.map((type) => (
            <label
              key={type.value}
              className={`intake-form__project-type ${
                formData.projectType === type.value ? 'intake-form__project-type--selected' : ''
              }`}
            >
              <input
                type="radio"
                name="projectType"
                value={type.value}
                checked={formData.projectType === type.value}
                onChange={handleInputChange}
              />
              <span className="intake-form__project-type-label">{type.label}</span>
              <span className="intake-form__project-type-desc">{type.description}</span>
            </label>
          ))}
        </div>
        {errors.projectType && (
          <span className="intake-form__error">{errors.projectType}</span>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="intake-form__step-content">
      <h2 className="intake-form__step-heading">Budget & Timeline</h2>
      <p className="intake-form__step-description">
        Help us understand your budget and timeline expectations.
      </p>

      <div className="intake-form__field">
        <label>Budget Range *</label>
        <div className="intake-form__options">
          {BUDGET_RANGES.map((range) => (
            <label
              key={range.value}
              className={`intake-form__option ${
                formData.budgetRange === range.value ? 'intake-form__option--selected' : ''
              }`}
            >
              <input
                type="radio"
                name="budgetRange"
                value={range.value}
                checked={formData.budgetRange === range.value}
                onChange={handleInputChange}
              />
              <span className="intake-form__option-label">{range.label}</span>
            </label>
          ))}
        </div>
        {errors.budgetRange && (
          <span className="intake-form__error">{errors.budgetRange}</span>
        )}
      </div>

      <div className="intake-form__field">
        <label>Timeline *</label>
        <div className="intake-form__options">
          {TIMELINE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`intake-form__option ${
                formData.timeline === option.value ? 'intake-form__option--selected' : ''
              }`}
            >
              <input
                type="radio"
                name="timeline"
                value={option.value}
                checked={formData.timeline === option.value}
                onChange={handleInputChange}
              />
              <span className="intake-form__option-label">{option.label}</span>
            </label>
          ))}
        </div>
        {errors.timeline && (
          <span className="intake-form__error">{errors.timeline}</span>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="intake-form__step-content">
      <h2 className="intake-form__step-heading">Existing Assets</h2>
      <p className="intake-form__step-description">
        Let us know if you have any existing documents that can help speed up your project.
      </p>

      <div className="intake-form__field intake-form__field--checkbox">
        <label className="intake-form__checkbox">
          <input
            type="checkbox"
            name="hasSurvey"
            checked={formData.hasSurvey}
            onChange={handleInputChange}
          />
          <span className="intake-form__checkbox-label">
            📐 I have an existing property survey
          </span>
          <span className="intake-form__checkbox-desc">
            A professional survey of your property boundaries and topography
          </span>
        </label>
      </div>

      <div className="intake-form__field intake-form__field--checkbox">
        <label className="intake-form__checkbox">
          <input
            type="checkbox"
            name="hasDrawings"
            checked={formData.hasDrawings}
            onChange={handleInputChange}
          />
          <span className="intake-form__checkbox-label">
            📄 I have existing architectural drawings or plans
          </span>
          <span className="intake-form__checkbox-desc">
            Blueprints, floor plans, or CAD files for your property
          </span>
        </label>
      </div>

      <div className="intake-form__field">
        <label htmlFor="description">Additional Notes (optional)</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Tell us anything else we should know about your project..."
          rows={4}
        />
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Only submit if we're on the last step
    if (currentStep === STEPS.length) {
      handleSubmit(e);
    } else {
      // Otherwise, just move to next step
      handleNextStep();
    }
  }, [currentStep, handleSubmit, handleNextStep]);

  return (
    <form className="intake-form" onSubmit={handleFormSubmit}>
      {renderStepIndicator()}

      <div className="intake-form__content">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      <div className="intake-form__actions">
        {onCancel && currentStep === 1 && (
          <button
            type="button"
            className="intake-form__btn intake-form__btn--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}

        {currentStep > 1 && (
          <button
            type="button"
            className="intake-form__btn intake-form__btn--secondary"
            onClick={handlePrevStep}
          >
            ← Back
          </button>
        )}

        {currentStep < STEPS.length ? (
          <button
            type="submit"
            className="intake-form__btn intake-form__btn--primary"
            onClick={(e) => {
              e.preventDefault();
              handleNextStep();
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="submit"
            className="intake-form__btn intake-form__btn--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Get My Recommendation'}
          </button>
        )}
      </div>
    </form>
  );
}

export default IntakeForm;
