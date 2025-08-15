// components/main/CountdownOverlay.tsx
import React from 'react';

interface CountdownOverlayProps {
  visible: boolean;
  value: number | 'Go!';
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ visible, value }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-white font-extrabold select-none" style={{ textShadow: '0 0 30px rgba(56,189,248,0.7)' }}>
        <div className="text-7xl md:text-8xl tracking-wider">
          {value}
        </div>
      </div>
    </div>
  );
};

export default CountdownOverlay;
