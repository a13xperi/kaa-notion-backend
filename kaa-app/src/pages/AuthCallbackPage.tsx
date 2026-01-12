/**
 * OAuth Callback Page
 * Handles the redirect from OAuth providers (Google) after authentication.
 * Extracts tokens from URL params, stores them, and redirects to portal.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storeAuth, getProfile } from '../api/authApi';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const errorParam = searchParams.get('error');

        // Check for OAuth errors
        if (errorParam) {
          setError(errorParam);
          setIsProcessing(false);
          return;
        }

        // Validate tokens
        if (!token) {
          setError('No authentication token received');
          setIsProcessing(false);
          return;
        }

        // Store the token temporarily to make API calls
        localStorage.setItem('sage_auth_token', token);
        if (refreshToken) {
          localStorage.setItem('sage_refresh_token', refreshToken);
        }

        // Fetch user profile to get user data
        try {
          const profile = await getProfile();
          
          // Store full auth data
          storeAuth(token, {
            id: profile.id,
            email: profile.email || '',
            userType: profile.userType,
            tier: profile.tier,
          });

          // Redirect to portal
          navigate('/portal', { replace: true });
        } catch (profileError) {
          console.error('Failed to fetch profile:', profileError);
          setError('Failed to complete authentication. Please try again.');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Authentication failed. Please try again.');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="auth-callback-page">
        <div className="auth-callback-page__container">
          <div className="auth-callback-page__error">
            <h1>Authentication Error</h1>
            <p>{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="auth-callback-page__button"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-page__container">
        <div className="auth-callback-page__loading">
          <div className="auth-callback-page__spinner" />
          <h1>Completing sign in...</h1>
          <p>Please wait while we verify your authentication.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthCallbackPage;
