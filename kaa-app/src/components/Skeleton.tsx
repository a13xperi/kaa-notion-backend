import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'stat' | 'page' | 'circle';
  width?: string;
  height?: string;
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  variant = 'text', 
  width = '100%', 
  height,
  count = 1
}) => {
  const getHeight = () => {
    if (height) return height;
    switch (variant) {
      case 'text': return '16px';
      case 'card': return '120px';
      case 'stat': return '140px';
      case 'page': return '80px';
      case 'circle': return '40px';
      default: return '16px';
    }
  };

  const getBorderRadius = () => {
    switch (variant) {
      case 'circle': return '50%';
      case 'text': return '4px';
      default: return '8px';
    }
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton skeleton-${variant}`}
      style={{
        width,
        height: getHeight(),
        borderRadius: getBorderRadius()
      }}
    />
  ));

  return <>{skeletons}</>;
};

export default Skeleton;


