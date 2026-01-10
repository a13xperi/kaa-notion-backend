/**
 * SAGE Landing Page Component
 * Overview page for SAGE landscape design services at /sage
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import SageLogo from '../SageLogo';
import './SageLanding.css';

export function SageLanding() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/sage/get-started');
  };

  const handleViewTiers = () => {
    navigate('/sage/tiers');
  };

  const handleViewPricing = () => {
    navigate('/pricing');
  };

  return (
    <div className="sage-landing">
      <div className="sage-landing__container">
        {/* Header */}
        <div className="sage-landing__header">
          <SageLogo size="xlarge" showText={true} className="sage-landing__logo" />
          <h1 className="sage-landing__title">SAGE Landscape Design</h1>
          <p className="sage-landing__subtitle">
            Professional landscape architecture services tailored to your needs and budget
          </p>
        </div>

        {/* Hero Section */}
        <div className="sage-landing__hero">
          <h2 className="sage-landing__hero-title">
            Transform Your Outdoor Space
          </h2>
          <p className="sage-landing__hero-description">
            From DIY guidance to full-service design, SAGE offers three tiers of professional landscape 
            design services. Choose the level of support that fits your project.
          </p>
          <div className="sage-landing__cta">
            <button
              className="sage-landing__cta-primary"
              onClick={handleGetStarted}
              type="button"
            >
              Get Started →
            </button>
            <button
              className="sage-landing__cta-secondary"
              onClick={handleViewTiers}
              type="button"
            >
              View Service Tiers
            </button>
          </div>
        </div>

        {/* Quick Overview Cards */}
        <div className="sage-landing__tier-cards">
          <div className="sage-landing__tier-card">
            <div className="sage-landing__tier-number">1</div>
            <h3 className="sage-landing__tier-name">The Concept</h3>
            <p className="sage-landing__tier-price">$299</p>
            <p className="sage-landing__tier-description">
              DIY guidance and automated design concepts for simple projects
            </p>
            <ul className="sage-landing__tier-features">
              <li>AI-generated design concept</li>
              <li>Plant palette suggestions</li>
              <li>Basic layout recommendations</li>
              <li>7-day turnaround</li>
            </ul>
          </div>

          <div className="sage-landing__tier-card sage-landing__tier-card--popular">
            <div className="sage-landing__tier-badge">Most Popular</div>
            <div className="sage-landing__tier-number">2</div>
            <h3 className="sage-landing__tier-name">The Builder</h3>
            <p className="sage-landing__tier-price">$1,499</p>
            <p className="sage-landing__tier-description">
              Complete design package with consultation and revisions
            </p>
            <ul className="sage-landing__tier-features">
              <li>Everything in Tier 1</li>
              <li>Custom design consultation</li>
              <li>Two revision rounds</li>
              <li>Detailed planting plan</li>
              <li>14-day turnaround</li>
            </ul>
          </div>

          <div className="sage-landing__tier-card">
            <div className="sage-landing__tier-number">3</div>
            <h3 className="sage-landing__tier-name">The Concierge</h3>
            <p className="sage-landing__tier-price">$4,999+</p>
            <p className="sage-landing__tier-description">
              Full-service experience with site visits and project management
            </p>
            <ul className="sage-landing__tier-features">
              <li>Everything in Tier 2</li>
              <li>On-site consultation</li>
              <li>Professional site survey</li>
              <li>Unlimited revisions</li>
              <li>Contractor coordination</li>
              <li>30-day turnaround</li>
            </ul>
          </div>
        </div>

        {/* How It Works */}
        <div className="sage-landing__how-it-works">
          <h2 className="sage-landing__section-title">How It Works</h2>
          <div className="sage-landing__steps">
            <div className="sage-landing__step">
              <div className="sage-landing__step-number">1</div>
              <h3 className="sage-landing__step-title">Tell Us About Your Project</h3>
              <p className="sage-landing__step-description">
                Fill out a simple intake form with your project details, budget, and timeline.
              </p>
            </div>
            <div className="sage-landing__step">
              <div className="sage-landing__step-number">2</div>
              <h3 className="sage-landing__step-title">We Recommend the Best Tier</h3>
              <p className="sage-landing__step-description">
                Our system analyzes your project and recommends the perfect service tier for your needs.
              </p>
            </div>
            <div className="sage-landing__step">
              <div className="sage-landing__step-number">3</div>
              <h3 className="sage-landing__step-title">Get Your Design</h3>
              <p className="sage-landing__step-description">
                Receive your custom landscape design package and start transforming your space.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="sage-landing__final-cta">
          <h2 className="sage-landing__cta-title">Ready to Get Started?</h2>
          <p className="sage-landing__cta-description">
            Take our quick intake form and discover which service tier is right for your project.
          </p>
          <button
            className="sage-landing__cta-primary sage-landing__cta-primary--large"
            onClick={handleGetStarted}
            type="button"
          >
            Start Your Project →
          </button>
        </div>

        {/* Tier 4 Notice */}
        <div className="sage-landing__tier4-notice">
          <p className="sage-landing__tier4-text">
            Looking for premium white-glove service? <strong>KAA Tier 4</strong> offers full-service 
            estate and commercial projects. <a href="/apply" className="sage-landing__tier4-link">Apply here</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SageLanding;
