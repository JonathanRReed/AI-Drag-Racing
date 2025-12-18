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

  const baseStyles = `
    bg-[var(--panel)] backdrop-blur-2xl rounded-[20px] overflow-hidden
    border border-[var(--ring)]
    shadow-[0_4px_32px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.15),inset_0_1px_0_0_rgba(255,255,255,0.06)]
    transition-all duration-200
  `;

  const hoverStyles = hover ? `
    hover:bg-[var(--panel-elev)] hover:border-[var(--ring-hover)]
    hover:shadow-[0_8px_40px_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.2),inset_0_1px_0_0_rgba(255,255,255,0.08)]
    hover:translate-y-[-1px]
  ` : '';

  const glowStyles = glow ? `
    shadow-[0_0_20px_rgba(34,211,238,0.12),0_4px_32px_rgba(0,0,0,0.25)]
    border-[rgba(34,211,238,0.15)]
  ` : '';

  const spotlightStyles = spotlight ? 'spotlight-card' : '';

  const variantStyles = {
    default: '',
    elevated: 'bg-[var(--panel-elev)] shadow-[var(--shadow-elevated)]',
    float: 'shadow-[var(--shadow-float),0_0_0_1px_var(--ring)]'
  };

  return (
    <div
      ref={cardRef}
      className={`${baseStyles} ${hoverStyles} ${glowStyles} ${spotlightStyles} ${variantStyles[variant]} ${className}`}
      style={{ willChange: hover ? 'transform, box-shadow' : 'auto' }}
      onMouseMove={handleMouseMove}
    >
      {children}
    </div>
  );
};

export default GlassCard;
