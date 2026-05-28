// components/layout/GlassCard.tsx
import React, { useCallback, useRef } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  spotlight?: boolean;
  variant?: 'default' | 'elevated' | 'float';
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = false,
  spotlight = true,
  variant = 'default'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !spotlight) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--spotlight-x', `${x}px`);
    cardRef.current.style.setProperty('--spotlight-y', `${y}px`);
  }, [spotlight]);

  const baseStyles = hover ? 'glass-card' : 'glass-card glass-card--static';

  const glowStyles = glow ? `
    glass-card--glow
  ` : '';

  const spotlightStyles = spotlight ? 'spotlight-card' : '';

  const variantStyles = {
    default: '',
    elevated: 'glass-card--elevated',
    float: 'glass-card--float'
  };

  return (
    <div
      ref={cardRef}
      className={`${baseStyles} ${glowStyles} ${spotlightStyles} ${variantStyles[variant]} ${className}`}
      style={{ willChange: hover ? 'transform, box-shadow' : 'auto' }}
      onMouseMove={handleMouseMove}
    >
      {children}
    </div>
  );
};

export default GlassCard;
