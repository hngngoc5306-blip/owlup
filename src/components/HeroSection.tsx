import React from 'react';
import { HeroOwlIllustration } from './illustrations/HeroOwlIllustration';
import { AppFeature, UserProfile, AppLanguage } from '../types';
import { Moon, Sun, Scale, Sparkles } from 'lucide-react';
import { getTranslation } from '../utils/translations';

interface HeroSectionProps {
  isNight: boolean;
  language?: AppLanguage;
  onSelectFeature?: (feature: AppFeature) => void;
  currentTimeString?: string;
  userProfile?: UserProfile | null;
  onOpenProfileSetup?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  isNight,
  language = 'en',
  userProfile,
  onOpenProfileSetup,
}) => {
  const t = getTranslation(language);
  const thero = t.hero;

  const chronotypeLabel = userProfile?.chronotype === 'early_bird'
    ? thero.chronotypeEarlyBird
    : userProfile?.chronotype === 'night_owl'
      ? thero.chronotypeNightOwl
      : thero.chronotypeNeither;

  return (
    <section
      id="owlup-hero-section"
      className="rounded-2xl p-4 sm:p-5 border transition-all duration-300 mb-6 flex items-center justify-between gap-4"
      style={{
        backgroundColor: isNight ? '#1A2540' : '#FFFFF8',
        borderColor: isNight ? '#2D3748' : '#E5E7EB',
      }}
    >
      <div className="space-y-1.5 max-w-xl">
        {userProfile ? (
          <div
            className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: isNight ? 'rgba(76,178,141,0.12)' : 'rgba(76,178,141,0.08)',
              color: '#4CB28E',
              borderColor: 'rgba(76,178,141,0.3)',
            }}
          >
            {userProfile.chronotype === 'early_bird' ? (
              <Sun className="w-3 h-3 text-[#62D2FB]" />
            ) : userProfile.chronotype === 'night_owl' ? (
              <Moon className="w-3 h-3" style={{ color: '#4CB28E' }} />
            ) : (
              <Scale className="w-3 h-3" style={{ color: '#4CB28E' }} />
            )}
            <span>
              {language === 'en' ? 'Welcome' : 'Chào'} {userProfile.name} • {chronotypeLabel}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#4CB28E' }} />
            <span>{language === 'en' ? 'No profile set up yet?' : 'Chưa tạo hồ sơ?'}</span>
            {onOpenProfileSetup && (
              <button
        type="button"
        onClick={onOpenProfileSetup}
        className="font-bold underline cursor-pointer hover:opacity-80"
        style={{ color: '#4CB28E' }}
       >
                {thero.setupNow}
              </button>
            )}
          </div>
        )}

        <h1 className={`font-heading font-bold text-xl sm:text-2xl ${isNight ? 'text-white' : 'text-slate-800'}`}>
          {language === 'en' ? 'Circadian Energy & Sleep Recovery' : 'Năng Lượng & Phục Hồi Giấc Ngủ'}
        </h1>
        <p className="text-xs" style={{ color: isNight ? '#6B7280' : '#9CA3AF' }}>
          {language === 'en'
            ? 'Optimize 90-minute sleep cycles and caffeine cutoff according to your daily schedule.'
            : 'Tối ưu chu kỳ 90 phút và thời điểm dùng caffeine theo lịch trình thực tế của bạn.'}
        </p>
      </div>

      <div className="hidden sm:block shrink-0 w-28 sm:w-32">
        <HeroOwlIllustration isNight={isNight} />
      </div>
    </section>
  );
};
export default HeroSection;
