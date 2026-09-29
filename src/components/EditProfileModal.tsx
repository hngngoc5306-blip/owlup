import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Clock, 
  Coffee, 
  Zap, 
  Moon, 
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { UserProfile, Chronotype, CaffeineFrequency, EnergyCrave } from '../types';
import { formatDisplayTime } from '../utils/timeFormat';
import { TimePickerInput } from './TimePickerInput';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNight: boolean;
  language: 'en' | 'vi';
  userProfile?: UserProfile | null;
  onSave: (updatedProfile: UserProfile) => void;
}

type QuestionKey = 'bedtime' | 'craves' | 'caffeine' | 'chronotype';

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  isNight,
  language,
  userProfile,
  onSave,
}) => {
  const isEn = language === 'en';

  // Active question tab (bedtime, craves, caffeine, chronotype)
  const [activeQuestion, setActiveQuestion] = useState<QuestionKey>('bedtime');

  // Draft states initialized from current profile
  const [draftBedtime, setDraftBedtime] = useState<string>('22:30');
  const [isCustomBedtime, setIsCustomBedtime] = useState<boolean>(false);
  const [customBedtime, setCustomBedtime] = useState<string>('22:30');

  const [draftCraves, setDraftCraves] = useState<string[]>([]);
  const [draftCaffeineFreq, setDraftCaffeineFreq] = useState<string>('once_a_day');
  const [draftChronotype, setDraftChronotype] = useState<string>('night_owl');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Sync draft state whenever modal opens or userProfile changes
  useEffect(() => {
    if (isOpen && userProfile) {
      const bTime = userProfile.usualBedtime || '22:30';
      const presets = ['21:30', '22:00', '22:30', '23:00', '23:30', '00:00'];
      if (presets.includes(bTime)) {
        setDraftBedtime(bTime);
        setIsCustomBedtime(false);
        setCustomBedtime(bTime);
      } else {
        setIsCustomBedtime(true);
        setCustomBedtime(bTime);
        setDraftBedtime(bTime);
      }

      // Craves
      const existingCraves: string[] = [];
      if (Array.isArray(userProfile.energyCraves)) {
        existingCraves.push(...userProfile.energyCraves);
      } else if (Array.isArray(userProfile.energyCrave)) {
        existingCraves.push(...(userProfile.energyCrave as string[]));
      } else if (Array.isArray(userProfile.craves)) {
        existingCraves.push(...userProfile.craves);
      } else if (typeof userProfile.energyCrave === 'string') {
        existingCraves.push(userProfile.energyCrave);
      }
      setDraftCraves(existingCraves.length > 0 ? Array.from(new Set(existingCraves)) : ['nap']);

      // Caffeine Frequency
      setDraftCaffeineFreq(userProfile.caffeineFrequency || 'once_a_day');

      // Chronotype
      setDraftChronotype(userProfile.chronotype || 'night_owl');
      setIsSaved(false);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const effectiveBedtime = isCustomBedtime ? customBedtime : draftBedtime;

  const toggleCrave = (id: string) => {
    setDraftCraves(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = () => {
    if (!userProfile) return;

    const chosenBedtime = isCustomBedtime ? customBedtime : draftBedtime;
    const finalCraves = draftCraves.length > 0 ? draftCraves : ['nap'];

    const updated: UserProfile = {
      ...userProfile,
      usualBedtime: chosenBedtime,
      targetBedtime: chosenBedtime,
      bedtime: chosenBedtime,
      craves: finalCraves,
      energyCraves: finalCraves as EnergyCrave[],
      energyCrave: finalCraves as unknown as EnergyCrave[],
      caffeineFrequency: draftCaffeineFreq as CaffeineFrequency,
      chronotype: draftChronotype as Chronotype,
    };

    setIsSaved(true);
    setTimeout(() => {
      onSave(updated);
      setIsSaved(false);
    }, 350);
  };

  // Chronotype mismatch warning check
  let [h] = (effectiveBedtime || '22:30').split(':').map(Number);
  let expectedChronotype = (h >= 20 && h <= 22) ? 'early_bird' : (h >= 0 && h < 4) || h === 23 ? 'night_owl' : 'intermediate';
  let hasConflict = false;
  if (expectedChronotype === 'early_bird' && draftChronotype === 'night_owl') hasConflict = true;
  if (expectedChronotype === 'night_owl' && draftChronotype === 'early_bird') hasConflict = true;

  // Question tabs labels & previews
  const getTabPreview = (key: QuestionKey) => {
    switch (key) {
      case 'bedtime':
        return formatDisplayTime(effectiveBedtime, isEn);
      case 'craves':
        if (draftCraves.length === 1) {
          const c = draftCraves[0];
          if (c === 'nap') return isEn ? '😴 Nap' : '😴 Chợp mắt';
          if (c === 'caffeine') return isEn ? '☕ Caffeine' : '☕ Cà phê';
          if (c === 'exercise') return isEn ? '🏃 Exercise' : '🏃 Vận động';
          if (c === 'relax') return isEn ? '🧘 Relax' : '🧘 Nghỉ ngơi';
          if (c === 'music') return isEn ? '🎧 Music' : '🎧 Nghe nhạc';
          if (c === 'phone') return isEn ? '📱 Phone' : '📱 Điện thoại';
          return isEn ? '✨ Other' : '✨ Khác';
        }
        return `${draftCraves.length} ${isEn ? 'selected' : 'đã chọn'}`;
      case 'caffeine':
        if (draftCaffeineFreq === 'never') return isEn ? 'Never' : 'Không dùng';
        if (draftCaffeineFreq === 'rarely') return isEn ? 'Rarely' : 'Hiếm khi';
        if (draftCaffeineFreq === 'few_times_week') return isEn ? 'Few / wk' : 'Vài lần/tuần';
        if (draftCaffeineFreq === 'once_a_day') return isEn ? '1x / day' : '1 ly / ngày';
        return isEn ? 'Multiple' : 'Nhiều ly';
      case 'chronotype':
        if (draftChronotype === 'early_bird') return isEn ? 'Early Bird' : 'Chim sớm';
        if (draftChronotype === 'night_owl') return isEn ? 'Night Owl' : 'Cú đêm';
        return isEn ? 'Intermediate' : 'Trung gian';
    }
  };

  return (
    <div
      id="edit-profile-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all animate-fade-in"
      onClick={onClose}
    >
      <div
        id="edit-profile-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all animate-scale-in flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: isNight ? '#1A2540' : '#FFFFF8',
          borderColor: isNight ? '#2D3748' : '#E5E7EB',
          color: isNight ? '#F8FAFC' : '#334155',
        }}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between shrink-0"
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
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-2xl sm:text-3xl leading-tight">
                {isEn ? 'Edit Profile' : 'Chỉnh sửa hồ sơ'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEn ? 'Update circadian preferences & schedule factors' : 'Cập nhật nhịp sinh học & các yếu tố lịch trình'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-edit-profile"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-colors cursor-pointer"
            title={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Question Selector Tabs */}
        <div 
          className="px-4 sm:px-6 pt-3 border-b grid grid-cols-4 items-center gap-1 sm:gap-2 shrink-0"
          style={{ borderColor: isNight ? '#2D3748' : '#E5E7EB' }}
        >
          {/* Tab 2: Bedtime */}
          <button
            type="button"
            onClick={() => setActiveQuestion('bedtime')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 w-full ${
              activeQuestion === 'bedtime'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEn ? 'Bedtime' : 'Giờ ngủ'}</span>
            </div>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[90px] truncate">
              {getTabPreview('bedtime')}
            </span>
          </button>

          {/* Tab 3: Craves */}
          <button
            type="button"
            onClick={() => setActiveQuestion('craves')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 w-full ${
              activeQuestion === 'craves'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEn ? 'Rescue' : 'Cứu tinh'}</span>
            </div>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[90px] truncate">
              {getTabPreview('craves')}
            </span>
          </button>

          {/* Tab 4: Caffeine */}
          <button
            type="button"
            onClick={() => setActiveQuestion('caffeine')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 w-full ${
              activeQuestion === 'caffeine'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Caffeine</span>
            </div>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[90px] truncate">
              {getTabPreview('caffeine')}
            </span>
          </button>

          {/* Tab 5: Chronotype */}
          <button
            type="button"
            onClick={() => setActiveQuestion('chronotype')}
            className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 w-full ${
              activeQuestion === 'chronotype'
                ? 'border-[#4CB28E] dark:border-[#62D2FB] text-[#4CB28E] dark:text-[#62D2FB]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Moon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{isEn ? 'Chrono' : 'Nhịp SH'}</span>
            </div>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 max-w-[90px] truncate">
              {getTabPreview('chronotype')}
            </span>
          </button>
        </div>

        {/* Modal Body / Active Question Options */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* =========================================================================
              QUESTION 2: USUAL BEDTIME
          ========================================================================= */}
          {activeQuestion === 'bedtime' && (
            <div className="space-y-4 animate-premium-in">
              <div>
                <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  {isEn ? '2. When do you usually sleep?' : '2. Bạn thường ngủ lúc mấy giờ?'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn 
                    ? 'Choose the time you usually go to bed each night to personalize your circadian rhythm.' 
                    : 'Chọn khung giờ bạn thường bắt đầu lên giường đi ngủ mỗi đêm để tối ưu nhịp sinh học.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {['21:30', '22:00', '22:30', '23:00', '23:30', '00:00'].map(time => {
                  const isSelected = !isCustomBedtime && draftBedtime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        setIsCustomBedtime(false);
                        setDraftBedtime(time);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer border-2 ${
                        isSelected
                          ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-heading font-bold text-base sm:text-lg">
                        {formatDisplayTime(time, isEn)}
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB]' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}

                {/* Custom Time Option */}
                <div
                  onClick={() => setIsCustomBedtime(true)}
                  className={`col-span-2 w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer border-2 ${
                    isCustomBedtime
                      ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium text-sm ${isCustomBedtime ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                      {isEn ? 'Custom time:' : 'Giờ tùy chỉnh:'}
                    </span>
                    <div onClick={(e) => { e.stopPropagation(); setIsCustomBedtime(true); }}>
                      <TimePickerInput
                        value={customBedtime}
                        onChange={val => {
                          setIsCustomBedtime(true);
                          setCustomBedtime(val);
                        }}
                        isEn={isEn}
                        variant="compact"
                      />
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isCustomBedtime ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB]' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isCustomBedtime && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              QUESTION 3: ENERGY RESCUE / CRAVES
          ========================================================================= */}
          {activeQuestion === 'craves' && (
            <div className="space-y-4 animate-premium-in">
              <div>
                <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  {isEn ? '3. When your energy runs low, what do you crave most?' : '3. Khi cạn kiệt năng lượng, bạn thèm gì nhất?'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn 
                    ? 'You can select multiple options that apply to you.' 
                    : 'Bạn có thể chọn một hoặc nhiều lựa chọn phù hợp.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'nap', l: isEn ? 'Take a nap' : 'Ngủ chợp mắt', i: '😴' },
                  { id: 'caffeine', l: isEn ? 'Have caffeine' : 'Dùng caffeine', i: '☕' },
                  { id: 'phone', l: isEn ? 'Scroll on phone' : 'Lướt điện thoại', i: '📱' },
                  { id: 'exercise', l: isEn ? 'Exercise' : 'Tập thể dục', i: '🏃' },
                  { id: 'relax', l: isEn ? 'Relax quietly' : 'Thư giãn yên tĩnh', i: '🧘‍♀️' },
                  { id: 'music', l: isEn ? 'Listen to music' : 'Nghe nhạc', i: '🎧' },
                  { id: 'other', l: isEn ? 'Other' : 'Khác', i: '✨' },
                ].map(opt => {
                  const isSelected = draftCraves.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleCrave(opt.id)}
                      className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer border-2 ${
                        isSelected
                          ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{opt.i}</span>
                        <span className="font-medium text-sm truncate">{opt.l}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB] text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              QUESTION 4: CAFFEINE HABITS
          ========================================================================= */}
          {activeQuestion === 'caffeine' && (
            <div className="space-y-4 animate-premium-in">
              <div>
                <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  {isEn ? '4. How often do you have caffeine?' : '4. Tần suất bạn dùng caffeine?'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn 
                    ? 'The system automatically updates your daily safe limit and cutoff time.' 
                    : 'Hệ thống sẽ tự động cập nhật giới hạn an toàn hàng ngày và thời điểm ngắt caffeine.'}
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'never',
                    label: isEn ? 'Never' : 'Không dùng caffeine',
                    desc: isEn ? 'Recommended safe limit: 100 mg/day' : 'Khuyến nghị giới hạn: 100 mg/ngày'
                  },
                  {
                    id: 'rarely',
                    label: isEn ? 'Rarely' : 'Hiếm khi uống',
                    desc: isEn ? 'Recommended safe limit: 200 mg/day' : 'Khuyến nghị giới hạn: 200 mg/ngày'
                  },
                  {
                    id: 'few_times_week',
                    label: isEn ? 'A few times a week' : 'Vài lần một tuần',
                    desc: isEn ? 'Recommended safe limit: 300 mg/day' : 'Khuyến nghị giới hạn: 300 mg/ngày'
                  },
                  {
                    id: 'once_a_day',
                    label: isEn ? 'Once a day' : 'Mỗi ngày một lần',
                    desc: isEn ? 'Recommended safe limit: 350 mg/day' : 'Khuyến nghị giới hạn: 350 mg/ngày'
                  },
                  {
                    id: 'multiple_times_a_day',
                    label: isEn ? 'Multiple times a day' : 'Nhiều lần trong ngày',
                    desc: isEn ? 'Recommended safe limit: 400 mg/day (FDA ceiling)' : 'Khuyến nghị giới hạn: 400 mg/ngày (Trần an toàn FDA)'
                  },
                ].map(opt => {
                  const isSelected = draftCaffeineFreq === opt.id || (opt.id === 'multiple_times_a_day' && draftCaffeineFreq === 'multiple_times_day');
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraftCaffeineFreq(opt.id)}
                      className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer border-2 ${
                        isSelected
                          ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm">{opt.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB]' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              QUESTION 5: CHRONOTYPE
          ========================================================================= */}
          {activeQuestion === 'chronotype' && (
            <div className="space-y-4 animate-premium-in">
              <div>
                <h4 className="font-heading font-bold text-lg text-slate-900 dark:text-white">
                  {isEn ? "5. What's your chronotype?" : "5. Nhịp sinh học của bạn là gì?"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isEn 
                    ? 'Shapes your circadian energy wave and peak focus hours throughout the day.' 
                    : 'Định hình đường cong năng lượng circadian và đỉnh tập trung trong ngày của bạn.'}
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    id: 'early_bird',
                    label: isEn ? 'Early bird' : 'Người dậy sớm (Chim sớm)',
                    icon: '🌅',
                    desc: isEn ? 'Peak energy in morning, prefer earlier bedtime' : 'Tràn đầy năng lượng buổi sáng, ngủ sớm dậy sớm'
                  },
                  {
                    id: 'night_owl',
                    label: isEn ? 'Night owl' : 'Người thức khuya (Cú đêm)',
                    icon: '🦉',
                    desc: isEn ? 'High focus at night, naturally awake later' : 'Tập trung cao vào ban đêm, ngủ muộn dậy muộn'
                  },
                  {
                    id: 'intermediate',
                    label: isEn ? 'Flexible sleeper' : 'Người có lịch ngủ linh hoạt',
                    icon: '✨',
                    desc: isEn ? 'Adaptable schedule, balanced circadian rhythm' : 'Dễ thích nghi, nhịp sinh học cân bằng ổn định'
                  },
                ].map(opt => {
                  const isSelected = draftChronotype === opt.id || (opt.id === 'intermediate' && draftChronotype === 'neither');
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDraftChronotype(opt.id)}
                      className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center justify-between cursor-pointer border-2 ${
                        isSelected
                          ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl shrink-0">{opt.icon}</span>
                        <div>
                          <div className="font-semibold text-sm">{opt.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB]' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}

                {/* Conflict warning if chronotype and bedtime conflict */}
                {hasConflict && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex gap-2.5 text-amber-700 dark:amber-300 text-xs font-medium animate-fade-in">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>
                      {isEn 
                        ? `Warning: Your selected chronotype doesn't biologically match your bedtime (${effectiveBedtime}). This may cause sleep inertia.` 
                        : `Cảnh báo: Nhịp sinh học bạn chọn đang xung đột sinh học với giờ ngủ (${effectiveBedtime}). Điều này có thể gây quán tính giấc ngủ.`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-3 shrink-0"
          style={{ borderColor: isNight ? '#2D3748' : '#E5E7EB' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isEn ? 'Cancel' : 'Hủy'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaved}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white dark:text-[#0E172A] transition-all cursor-pointer flex items-center gap-1.5 ${
              isSaved 
                ? 'bg-emerald-600 dark:bg-emerald-400 scale-95 shadow-inner' 
                : 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#3FA07E] dark:hover:bg-[#4EBCDF] shadow-md hover:shadow-lg'
            }`}
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>{isSaved ? (isEn ? 'Saved!' : 'Đã lưu!') : (isEn ? 'Save change' : 'Lưu thay đổi')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
