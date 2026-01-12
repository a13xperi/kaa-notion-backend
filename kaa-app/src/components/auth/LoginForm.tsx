/**
 * Login Form Component
 * Handles user authentication with email and password.
 */

import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './AuthForms.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setLocalError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`);
      const data = await response.json();
      
      if (data.success && data.data?.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.data.authUrl;
      } else {
        setLocalError('Google Sign In is not available');
        setIsGoogleLoading(false);
      }
    } catch (err) {
      setLocalError('Failed to connect to Google Sign In');
      setIsGoogleLoading(false);
    }
  };

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
          disabled={isLoading || isGoogleLoading}
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

        <div className="auth-form__divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-form__google-btn"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <>
              <span className="auth-form__spinner" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="auth-form__google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
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
