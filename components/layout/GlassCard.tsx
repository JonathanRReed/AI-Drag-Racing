// components/layout/GlassCard.tsx
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-white/5 border border-white/10 backdrop-blur-lg
        rounded-2xl shadow-lg ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
