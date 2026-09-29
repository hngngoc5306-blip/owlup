import React from 'react';

interface HeroOwlIllustrationProps {
  isNight?: boolean;
}

export const HeroOwlIllustration: React.FC<HeroOwlIllustrationProps> = ({ isNight = true }) => {
  return (
    <div className="relative w-full max-w-[420px] aspect-[4/3] mx-auto rounded-2xl overflow-hidden risograph-texture shadow-lg transition-all duration-500">
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Risograph noise filter embedded directly in SVG */}
          <filter id="heroNoise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.15 0" />
            <feBlend mode="multiply" in="SourceGraphic" result="blend" />
          </filter>

          {/* Night gradient — brand Slate Navy */}
          <linearGradient id="nightSky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0E172A" />
            <stop offset="60%" stopColor="#1A2540" />
            <stop offset="100%" stopColor="#1F2937" />
          </linearGradient>

          {/* Day gradient — warm white / pale cream */}
          <linearGradient id="daySky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFF8" />
            <stop offset="50%" stopColor="#FFF1C1" />
            <stop offset="100%" stopColor="#E6F7F0" />
          </linearGradient>

          {/* Moon/Sun ambient glow */}
          <linearGradient id="moonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isNight ? "#62D2FB" : "#FBBF24"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isNight ? "#4CB28E" : "#F59E0B"} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Background Sky */}
        <rect
          width="400"
          height="300"
          fill={isNight ? "url(#nightSky)" : "url(#daySky)"}
        />

        {/* Ambient celestial orb (Moon or Morning Sun) */}
        <circle
          cx={isNight ? "310" : "90"}
          cy="75"
          r="48"
          fill="url(#moonGlow)"
        />
        <circle
          cx={isNight ? "320" : "80"}
          cy="70"
          r={isNight ? "40" : "44"}
          fill={isNight ? "#0E172A" : "#FFF1C1"}
          opacity={isNight ? "0.9" : "0.5"}
        />

        {/* Stars (night) or sparkles (day) */}
        {isNight ? (
          <>
            <circle cx="60" cy="50" r="2" fill="#F8FAFC" opacity="0.7" />
            <circle cx="120" cy="80" r="1.5" fill="#62D2FB" opacity="0.6" />
            <circle cx="190" cy="40" r="2.5" fill="#FBBF24" opacity="0.8" />
            <circle cx="250" cy="95" r="1.5" fill="#F8FAFC" opacity="0.5" />
            <circle cx="70" cy="130" r="2" fill="#62D2FB" opacity="0.7" />
            <path d="M190 35 L190 45 M185 40 L195 40" stroke="#FBBF24" strokeWidth="1.2" opacity="0.7" />
          </>
        ) : (
          <>
            <circle cx="320" cy="50" r="2.5" fill="#4CB28E" opacity="0.4" />
            <circle cx="260" cy="80" r="3" fill="#FBBF24" opacity="0.5" />
            <circle cx="340" cy="110" r="2" fill="#4CB28E" opacity="0.3" />
            <path d="M90 60 L90 40 M90 90 L90 110 M65 75 L45 75 M115 75 L135 75" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </>
        )}

        {/* Cozy Mountain / Rooftop silhouette */}
        <path
          d={isNight 
            ? "M0 240 Q 90 200, 180 230 T 400 210 L 400 300 L 0 300 Z"
            : "M0 250 Q 120 220, 240 245 T 400 225 L 400 300 L 0 300 Z"}
          fill={isNight ? "#0E172A" : "#D1FAE5"}
          opacity="0.8"
        />

        {/* Branch / Perch */}
        <path
          d="M20 225 C 100 220, 220 240, 380 215"
          stroke={isNight ? "#2D3748" : "#64748B"}
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M260 226 C 290 245, 330 250, 360 255"
          stroke={isNight ? "#1F2937" : "#94A3B8"}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Small sprout / green leaf — brand green */}
        <ellipse
          cx="285"
          cy="220"
          rx="9"
          ry="5"
          fill="#4CB28E"
          transform="rotate(-25 285 220)"
        />
        <ellipse
          cx="295"
          cy="216"
          rx="7"
          ry="4"
          fill="#6DC9A7"
          transform="rotate(15 295 216)"
        />

        {/* THE OWL — Brand green body */}
        <g id="hero-owl-character" transform="translate(140, 95)">
          {/* Owl Shadow */}
          <ellipse cx="60" cy="132" rx="45" ry="10" fill="#000000" opacity="0.25" />

          {/* Owl Body — Brand Green #4CB28E */}
          <rect
            x="15"
            y="25"
            width="90"
            height="100"
            rx="45"
            fill="#4CB28E"
            stroke={isNight ? "#62D2FB" : "#3A9678"}
            strokeWidth="3"
          />

          {/* Cozy Scarf — brand gold/cream for light, sky blue for night */}
          <path
            d="M20 95 C 40 108, 80 108, 100 95 C 105 108, 15 108, 20 95"
            fill={isNight ? "#62D2FB" : "#F5C842"}
          />
          <rect
            x="32"
            y="94"
            width="20"
            height="32"
            rx="4"
            fill={isNight ? "#4BBAD5" : "#E5B235"}
            transform="rotate(8 32 94)"
          />

          {/* Owl Ears */}
          <path
            d="M 28 28 C 21 18, 16 8, 22 4 C 27 5, 36 12, 45 18"
            fill="#4CB28E"
            stroke={isNight ? "#62D2FB" : "#3A9678"}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M 92 28 C 99 18, 104 8, 98 4 C 93 5, 84 12, 75 18"
            fill="#4CB28E"
            stroke={isNight ? "#62D2FB" : "#3A9678"}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Eye Discs — White with brand green ring */}
          <circle cx="42" cy="58" r="18" fill="#FFFFFF" stroke="#4CB28E" strokeWidth="2.5" />
          <circle cx="78" cy="58" r="18" fill="#FFFFFF" stroke="#4CB28E" strokeWidth="2.5" />

          {/* Sleepy contented arched eyes */}
          <path
            d="M32 58 Q 42 66, 52 58"
            fill="none"
            stroke={isNight ? "#1F2937" : "#1F2937"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M68 58 Q 78 66, 88 58"
            fill="none"
            stroke={isNight ? "#1F2937" : "#1F2937"}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Blush cheeks */}
          <circle cx="30" cy="67" r="5" fill="#F43F5E" opacity="0.3" />
          <circle cx="90" cy="67" r="5" fill="#F43F5E" opacity="0.3" />

          {/* Beak */}
          <path
            d="M 60 63 C 65 63, 67 66, 66 70 C 64 74, 61 77, 60 78 C 59 77, 56 74, 54 70 C 53 66, 55 63, 60 63 Z"
            fill="#F59E0B"
          />

          {/* Lightning bolt on chest — brand identity */}
          <path
            d="M64 65 L59 77 H63 L58 90 L70 74 H65.5 L69 65 Z"
            fill="#F5C842"
            opacity="0.9"
          />

          {/* Cute mug — brand green */}
          <g transform="translate(68, 86)">
            <path
              d="M10 -6 C 8 -12, 14 -16, 10 -22"
              fill="none"
              stroke={isNight ? "#62D2FB" : "#4CB28E"}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.6"
            />
            <path
              d="M16 -4 C 18 -9, 14 -13, 16 -18"
              fill="none"
              stroke={isNight ? "#62D2FB" : "#FBBF24"}
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.5"
            />
            {/* Mug body */}
            <rect x="2" y="0" width="22" height="20" rx="5" fill={isNight ? "#23374B" : "#4CB28E"} />
            {/* Handle */}
            <path d="M24 4 C 29 4, 29 14, 24 14" fill="none" stroke={isNight ? "#23374B" : "#4CB28E"} strokeWidth="2.5" />
            {/* Owl emblem */}
            <circle cx="13" cy="10" r="3" fill="#FBBF24" />
          </g>
        </g>

        {/* Badge overlay */}
        <g transform="translate(24, 24)">
          <rect
            width="130"
            height="32"
            rx="16"
            fill={isNight ? "rgba(14,23,42,0.80)" : "rgba(255,255,255,0.90)"}
            stroke={isNight ? "rgba(98,210,251,0.3)" : "rgba(76,178,141,0.35)"}
            strokeWidth="1"
          />
          <text
            x="14"
            y="20"
            fontFamily="'Inter', sans-serif"
            fontSize="12"
            fontWeight="600"
            fill={isNight ? "#62D2FB" : "#4CB28E"}
          >
            {isNight ? "🌙 Real-Life Recovery" : "☀️ Non-Judgmental Energy"}
          </text>
        </g>
      </svg>
    </div>
  );
};
