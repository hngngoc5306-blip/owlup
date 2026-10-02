import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  isNight?: boolean;
  showText?: boolean;
  showSubtitle?: boolean;
  variant?: 'header' | 'footer' | 'default';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  isNight = true,
  showText = true,
  showSubtitle = true,
  variant = 'default',
  className = '',
}) => {
  const pixelSize = size === 'sm' ? 36 : size === 'lg' ? 54 : 44;

  if (variant === 'header') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <div className="font-heading font-extrabold tracking-tight leading-none" style={{ fontSize: size === 'sm' ? '22px' : size === 'lg' ? '32px' : '26px' }}>
          <span style={{ color: isNight ? '#F8FAFC' : '#1F2937' }}>Owl</span>
          <span style={{ color: '#4CB28E' }}>Up</span>
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`inline-flex items-center justify-center gap-4 ${className}`}>
        <div
          className="relative flex-shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-105 select-none"
          style={{ width: pixelSize * 1.2, height: pixelSize * 1.2 }}
        >
          <img src="/logo.png" alt="OwlUp Logo" className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <div className="flex flex-col justify-center">
          <div className="font-heading font-extrabold tracking-tight leading-none" style={{ fontSize: size === 'sm' ? '22px' : size === 'lg' ? '32px' : '26px' }}>
            <span style={{ color: '#FFFFFF' }}>Owl</span>
            <span style={{ color: '#FDE047' }}>Up</span>
          </div>
          <div className="font-sans font-medium tracking-wide mt-1 text-white" style={{ fontSize: size === 'sm' ? '11px' : '13px' }}>
            Real Circadian Science
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex-shrink-0 flex items-center justify-center transition-transform duration-200 hover:scale-105 select-none"
        style={{ width: pixelSize, height: pixelSize }}
      >
        <img src="/logo.png" alt="OwlUp Logo" className="w-full h-full object-contain drop-shadow-sm" />
      </div>
      {showText && (
        <div className="flex flex-col justify-center">
          <div className="font-heading font-extrabold tracking-tight leading-none" style={{ fontSize: size === 'sm' ? '18px' : size === 'lg' ? '28px' : '22px' }}>
            <span style={{ color: isNight ? '#F8FAFC' : '#1F2937' }}>Owl</span>
            <span style={{ color: '#4CB28E' }}>Up</span>
          </div>
          {showSubtitle && (
          <div className="font-medium tracking-wide mt-0.5" style={{ fontSize: size === 'sm' ? '9px' : '10px', color: isNight ? '#94A3B8' : '#6B7280' }}>
            Real circadian science.
          </div>
          )}
        </div>
      )}
    </div>
  );
};
