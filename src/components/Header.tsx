import React from 'react';
import { Moon, Coffee, Clock, Settings as SettingsIcon, User, Sparkles } from 'lucide-react';
import { Logo } from './Logo';
import { AppFeature, UserProfile, AppLanguage } from '../types';
import { getTranslation } from '../utils/translations';

interface HeaderProps {
  activeFeature: AppFeature;
  setActiveFeature: (feature: AppFeature) => void;
  isNight: boolean;
  language?: AppLanguage;
  onOpenSettings: () => void;
  userProfile?: UserProfile | null;
  onOpenProfileSetup: () => void;
  onOpenInstruction?: () => void;
}

const GoogleMiniIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  activeFeature,
  setActiveFeature,
  isNight,
  language = 'en',
  onOpenSettings,
  userProfile,
  onOpenProfileSetup,
  onOpenInstruction,
}) => {
  const t = getTranslation(language);
  const tcomm = t.common;
  const th = t.header;

  return (
    <header
      id="main-header"
      className={`sticky top-0 z-40 w-full ${isNight ? 'bg-gradient-to-r from-[#0F172A] to-[#1A2540] border-b border-slate-800/50' : 'bg-gradient-to-r from-white to-[#E6F8F0] shadow-sm'}`}
    >
      <div className="w-full px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        {/* LOGO */}
        <div 
          onClick={() => setActiveFeature('dashboard')}
          className="flex-shrink-0 cursor-pointer" 
          title={tcomm.dashboard}
        >
          <Logo size="md" isNight={isNight} variant="header" />
        </div>

        {/* TOP NAVIGATION */}
        <nav className="flex items-center gap-1 sm:gap-2 mr-0 sm:mr-4 md:mr-8 overflow-x-auto no-scrollbar py-1 shrink min-w-0" aria-label="Main Navigation">
          {['dashboard', 'planner', 'caffeine', 'timeline'].map((feature) => (
            <button
              key={feature}
              id={`nav-tab-${feature}`}
              onClick={() => {
                if (feature === 'planner') {
                  try { localStorage.removeItem('owlup_planning_mode'); } catch {}
                }
                setActiveFeature(feature as AppFeature);
              }}
              className={`px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 rounded-full text-xs sm:text-sm font-sans whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeFeature === feature
                  ? (isNight ? 'bg-[#62D2FB]/20 text-[#62D2FB] font-semibold' : 'bg-[#FDE6A5] text-[#1F2937] font-semibold shadow-sm')
                  : (isNight ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
              }`}
            >
              {feature === 'dashboard' ? (language === 'en' ? 'Dashboard' : 'Tổng quan') : feature === 'planner' ? (language === 'en' ? 'Sleep Schedule' : 'Lịch ngủ') : feature === 'caffeine' ? (language === 'en' ? 'Caffeine Advisor' : 'Tư vấn Caffeine') : (language === 'en' ? 'Recovery Timeline' : 'Lộ trình Phục hồi')}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
export default Header;
