/**
 * IntakeForm Component Tests
 *
 * Tests for form validation, multi-step navigation, and submission.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import IntakeForm from '../IntakeForm';

// Mock CSS import
jest.mock('../IntakeForm.css', () => ({}));

describe('IntakeForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderIntakeForm = (props = {}) => {
    return render(
      <IntakeForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    );
  };

  describe('Initial Rendering', () => {
    it('should render step 1 by default', () => {
      renderIntakeForm();

      expect(screen.getByText("Let's get started")).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/project address/i)).toBeInTheDocument();
    });

    it('should render progress bar with 5 steps', () => {
      renderIntakeForm();

      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Budget')).toBeInTheDocument();
      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('should render Continue button on step 1', () => {
      renderIntakeForm();

      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
    });

    it('should render Cancel button when onCancel is provided', () => {
      renderIntakeForm();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Step 1 - Contact Information', () => {
    it('should validate email format', async () => {
      renderIntakeForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const continueButton = screen.getByRole('button', { name: /continue/i });

      // Enter invalid email
      await userEvent.type(emailInput, 'invalid-email');
      fireEvent.click(continueButton);

      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });

    it('should require email', async () => {
      renderIntakeForm();

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });

    it('should require project address', async () => {
      renderIntakeForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const continueButton = screen.getByRole('button', { name: /continue/i });

      await userEvent.type(emailInput, 'valid@email.com');
      fireEvent.click(continueButton);

      expect(screen.getByText(/please enter a valid project address/i)).toBeInTheDocument();
    });

    it('should allow optional name field', async () => {
      renderIntakeForm();

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const addressInput = screen.getByLabelText(/project address/i);
      const continueButton = screen.getByRole('button', { name: /continue/i });

      await userEvent.type(emailInput, 'valid@email.com');
      await userEvent.type(addressInput, '123 Main St, City, ST 12345');
      // Name left empty - should still proceed
      fireEvent.click(continueButton);

      // Should advance to step 2
      expect(screen.getByText(/what's your budget/i)).toBeInTheDocument();
    });

    it('should clear error when user types', async () => {
      renderIntakeForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const continueButton = screen.getByRole('button', { name: /continue/i });

      fireEvent.click(continueButton);
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();

      await userEvent.type(emailInput, 'v');
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Step 2 - Budget Selection', () => {
    const advanceToStep2 = async () => {
      renderIntakeForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const addressInput = screen.getByLabelText(/project address/i);
      const continueButton = screen.getByRole('button', { name: /continue/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(addressInput, '123 Main St, City, ST 12345');
      fireEvent.click(continueButton);
    };

    it('should display budget options', async () => {
      await advanceToStep2();

      expect(screen.getByText(/what's your budget/i)).toBeInTheDocument();
      expect(screen.getByText('Under $500')).toBeInTheDocument();
      expect(screen.getByText('$500 - $2,000')).toBeInTheDocument();
      expect(screen.getByText('$50,000+')).toBeInTheDocument();
    });

    it('should require budget selection', async () => {
      await advanceToStep2();

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      expect(screen.getByText(/please select a budget range/i)).toBeInTheDocument();
    });

    it('should allow selecting a budget option', async () => {
      await advanceToStep2();

      const budgetOption = screen.getByLabelText(/\$2,000 - \$5,000/i);
      fireEvent.click(budgetOption);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      // Should advance to step 3
      expect(screen.getByText(/when do you need this done/i)).toBeInTheDocument();
    });

    it('should show Back button', async () => {
      await advanceToStep2();

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should navigate back to previous step', async () => {
      renderIntakeForm();

      // Fill step 1
      const emailInput = screen.getByLabelText(/email address/i);
      const addressInput = screen.getByLabelText(/project address/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(addressInput, '123 Main St, City, ST 12345');

      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Now on step 2
      expect(screen.getByText(/what's your budget/i)).toBeInTheDocument();

      // Go back
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // Should be back on step 1
      expect(screen.getByText("Let's get started")).toBeInTheDocument();
    });

    it('should preserve form data when navigating', async () => {
      renderIntakeForm();

      const emailInput = screen.getByLabelText(/email address/i);
      const addressInput = screen.getByLabelText(/project address/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(addressInput, '123 Main St, City, ST 12345');

      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Select budget
      fireEvent.click(screen.getByLabelText(/\$2,000 - \$5,000/i));

      // Go back to step 1
      fireEvent.click(screen.getByRole('button', { name: /back/i }));

      // Data should be preserved
      expect(screen.getByLabelText(/email address/i)).toHaveValue('test@example.com');
    });
  });

  describe('Step 4 - Project Type & Materials', () => {
    const advanceToStep4 = async () => {
      renderIntakeForm();

      // Step 1
      await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/project address/i), '123 Main St');
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2
      fireEvent.click(screen.getByLabelText(/\$2,000 - \$5,000/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3
      fireEvent.click(screen.getByLabelText(/2-4 weeks/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    };

    it('should display project type options', async () => {
      await advanceToStep4();

      expect(screen.getByText(/what type of project is this/i)).toBeInTheDocument();
      expect(screen.getByText('Simple Consultation')).toBeInTheDocument();
      expect(screen.getByText('Standard Renovation')).toBeInTheDocument();
      expect(screen.getByText('New Build')).toBeInTheDocument();
    });

    it('should display material checkboxes', async () => {
      await advanceToStep4();

      expect(screen.getByText(/I have a property survey/i)).toBeInTheDocument();
      expect(screen.getByText(/I have existing drawings or plans/i)).toBeInTheDocument();
    });

    it('should allow toggling checkboxes', async () => {
      await advanceToStep4();

      const surveyCheckbox = screen.getByRole('checkbox', { name: /property survey/i });
      const drawingsCheckbox = screen.getByRole('checkbox', { name: /drawings or plans/i });

      expect(surveyCheckbox).not.toBeChecked();
      expect(drawingsCheckbox).not.toBeChecked();

      fireEvent.click(surveyCheckbox);
      fireEvent.click(drawingsCheckbox);

      expect(surveyCheckbox).toBeChecked();
      expect(drawingsCheckbox).toBeChecked();
    });
  });

  describe('Step 5 - Review', () => {
    const advanceToStep5 = async () => {
      renderIntakeForm();

      // Step 1
      await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/your name/i), 'John Doe');
      await userEvent.type(screen.getByLabelText(/project address/i), '123 Main St, City, ST 12345');
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 2
      fireEvent.click(screen.getByLabelText(/\$5,000 - \$15,000/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 3
      fireEvent.click(screen.getByLabelText(/1-2 months/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Step 4
      fireEvent.click(screen.getByLabelText(/standard renovation/i));
      fireEvent.click(screen.getByRole('checkbox', { name: /property survey/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    };

    it('should display review with all entered data', async () => {
      await advanceToStep5();

      expect(screen.getByText(/review your information/i)).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('123 Main St, City, ST 12345')).toBeInTheDocument();
      expect(screen.getByText('$5,000 - $15,000')).toBeInTheDocument();
      expect(screen.getByText('1-2 months')).toBeInTheDocument();
      expect(screen.getByText('Standard Renovation')).toBeInTheDocument();
    });

    it('should display submit button on review step', async () => {
      await advanceToStep5();

      expect(screen.getByRole('button', { name: /get my recommendation/i })).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderIntakeForm();

      // Complete all steps
      await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/project address/i), '123 Main St');
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      fireEvent.click(screen.getByLabelText(/\$2,000 - \$5,000/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      fireEvent.click(screen.getByLabelText(/2-4 weeks/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      fireEvent.click(screen.getByLabelText(/small renovation/i));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /get my recommendation/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          name: '',
          projectAddress: '123 Main St',
          budgetRange: '2000_5000',
          timeline: '2_4_weeks',
          projectType: 'small_renovation',
          hasSurvey: false,
          hasDrawings: false,
        });
      });
    });

    it('should show loading state when isLoading is true', () => {
      renderIntakeForm({ isLoading: true });

      expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    });

    it('should disable buttons when loading', () => {
      renderIntakeForm({ isLoading: true });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria labels for radio groups', async () => {
      renderIntakeForm();

      await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/project address/i), '123 Main St');
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByRole('radiogroup', { name: /budget range/i })).toBeInTheDocument();
    });

    it('should have aria-invalid on fields with errors', async () => {
      renderIntakeForm();

      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have aria-describedby linking errors', async () => {
      renderIntakeForm();

      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when Cancel button is clicked', () => {
      renderIntakeForm();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not show Cancel button after step 1', async () => {
      renderIntakeForm();

      await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/project address/i), '123 Main St');
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });
});
