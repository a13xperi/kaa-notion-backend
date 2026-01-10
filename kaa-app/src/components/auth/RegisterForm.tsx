/**
 * Register Form Component
 * Handles new user registration with validation.
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AuthForms.css';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
  defaultTier?: number;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterForm({ onSuccess, onLoginClick, defaultTier }: RegisterFormProps) {
  const { register, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain an uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must contain a lowercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain a number';
    }

    // Confirm password
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await register({ email, password, tier: defaultTier });
      onSuccess?.();
    } catch (err) {
      // Error is handled by context
    }
  };

  const getPasswordStrength = (): { level: number; label: string; color: string } => {
    if (!password) return { level: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 4) return { level: 2, label: 'Medium', color: '#f59e0b' };
    return { level: 3, label: 'Strong', color: '#22c55e' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="auth-form">
      <div className="auth-form__header">
        <h2 className="auth-form__title">Create Your Account</h2>
        <p className="auth-form__subtitle">Start your landscape design journey</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form__form">
        {error && (
          <div className="auth-form__error">
            <span className="auth-form__error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="auth-form__field">
          <label htmlFor="email" className="auth-form__label">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className={`auth-form__input ${validationErrors.email ? 'auth-form__input--error' : ''}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErrors.email) {
                setValidationErrors({ ...validationErrors, email: undefined });
              }
            }}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoading}
          />
          {validationErrors.email && (
            <span className="auth-form__field-error">{validationErrors.email}</span>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="password" className="auth-form__label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={`auth-form__input ${validationErrors.password ? 'auth-form__input--error' : ''}`}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors({ ...validationErrors, password: undefined });
              }
            }}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
          />
          {password && (
            <div className="auth-form__password-strength">
              <div className="auth-form__strength-bar">
                <div
                  className="auth-form__strength-fill"
                  style={{
                    width: `${(passwordStrength.level / 3) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <span
                className="auth-form__strength-label"
                style={{ color: passwordStrength.color }}
              >
                {passwordStrength.label}
              </span>
            </div>
          )}
          {validationErrors.password && (
            <span className="auth-form__field-error">{validationErrors.password}</span>
          )}
        </div>

        <div className="auth-form__field">
          <label htmlFor="confirmPassword" className="auth-form__label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className={`auth-form__input ${validationErrors.confirmPassword ? 'auth-form__input--error' : ''}`}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (validationErrors.confirmPassword) {
                setValidationErrors({ ...validationErrors, confirmPassword: undefined });
              }
            }}
            placeholder="••••••••"
            autoComplete="new-password"
            disabled={isLoading}
          />
          {validationErrors.confirmPassword && (
            <span className="auth-form__field-error">{validationErrors.confirmPassword}</span>
          )}
        </div>

        <div className="auth-form__terms">
          <p>
            By creating an account, you agree to our{' '}
            <a href="/terms" className="auth-form__link">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="auth-form__link">Privacy Policy</a>.
          </p>
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="auth-form__spinner" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div className="auth-form__footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            className="auth-form__link-button"
            onClick={onLoginClick}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default RegisterForm;
