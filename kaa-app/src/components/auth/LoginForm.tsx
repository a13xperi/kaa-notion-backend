/**
 * Login Form Component
 * Handles user authentication with email and password.
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AuthForms.css';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Basic validation
    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login({ email, password });
      onSuccess?.();
    } catch (err) {
      // Error is handled by context
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-form">
      <div className="auth-form__header">
        <h2 className="auth-form__title">Sage in your garden wizard</h2>
        <p className="auth-form__subtitle">Sign in to access your projects</p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form__form">
        {displayError && (
          <div className="auth-form__error">
            <span className="auth-form__error-icon">⚠️</span>
            {displayError}
          </div>
        )}

        <div className="auth-form__field">
          <label htmlFor="email" className="auth-form__label">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            className="auth-form__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="auth-form__field">
          <label htmlFor="password" className="auth-form__label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="auth-form__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        <div className="auth-form__forgot">
          <a href="/forgot-password" className="auth-form__link">
            Forgot your password?
          </a>
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="auth-form__spinner" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="auth-form__footer">
        <p>
          Don't have an account?{' '}
          <button
            type="button"
            className="auth-form__link-button"
            onClick={onRegisterClick}
          >
            Get started
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginForm;
