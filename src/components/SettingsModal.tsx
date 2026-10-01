import React, { useState, useEffect } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Sparkles, 
  Clock, 
  Coffee, 
  RotateCcw, 
  Check, 
  Sliders, 
  ShieldCheck, 
  User, 
  LogOut, 
  Edit3,
  Bell,
  Volume2,
  Vibrate,
  VolumeX,
  Laptop,
  Languages,
  Globe
} from 'lucide-react';
import { UserSettings, ThemeMode, UserProfile, NotificationSettings, AppLanguage } from '../types';
import { getTranslation } from '../utils/translations';
import { formatDisplayTime } from '../utils/timeFormat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNight: boolean;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onPreviewThemeMode?: (mode: ThemeMode | null) => void;
  onClearCaffeineLog: () => void;
  loggedDrinkCount: number;
  onOpenOnboarding?: () => void;
  userProfile?: UserProfile | null;
  onOpenProfileSetup?: () => void;
  onOpenEditProfile?: () => void;
  onSignOut?: () => void;
  onReturnToDashboard?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isNight,
  settings,
  onUpdateSettings,
  onPreviewThemeMode,
  onClearCaffeineLog,
  loggedDrinkCount,
  userProfile,
  onOpenProfileSetup,
  onOpenEditProfile,
  onSignOut,
  onReturnToDashboard,
}) => {
  // Tabs: language | profile | notifications | appearance
  const [activeTab, setActiveTab] = useState<'language' | 'profile' | 'notifications' | 'appearance'>('profile');

  // Local draft states
  const [language, setLanguage] = useState<AppLanguage>(settings.language || 'en');
  const [themeMode, setThemeMode] = useState<ThemeMode>(settings.themeMode || 'auto');
  const [notifications, setNotifications] = useState<NotificationSettings>(() => {
    return settings.notifications || {
      recoveryReminders: true,
      napReminders: true,
      caffeineReminders: true,
      sleepReminders: true,
      soundMode: 'sound',
    };
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize draft states when modal opens or settings change
  useEffect(() => {
    if (isOpen) {
      setLanguage(settings.language || 'en');
      setThemeMode(settings.themeMode || 'auto');
      setNotifications(settings.notifications || {
        recoveryReminders: true,
        napReminders: true,
        caffeineReminders: true,
        sleepReminders: true,
        soundMode: 'sound',
      });
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const t = getTranslation(language);
  const ts = t.settings;
  const tcomm = t.common;

  const handleClose = () => {
    setThemeMode(settings.themeMode || 'auto');
    if (onPreviewThemeMode) {
      onPreviewThemeMode(null);
    }
    onClose();
  };

  const handleSaveChange = () => {
    onUpdateSettings({
      language,
      themeMode,
      notifications,
    });
    setToastMessage(ts.savedToast);
    setTimeout(() => {
      setToastMessage(null);
      if (onPreviewThemeMode) {
        onPreviewThemeMode(null);
      }
      onClose();
      if (onReturnToDashboard) onReturnToDashboard();
    }, 600);
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all animate-fade-in"
      onClick={handleClose}
    >
      <div
        id="settings-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden animate-scale-in"
        style={{
          backgroundColor: isNight ? '#1A2540' : '#FFFFF8',
          borderColor: isNight ? '#2D3748' : '#E5E7EB',
          color: isNight ? '#F8FAFC' : '#334155',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: isNight ? '#2D3748' : '#E5E7EB' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: isNight ? 'rgba(98, 210, 251, 0.15)' : 'rgba(76, 178, 141, 0.15)',
                color: isNight ? '#62D2FB' : '#4CB28E',
              }}
            >
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-3xl leading-tight">
                {ts.title}
              </h3>
              
            </div>
          </div>

          <button
            id="btn-close-settings"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-colors cursor-pointer"
            title={tcomm.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Main Tabs: Profile, Appearance, Language, Notifications */}
        <div className="px-6 pt-3 border-b grid grid-cols-4 items-center gap-1 sm:gap-2" style={{ borderColor: isNight ? '#2D3748' : '#E5E7EB' }}>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 w-full ${
              activeTab === 'profile'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{ts.tabProfile}</span>
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 w-full ${
              activeTab === 'appearance'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Moon className="w-4 h-4 shrink-0" />
            <span className="truncate">{ts.tabAppearance}</span>
          </button>

          <button
            onClick={() => setActiveTab('language')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 w-full ${
              activeTab === 'language'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Languages className="w-4 h-4 shrink-0" />
            <span className="truncate">{ts.tabLanguage}</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 w-full ${
              activeTab === 'notifications'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span className="truncate">{ts.tabNotifications}</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* =========================================================================
              TAB 0: LANGUAGE SELECTION (English by default, Tiếng Việt optional)
          ========================================================================= */}
          {activeTab === 'language' && (
            <div className="space-y-4 animate-premium-in">
              <div className="space-y-1">
                
                
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* English Option */}
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    language === 'en'
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/15 dark:bg-[#62D2FB]/15 ring-2 ring-[#4CB28E] dark:ring-[#62D2FB]/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/40 text-slate-600 dark:text-slate-300 hover:bg-[#FFFFFF] dark:bg-[#233355] hover:border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none inline-flex items-center justify-center">🇺🇸</span>
                      <span className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-none inline-flex items-center">English</span>
                    </div>
                    {language === 'en' && <Check className="w-4 h-4 text-[#4CB28E] dark:text-[#62D2FB]" />}
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {ts.languageEnDesc}
                  </p>
                </button>

                {/* Vietnamese Option */}
                <button
                  type="button"
                  onClick={() => setLanguage('vi')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    language === 'vi'
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/15 dark:bg-[#62D2FB]/15 ring-2 ring-[#4CB28E] dark:ring-[#62D2FB]/30 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/40 text-slate-600 dark:text-slate-300 hover:bg-[#FFFFFF] dark:bg-[#233355] hover:border-slate-300 dark:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none inline-flex items-center justify-center">🇻🇳</span>
                      <span className="font-heading font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-none inline-flex items-center">Tiếng Việt</span>
                    </div>
                    {language === 'vi' && <Check className="w-4 h-4 text-[#4CB28E] dark:text-[#62D2FB]" />}
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                    {ts.languageViDesc}
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 1: PROFILE
          ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-premium-in">
              {userProfile ? (
                <div
                  className="p-4 rounded-2xl border space-y-3"
                  style={{
                    backgroundColor: isNight ? '#111827' : '#F8FAFC',
                    borderColor: isNight ? '#2D3748' : '#E5E7EB',
                  }}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {userProfile.photoUrl ? (
                        <img
                          src={userProfile.photoUrl}
                          alt={userProfile.name}
                          className="w-12 h-12 rounded-2xl object-cover shrink-0"
                          style={{ border: '2px solid rgba(76, 178, 141, 0.4)' }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl text-white font-bold text-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #4CB28E, #2D8F6F)' }}>
                          {userProfile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-extrabold text-sm sm:text-base truncate">
                            {userProfile.name}
                          </h4>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#4CB28E]/15 dark:bg-[#62D2FB]/15 text-[#4CB28E] dark:text-[#62D2FB] border border-[#4CB28E]/30 dark:border-[#62D2FB]/30 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {userProfile.authProvider === 'google' ? 'Google' : tcomm.guest}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {userProfile.email || `${userProfile.age} • ${language === 'en' ? 'No email' : 'Không có email'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {(onOpenEditProfile || onOpenProfileSetup) && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            if (onOpenEditProfile) {
                              onOpenEditProfile();
                            } else if (onOpenProfileSetup) {
                              onOpenProfileSetup();
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#2D3748] hover:bg-slate-100 dark:hover:bg-slate-700/30 cursor-pointer transition-colors flex items-center gap-1.5"
                          style={{ color: isNight ? '#62D2FB' : '#4CB28E' }}
                          title={language === 'en' ? 'Edit' : 'Chỉnh sửa'}
                        >
                          <span>{language === 'en' ? 'Edit' : 'Chỉnh sửa'}</span>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onSignOut && (
                        <button
                          type="button"
                          onClick={onSignOut}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors flex items-center gap-1.5"
                          title={language === 'en' ? 'Log out' : 'Đăng xuất'}
                        >
                          <span>{language === 'en' ? 'Log out' : 'Đăng xuất'}</span>
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-3 border-t border-slate-200 dark:border-[#2D3748]/30 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#233355]/40 border border-slate-200 dark:border-[#2D3748]/40">
                      <span className="text-slate-500 dark:text-slate-400 block text-sm">
                        {language === 'en' ? 'Chronotype' : 'Nhịp sinh học'}:
                      </span>
                      <strong className="text-slate-900 dark:text-white">
                        {userProfile.chronotype === 'early_bird'
                          ? (language === 'en' ? '🌅 Early Bird' : '🌅 Chim sớm')
                          : userProfile.chronotype === 'night_owl'
                            ? (language === 'en' ? '🦉 Night Owl' : '🦉 Cú đêm')
                            : (language === 'en' ? '⚖️ Intermediate' : '⚖️ Trung gian')}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#233355]/40 border border-slate-200 dark:border-[#2D3748]/40">
                      <span className="text-slate-500 dark:text-slate-400 block text-sm">
                        {language === 'en' ? 'Usual Bedtime' : 'Giờ ngủ quen thuộc'}:
                      </span>
                      <strong style={{ color: isNight ? '#62D2FB' : '#4CB28E' }}>
                        {formatDisplayTime(userProfile.usualBedtime, language === 'en')}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#233355]/40 border border-slate-200 dark:border-[#2D3748]/40">
                      <span className="text-slate-500 dark:text-slate-400 block text-sm">
                        {language === 'en' ? 'Caffeine Habits' : 'Thói quen caffeine'}:
                      </span>
                      <strong className="text-[#4CB28E] dark:text-[#62D2FB]">
                        {userProfile.caffeineFrequency === 'never'
                          ? (language === 'en' ? 'Never' : 'Không dùng')
                          : userProfile.caffeineFrequency === 'rarely'
                          ? (language === 'en' ? 'Rarely' : 'Hiếm khi uống')
                          : userProfile.caffeineFrequency === 'few_times_week'
                            ? (language === 'en' ? 'A few times a week' : 'Vài lần / tuần')
                            : userProfile.caffeineFrequency === 'once_a_day'
                              ? (language === 'en' ? 'Once a day' : '1 ly / ngày')
                              : (language === 'en' ? 'Multiple times a day' : 'Nhiều ly / ngày')}
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#233355]/40 border border-slate-200 dark:border-[#2D3748]/40">
                      <span className="text-slate-500 dark:text-slate-400 block text-sm">
                        {language === 'en' ? 'Energy Rescue' : 'Cứu tinh năng lượng'}:
                      </span>
                      <strong className="text-[#62D2FB] truncate block" title={(() => {
                        const cravesList: string[] = [];
                        if (Array.isArray(userProfile.energyCraves) && userProfile.energyCraves.length > 0) {
                          cravesList.push(...userProfile.energyCraves);
                        } else if (Array.isArray(userProfile.energyCrave) && (userProfile.energyCrave as string[]).length > 0) {
                          cravesList.push(...(userProfile.energyCrave as string[]));
                        } else if (Array.isArray(userProfile.craves) && userProfile.craves.length > 0) {
                          cravesList.push(...userProfile.craves);
                        } else if (typeof userProfile.energyCrave === 'string' && userProfile.energyCrave) {
                          cravesList.push(userProfile.energyCrave);
                        }
                        if (cravesList.length === 0) return language === 'en' ? '🧘 Relax' : '🧘 Nghỉ ngơi';
                        return cravesList.map(c => {
                          switch (c) {
                            case 'nap': return language === 'en' ? '😴 Power Nap' : '😴 Chợp mắt';
                            case 'caffeine': return language === 'en' ? '☕ Caffeine' : '☕ Cà phê';
                            case 'music': return language === 'en' ? '🎵 Music' : '🎵 Nghe nhạc';
                            case 'exercise': return language === 'en' ? '🏃 Exercise' : '🏃 Vận động';
                            case 'phone': return language === 'en' ? '📱 Phone' : '📱 Lướt ĐT';
                            case 'relax': return language === 'en' ? '🧘 Relax' : '🧘 Nghỉ ngơi';
                            default: return language === 'en' ? '✨ Other' : '✨ Khác';
                          }
                        }).join(', ');
                      })()}>
                        {(() => {
                          const cravesList: string[] = [];
                          if (Array.isArray(userProfile.energyCraves) && userProfile.energyCraves.length > 0) {
                            cravesList.push(...userProfile.energyCraves);
                          } else if (Array.isArray(userProfile.energyCrave) && (userProfile.energyCrave as string[]).length > 0) {
                            cravesList.push(...(userProfile.energyCrave as string[]));
                          } else if (Array.isArray(userProfile.craves) && userProfile.craves.length > 0) {
                            cravesList.push(...userProfile.craves);
                          } else if (typeof userProfile.energyCrave === 'string' && userProfile.energyCrave) {
                            cravesList.push(userProfile.energyCrave);
                          }
                          if (cravesList.length === 0) return language === 'en' ? '🧘 Relax' : '🧘 Nghỉ ngơi';
                          return cravesList.map(c => {
                            switch (c) {
                              case 'nap': return language === 'en' ? '😴 Power Nap' : '😴 Chợp mắt';
                              case 'caffeine': return language === 'en' ? '☕ Caffeine' : '☕ Cà phê';
                              case 'music': return language === 'en' ? '🎵 Music' : '🎵 Nghe nhạc';
                              case 'exercise': return language === 'en' ? '🏃 Exercise' : '🏃 Vận động';
                              case 'phone': return language === 'en' ? '📱 Phone' : '📱 Lướt ĐT';
                              case 'relax': return language === 'en' ? '🧘 Relax' : '🧘 Nghỉ ngơi';
                              default: return language === 'en' ? '✨ Other' : '✨ Khác';
                            }
                          }).join(', ');
                        })()}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-dashed border-slate-200 dark:border-[#2D3748] text-center space-y-3">
                  <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {language === 'en' ? 'Profile Not Configured' : 'Chưa thiết lập hồ sơ cá nhân'}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {language === 'en'
                      ? 'Configure your profile to personalize circadian rhythms, bedtimes, and caffeine recommendations.'
                      : 'Thiết lập hồ sơ để hệ thống ghi nhớ nhịp sinh học, giờ ngủ quen thuộc và thói quen caffeine của bạn.'}
                  </p>
                  {onOpenProfileSetup && (
                    <button
           onClick={() => {
                        onClose();
                        onOpenProfileSetup();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer shadow-sm"
                      style={{ backgroundColor: isNight ? '#62D2FB' : '#4CB28E' }}
                    >
                      {language === 'en' ? 'Start Profile Setup' : 'Bắt đầu tạo hồ sơ ngay'}
                    </button>
                  )}
                </div>
              )}

              {/* Caffeine Log Clear */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/30 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {language === 'en' ? "Today's Drink Log" : 'Nhật ký đồ uống hôm nay'}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {language === 'en'
                      ? `${loggedDrinkCount} drink(s) recorded today.`
                      : `Đang lưu ${loggedDrinkCount} ly đã nạp.`}
                  </div>
                </div>
                {loggedDrinkCount > 0 && (
                  <button
          onClick={onClearCaffeineLog}
          className="px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 cursor-pointer"
         >
                    {language === 'en' ? 'Clear Log' : 'Xóa nhật ký'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: NOTIFICATIONS
          ========================================================================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {/* 1. Recovery reminders */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2D3748]/60 bg-[#FFFFFF] dark:bg-[#233355]/40 flex items-center justify-between">
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{ts.recoveryReminders}</div>
                    <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{ts.recoveryRemindersDesc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.recoveryReminders}
                      onChange={(e) => setNotifications({ ...notifications, recoveryReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#FFFFF8] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: notifications.recoveryReminders ? (isNight ? '#62D2FB' : '#4CB28E') : undefined }}></div>
                  </label>
                </div>

                {/* 2. Nap reminders */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2D3748]/60 bg-[#FFFFFF] dark:bg-[#233355]/40 flex items-center justify-between">
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{ts.napReminders}</div>
                    <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{ts.napRemindersDesc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.napReminders}
                      onChange={(e) => setNotifications({ ...notifications, napReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#FFFFF8] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4CB28E] dark:peer-checked:bg-[#62D2FB]"></div>
                  </label>
                </div>

                {/* 3. Caffeine reminders */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2D3748]/60 bg-[#FFFFFF] dark:bg-[#233355]/40 flex items-center justify-between">
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{ts.caffeineReminders}</div>
                    <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{ts.caffeineRemindersDesc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.caffeineReminders}
                      onChange={(e) => setNotifications({ ...notifications, caffeineReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#FFFFF8] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4CB28E] dark:peer-checked:bg-[#62D2FB]"></div>
                  </label>
                </div>

                {/* 4. Sleep reminders */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2D3748]/60 bg-[#FFFFFF] dark:bg-[#233355]/40 flex items-center justify-between">
                  <div>
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{ts.sleepReminders}</div>
                    <div className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{ts.sleepRemindersDesc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.sleepReminders}
                      onChange={(e) => setNotifications({ ...notifications, sleepReminders: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#FFFFF8] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ backgroundColor: notifications.sleepReminders ? (isNight ? '#62D2FB' : '#4CB28E') : undefined }}></div>
                  </label>
                </div>

                {/* 5. Sound mode */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2D3748]/60 bg-[#FFFFFF] dark:bg-[#233355]/40 space-y-2">
                  <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                    <span>{ts.soundTitle}:</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sound', label: ts.soundMode, icon: Volume2 },
                      { id: 'vibration', label: ts.vibrationMode, icon: Vibrate },
                      { id: 'silent', label: ts.silentMode, icon: VolumeX },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = notifications.soundMode === item.id;
                      return (
                        <button
             key={item.id}
             type="button"
             onClick={() => setNotifications({ ...notifications, soundMode: item.id as any })}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'text-slate-900 dark:text-white font-bold'
                              : 'border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/60 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                          style={isSelected ? {
                            borderColor: '#4CB28E',
                            backgroundColor: 'rgba(76, 178, 141, 0.2)',
                          } : {}}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: APPEARANCE
          ========================================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  id="setting-theme-night"
                  onClick={() => {
                    setThemeMode('night');
                    if (onPreviewThemeMode) onPreviewThemeMode('night');
                  }}
                  className={`p-3 sm:p-4 rounded-xl border text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    themeMode === 'night'
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/20 dark:bg-[#62D2FB]/20 text-[#4CB28E] dark:text-[#62D2FB] ring-2 ring-[#4CB28E] dark:ring-[#62D2FB] font-bold'
                      : 'border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Moon className="w-5 h-5 mb-0.5" />
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{ts.themeNight}</span>
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tracking-tight">{ts.themeNightDesc}</span>
                </button>

                <button
                  type="button"
                  id="setting-theme-day"
                  onClick={() => {
                    setThemeMode('day');
                    if (onPreviewThemeMode) onPreviewThemeMode('day');
                  }}
                  className={`p-3 sm:p-4 rounded-xl border text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    themeMode === 'day'
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/20 dark:bg-[#62D2FB]/20 text-[#4CB28E] dark:text-[#62D2FB] ring-2 ring-[#4CB28E] dark:ring-[#62D2FB] font-bold'
                      : 'border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Sun className="w-5 h-5 mb-0.5" />
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{ts.themeDay}</span>
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tracking-tight">{ts.themeDayDesc}</span>
                </button>

                <button
                  type="button"
                  id="setting-theme-auto"
                  onClick={() => {
                    setThemeMode('auto');
                    if (onPreviewThemeMode) onPreviewThemeMode('auto');
                  }}
                  className={`p-3 sm:p-4 rounded-xl border text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    themeMode === 'auto'
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/20 dark:bg-[#62D2FB]/20 text-[#4CB28E] dark:text-[#62D2FB] ring-2 ring-[#4CB28E] dark:ring-[#62D2FB] font-bold'
                      : 'border-slate-200 dark:border-[#2D3748] bg-[#FFFFFF] dark:bg-[#233355]/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Laptop className="w-5 h-5 mb-0.5" />
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{ts.themeAuto}</span>
                  <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tracking-tight">{ts.themeAutoDesc}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: isNight ? '#2D3748' : '#E5E7EB' }}
        >
          <div className="text-xs text-[#4CB28E] dark:text-[#62D2FB] font-bold">
            {toastMessage && <span>✓ {toastMessage}</span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              {tcomm.close}
            </button>
            <button
              id="btn-save-settings"
              onClick={handleSaveChange}
              className="text-white dark:text-[#0E172A] px-6 py-2.5 rounded-xl text-xs font-bold bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#3a9a78] dark:bg-[#62D2FB] dark:hover:bg-[#4bbad5] cursor-pointer shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{tcomm.saveChanges}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
