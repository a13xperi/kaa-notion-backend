/**
 * Checkout Success Page
 * Displayed after successful Stripe payment.
 */

import { useState, useEffect } from 'react';
import { getCheckoutSessionStatus } from '../../api/checkoutApi';
import './CheckoutPages.css';

interface SessionDetails {
  id: string;
  status: string;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
  customerEmail: string;
}

// Helper to get URL params without react-router
function getSessionIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('session_id');
}

// Helper to navigate without react-router
function navigateTo(path: string): void {
  window.location.href = path;
}

export function CheckoutSuccess() {
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = getSessionIdFromUrl();

  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        const sessionData = await getCheckoutSessionStatus(sessionId);
        setSession(sessionData);
      } catch (err) {
        setError('Failed to verify payment');
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-loading">
            <div className="spinner" />
            <p>Verifying your payment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <div className="checkout-error">
            <span className="checkout-icon checkout-icon--error">⚠️</span>
            <h1>Payment Verification Issue</h1>
            <p>{error || 'Unable to verify payment status'}</p>
            <button
              className="checkout-button checkout-button--primary"
              onClick={() => navigateTo('/')}
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <div className="checkout-page checkout-page--success">
      <div className="checkout-container">
        <div className="checkout-content">
          <span className="checkout-icon checkout-icon--success">✓</span>
          <h1>Payment Successful!</h1>
          <p className="checkout-subtitle">
            Thank you for your purchase. Your project is being set up.
          </p>

          <div className="checkout-details">
            <div className="checkout-detail">
              <span className="checkout-detail__label">Amount Paid</span>
              <span className="checkout-detail__value">
                {formatAmount(session.amountTotal, session.currency)}
              </span>
            </div>
            <div className="checkout-detail">
              <span className="checkout-detail__label">Email</span>
              <span className="checkout-detail__value">{session.customerEmail}</span>
            </div>
            <div className="checkout-detail">
              <span className="checkout-detail__label">Status</span>
              <span className="checkout-detail__value checkout-detail__value--success">
                {session.paymentStatus === 'paid' ? 'Confirmed' : session.paymentStatus}
              </span>
            </div>
          </div>

          <div className="checkout-next-steps">
            <h2>What's Next?</h2>
            <ol>
              <li>Check your email for a confirmation and next steps</li>
              <li>Set up your account password when prompted</li>
              <li>Access your client portal to track your project</li>
            </ol>
          </div>

          <div className="checkout-actions">
            <button
              className="checkout-button checkout-button--primary"
              onClick={() => navigateTo('/portal')}
            >
              Go to Client Portal
            </button>
            <button
              className="checkout-button checkout-button--secondary"
              onClick={() => navigateTo('/')}
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutSuccess;
