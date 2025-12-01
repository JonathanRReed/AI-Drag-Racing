// components/main/CountdownOverlay.tsx
import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
  visible: boolean;
  value: number | 'Go!';
}

// Christmas tree light component
const TreeLight: React.FC<{ active: boolean; color: 'yellow' | 'green' }> = ({ active, color }) => {
  const colorClasses = {
    yellow: active ? 'race-light-yellow' : 'race-light-off',
    green: active ? 'race-light-green' : 'race-light-off',
  };
  
  return (
    <div className="flex gap-6 justify-center">
      <div className={`w-6 h-6 rounded-full race-light ${colorClasses[color]} transition-all duration-150`} />
      <div className={`w-6 h-6 rounded-full race-light ${colorClasses[color]} transition-all duration-150`} />
    </div>
  );
};

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ visible, value }) => {
  const [animKey, setAnimKey] = useState(0);

  // Reset animation key when value changes for pop effect
  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [value]);

  if (!visible) return null;

  const isGo = value === 'Go!';
  // Determine which lights are active based on countdown
  // 3 = first yellow pair, 2 = first two yellow pairs, 1 = all three yellow pairs, Go! = green
  const yellowLights = typeof value === 'number' ? Math.max(0, 4 - value) : 3;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md">
      {/* Background racing stripes */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px)',
        }}
      />
      
      <div className="flex flex-col items-center gap-8">
        {/* Christmas Tree Housing */}
        <div className="relative bg-zinc-900/90 rounded-2xl p-6 border border-white/10 shadow-2xl">
          {/* Decorative top */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-2 bg-zinc-800 rounded-full border border-white/10" />
          
          {/* Light rows */}
          <div className="flex flex-col gap-4">
            {/* Pre-stage (always dim in countdown) */}
            <TreeLight active={false} color="yellow" />
            
            {/* Stage (lights up first) */}
            <TreeLight active={yellowLights >= 1} color="yellow" />
            
            {/* Amber 1 */}
            <TreeLight active={yellowLights >= 2} color="yellow" />
            
            {/* Amber 2 */}
            <TreeLight active={yellowLights >= 3} color="yellow" />
            
            {/* Green - GO! */}
            <TreeLight active={isGo} color="green" />
          </div>
          
          {/* Decorative bottom */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-2 bg-zinc-800 rounded-full border border-white/10" />
        </div>
        
        {/* Large countdown text */}
        <div 
          key={animKey}
          className={`font-extrabold select-none animate-countdown-pop ${isGo ? 'text-[var(--race-green)]' : 'text-white'}`}
          style={{ 
            textShadow: isGo 
              ? '0 0 40px rgba(34,197,94,0.8), 0 0 80px rgba(34,197,94,0.4)' 
              : '0 0 30px rgba(250,204,21,0.6), 0 0 60px rgba(250,204,21,0.3)'
          }}
        >
          <div className="text-8xl md:text-9xl tracking-wider font-mono">
            {value}
          </div>
        </div>
        
        {/* Instruction text */}
        <p className="text-white/50 text-sm uppercase tracking-widest">
          {isGo ? 'Race Started!' : 'Get Ready...'}
        </p>
      </div>
    </div>
  );
};

export default CountdownOverlay;
