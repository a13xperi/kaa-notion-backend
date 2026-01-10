/**
 * Checkout Cancel Page
 * Displayed when user cancels Stripe payment.
 */

import './CheckoutPages.css';

// Helper to navigate without react-router
function navigateTo(path: string): void {
  window.location.href = path;
}

// Helper to go back
function goBack(): void {
  window.history.back();
}

export function CheckoutCancel() {
  return (
    <div className="checkout-page checkout-page--cancel">
      <div className="checkout-container">
        <div className="checkout-content">
          <span className="checkout-icon checkout-icon--cancel">✕</span>
          <h1>Payment Cancelled</h1>
          <p className="checkout-subtitle">
            Your payment was cancelled. No charges have been made.
          </p>

          <div className="checkout-info">
            <h2>What happened?</h2>
            <p>
              You cancelled the checkout process before completing payment.
              Your cart and any selected options have been preserved.
            </p>
          </div>

          <div className="checkout-help">
            <h2>Need Help?</h2>
            <ul>
              <li>Having trouble with payment? Try a different card.</li>
              <li>Questions about pricing? View our tier comparison.</li>
              <li>Need to talk? Contact our support team.</li>
            </ul>
          </div>

          <div className="checkout-actions">
            <button
              className="checkout-button checkout-button--primary"
              onClick={() => goBack()}
            >
              Try Again
            </button>
            <button
              className="checkout-button checkout-button--secondary"
              onClick={() => navigateTo('/pricing')}
            >
              View Pricing
            </button>
            <button
              className="checkout-button checkout-button--tertiary"
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

export default CheckoutCancel;
