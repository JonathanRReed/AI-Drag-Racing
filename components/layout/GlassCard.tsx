// components/layout/GlassCard.tsx
//
// The shared panel surface. The name is historical: the glass, glow and cursor
// spotlight are gone, and this is now a solid pit-wall panel. The old props are
// still accepted so existing call sites keep working.
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  spotlight?: boolean;
  variant?: 'default' | 'elevated' | 'float';
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => (
  <div className={`panel ${className}`.trim()}>{children}</div>
);

export default GlassCard;
