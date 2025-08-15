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
        bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.08)] ring-1 ring-white/10 backdrop-blur-xl
        rounded-[18px] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] transition-colors duration-150 ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
