import React from 'react';
import './SageLogo.css';

interface SageLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  showText?: boolean;
  className?: string;
}

/**
 * SAGE Garden Wizard Logo Component
 * Displays the SAGE logo with optional text
 */
const SageLogo: React.FC<SageLogoProps> = ({ 
  size = 'medium', 
  showText = false,
  className = '' 
}) => {
  const sizeClass = `sage-logo-${size}`;
  
  return (
    <div className={`sage-logo ${sizeClass} ${className}`}>
      <img 
        src="/sage-logo.png" 
        alt="SAGE Garden Wizard Logo" 
        className="sage-logo-image"
        onError={(e) => {
          // Fallback to emoji if image not found
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement) {
            const fallback = document.createElement('div');
            fallback.className = 'sage-logo-fallback';
            fallback.textContent = '🧙‍♀️';
            fallback.setAttribute('aria-label', 'SAGE Garden Wizard');
            target.parentElement.appendChild(fallback);
          }
        }}
      />
      {showText && (
        <div className="sage-logo-text">
          <span className="sage-logo-title">SAGE</span>
          <span className="sage-logo-subtitle">Garden Wizard</span>
        </div>
      )}
    </div>
  );
};

export default SageLogo;
