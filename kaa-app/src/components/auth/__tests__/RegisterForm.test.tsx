/**
 * RegisterForm Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '../RegisterForm';

// Mock the auth context
const mockRegister = jest.fn();
const mockClearError = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render registration form', () => {
    render(<RegisterForm />);

    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should show email validation error', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should show password length error', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('should show password uppercase error', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'lowercase123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'lowercase123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must contain an uppercase letter')).toBeInTheDocument();
    });
  });

  it('should show password mismatch error', async () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'DifferentPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('should call register with valid data', async () => {
    mockRegister.mockResolvedValueOnce({});
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123',
        tier: undefined,
      });
    });
  });

  it('should pass default tier to register', async () => {
    mockRegister.mockResolvedValueOnce({});
    render(<RegisterForm defaultTier={2} />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123',
        tier: 2,
      });
    });
  });

  it('should call onSuccess after successful registration', async () => {
    mockRegister.mockResolvedValueOnce({});
    const onSuccess = jest.fn();
    render(<RegisterForm onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should call onLoginClick when login link is clicked', () => {
    const onLoginClick = jest.fn();
    render(<RegisterForm onLoginClick={onLoginClick} />);

    fireEvent.click(screen.getByText('Sign in'));

    expect(onLoginClick).toHaveBeenCalled();
  });

  it('should show terms and privacy links', () => {
    render(<RegisterForm />);

    expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });
});

describe('Password Strength Indicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not show strength indicator when password is empty', () => {
    render(<RegisterForm />);

    expect(screen.queryByText('Weak')).not.toBeInTheDocument();
    expect(screen.queryByText('Medium')).not.toBeInTheDocument();
    expect(screen.queryByText('Strong')).not.toBeInTheDocument();
  });

  it('should show weak strength for simple password', () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'abc' },
    });

    expect(screen.getByText('Weak')).toBeInTheDocument();
  });

  it('should show medium strength for decent password', () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'Password1' },
    });

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should show strong strength for complex password', () => {
    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ComplexP@ss123!' },
    });

    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});

describe('Validation Error Clearing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should clear email error when email is changed', async () => {
    render(<RegisterForm />);

    // Trigger validation error
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    // Change email to clear error
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' },
    });

    expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
  });
});
