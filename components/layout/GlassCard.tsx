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
        bg-[var(--panel)] hover:bg-[var(--panel-elev)] ring-1 ring-[var(--ring)] backdrop-blur-xl
        rounded-[18px] overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22)] transition-colors duration-150 ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
