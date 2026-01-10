import React, { useState, useEffect } from 'react';
import './SubscriptionManagement.css';

interface Subscription {
  id: string;
  tier: number;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
}

interface TierPricing {
  tier: number;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isCustom: boolean;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
  date: string;
  pdfUrl: string | null;
}

const TIER_FEATURES: Record<number, string[]> = {
  1: ['1 active project', 'Basic messaging', 'Email support'],
  2: [
    '3 active projects',
    'Priority messaging',
    'Phone support',
    'Revision tracking',
    'File storage 10GB',
  ],
  3: [
    '5 active projects',
    'Unlimited messaging',
    'Dedicated support',
    'Advanced analytics',
    'File storage 50GB',
    'Custom branding',
  ],
  4: [
    'Unlimited projects',
    'White glove service',
    '24/7 priority support',
    'Unlimited storage',
    'Custom integrations',
    'Personal account manager',
  ],
};

const SubscriptionManagement: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [pricing, setPricing] = useState<TierPricing[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [subRes, pricingRes, invoicesRes] = await Promise.all([
        fetch('/api/subscriptions', { headers }),
        fetch('/api/subscriptions/pricing'),
        fetch('/api/subscriptions/invoices', { headers }),
      ]);

      if (subRes.ok) {
        setSubscription(await subRes.json());
      }

      if (pricingRes.ok) {
        setPricing(await pricingRes.json());
      }

      if (invoicesRes.ok) {
        setInvoices(await invoicesRes.json());
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: number) => {
    if (tier === 4) {
      // Contact sales for enterprise
      window.location.href = 'mailto:sales@kaa-design.com?subject=Enterprise%20Inquiry';
      return;
    }

    setUpgrading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/settings/subscription?success=true`,
          cancelUrl: `${window.location.origin}/settings/subscription?canceled=true`,
        }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const handleChangeTier = async () => {
    if (!selectedTier) return;

    setUpgrading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscriptions/tier', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (res.ok) {
        setShowUpgradeModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error changing tier:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    try {
      const token = localStorage.getItem('token');
      await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancelImmediately: false }),
      });
      fetchData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/subscriptions/resume', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (error) {
      console.error('Error resuming subscription:', error);
    }
  };

  const openBillingPortal = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/subscriptions/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      ACTIVE: { bg: '#dcfce7', color: '#166534' },
      PAST_DUE: { bg: '#fef3c7', color: '#92400e' },
      CANCELED: { bg: '#fee2e2', color: '#991b1b' },
      TRIAL: { bg: '#dbeafe', color: '#1d4ed8' },
      PENDING: { bg: '#f3f4f6', color: '#6b7280' },
    };
    const style = styles[status] || styles.PENDING;
    return (
      <span
        className="status-badge"
        style={{ background: style.bg, color: style.color }}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const currentTier = pricing.find((p) => p.tier === subscription?.tier);

  if (loading) {
    return (
      <div className="subscription-management">
        <div className="loading-skeleton">
          <div className="skeleton-block large" />
          <div className="skeleton-row">
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-management">
      <div className="page-header">
        <h1>Subscription</h1>
        <p>Manage your subscription and billing</p>
      </div>

      {/* Current Plan */}
      {subscription && (
        <div className="current-plan-card">
          <div className="plan-header">
            <div className="plan-info">
              <div className="plan-tier">
                <span className="tier-badge">T{subscription.tier}</span>
                <h2>{currentTier?.name || 'Unknown'}</h2>
                {getStatusBadge(subscription.status)}
              </div>
              {currentTier && currentTier.monthlyPrice > 0 && (
                <div className="plan-price">
                  <span className="amount">${currentTier.monthlyPrice}</span>
                  <span className="period">/month</span>
                </div>
              )}
            </div>
            <div className="plan-actions">
              {subscription.cancelAtPeriodEnd ? (
                <button className="resume-btn" onClick={handleResumeSubscription}>
                  Resume Subscription
                </button>
              ) : subscription.tier > 1 ? (
                <button className="cancel-btn" onClick={handleCancelSubscription}>
                  Cancel
                </button>
              ) : null}
              <button className="billing-btn" onClick={openBillingPortal}>
                Manage Billing
              </button>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="cancel-notice">
              Your subscription will be canceled on{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}

          <div className="plan-details">
            <div className="detail-item">
              <span className="label">Billing Period</span>
              <span className="value">
                {new Date(subscription.currentPeriodStart).toLocaleDateString()} -{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
            {subscription.lastPaymentDate && (
              <div className="detail-item">
                <span className="label">Last Payment</span>
                <span className="value">
                  ${(subscription.lastPaymentAmount || 0) / 100} on{' '}
                  {new Date(subscription.lastPaymentDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="plan-features">
            <h4>Plan Features</h4>
            <ul>
              {TIER_FEATURES[subscription.tier]?.map((feature, i) => (
                <li key={i}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.5 4L6 11.5L2.5 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Pricing Tiers */}
      <div className="pricing-section">
        <h2>Available Plans</h2>
        <div className="pricing-grid">
          {pricing.map((tier) => (
            <div
              key={tier.tier}
              className={`pricing-card ${
                tier.tier === subscription?.tier ? 'current' : ''
              }`}
            >
              {tier.tier === 3 && <div className="popular-badge">Popular</div>}
              <div className="pricing-header">
                <span className="tier-num">Tier {tier.tier}</span>
                <h3>{tier.name}</h3>
                {tier.isCustom ? (
                  <div className="price custom">Custom</div>
                ) : (
                  <div className="price">
                    <span className="amount">
                      ${tier.monthlyPrice === 0 ? '0' : tier.monthlyPrice}
                    </span>
                    {tier.monthlyPrice > 0 && (
                      <span className="period">/mo</span>
                    )}
                  </div>
                )}
              </div>

              <ul className="features-list">
                {TIER_FEATURES[tier.tier]?.map((feature, i) => (
                  <li key={i}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13.5 4L6 11.5L2.5 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.tier === subscription?.tier ? (
                <button className="pricing-btn current" disabled>
                  Current Plan
                </button>
              ) : tier.tier > (subscription?.tier || 0) ? (
                <button
                  className="pricing-btn upgrade"
                  onClick={() => handleUpgrade(tier.tier)}
                  disabled={upgrading}
                >
                  {tier.isCustom ? 'Contact Sales' : 'Upgrade'}
                </button>
              ) : (
                <button
                  className="pricing-btn downgrade"
                  onClick={() => {
                    setSelectedTier(tier.tier);
                    setShowUpgradeModal(true);
                  }}
                >
                  Downgrade
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div className="invoices-section">
          <h2>Invoice History</h2>
          <div className="invoices-table">
            <div className="table-header">
              <span>Invoice</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Download</span>
            </div>
            {invoices.map((invoice) => (
              <div key={invoice.id} className="table-row">
                <span className="invoice-number">{invoice.number}</span>
                <span className="invoice-date">
                  {new Date(invoice.date).toLocaleDateString()}
                </span>
                <span className="invoice-amount">${invoice.amount}</span>
                <span className={`invoice-status ${invoice.status}`}>
                  {invoice.status}
                </span>
                <span>
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-link"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4.66667 6.66667L8 10L11.3333 6.66667"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 10V2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      PDF
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downgrade Modal */}
      {showUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Plan Change</h2>
            <p>
              Are you sure you want to downgrade to{' '}
              {pricing.find((p) => p.tier === selectedTier)?.name}?
            </p>
            <p className="warning">
              You will lose access to features not included in the new plan.
            </p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowUpgradeModal(false)}
              >
                Keep Current Plan
              </button>
              <button
                className="confirm-btn"
                onClick={handleChangeTier}
                disabled={upgrading}
              >
                {upgrading ? 'Processing...' : 'Confirm Downgrade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
