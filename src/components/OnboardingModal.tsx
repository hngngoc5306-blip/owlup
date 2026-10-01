import React, { useState } from 'react';
import { ArrowLeft, X, Moon, Sun, Activity, Search, Shield, Zap, User, Mail } from 'lucide-react';
import { Logo } from './Logo';
import { TimePickerInput } from './TimePickerInput';
import { formatDisplayTime } from '../utils/timeFormat';

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  isNight?: boolean;
  language?: 'en' | 'vi';
  initialProfile?: any;
  onCompleteProfile: (profileData: any) => void;
  onLanguageChange?: (lang: 'en' | 'vi') => void;
  defaultEmail?: string;
}

const GoogleIcon = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    <path fill="none" d="M1 1h22v22H1z"/>
  </svg>
);

const OptionCard = ({ label, selected, onClick, icon, sub }: { label: string, selected: boolean, onClick: () => void, icon?: React.ReactNode, sub?: string }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-5 py-4 rounded-full transition-all flex items-center justify-between ${
      selected
        ? 'border-2 border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10'
        : 'border-2 border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-lg">{icon}</span>}
      <div>
        <div className={`font-sans font-medium ${selected ? 'text-[#1F2937] dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
          {label}
        </div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
      selected ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB]' : 'border-slate-300 dark:border-slate-600'
    }`}>
      {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
    </div>
  </button>
);

const StepLayout = ({ children, title, subtitle, isNextValid, handleNext, isEn, buttonText, titleClassName }: any) => (
  <div className="flex flex-col h-full max-w-[900px] w-[94%] sm:w-[90%] md:w-[85%] mx-auto pb-8 pt-16 sm:pt-20 animate-fade-in relative z-30">
    <div className="flex-1">
      <h2 className={titleClassName || "font-heading font-normal text-2xl sm:text-3xl md:text-4xl text-[#1F2937] dark:text-[#F8FAFC] mb-2 leading-tight"}>
        {title}
      </h2>
      {subtitle && <p className="text-slate-500 dark:text-slate-400 mb-6 sm:mb-8 font-sans text-sm sm:text-base">{subtitle}</p>}
      <div className={`mt-10 ${!subtitle ? 'mt-8' : ''}`}>
        {children}
      </div>
    </div>
    
    <div className="mt-8 pt-6">
      <button
        onClick={handleNext}
        disabled={!isNextValid}
        className={`w-full py-4 rounded-full font-sans font-bold text-lg transition-all duration-300 ease-in-out cursor-pointer ${
          isNextValid 
            ? 'bg-[#4CB28E] dark:bg-[#62D2FB] hover:bg-[#007b4d] dark:hover:bg-[#4bbad5] text-white dark:text-[#0E172A] shadow-lg hover:shadow-xl hover:-translate-y-1' 
            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
        }`}
      >
        {buttonText ? buttonText : (isEn ? 'Next' : 'Tiếp tục')}
      </button>
    </div>
  </div>
);

export const OnboardingModal: React.FC<OnboardingProps> = ({ isOpen, onCompleteProfile, onClose, isNight = false, language: initialLang, onLanguageChange }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [isSigningIn, setIsSigningIn] = useState(false);

  // States
  const [language, setLanguage] = useState<'en'|'vi'>(initialLang || 'en');
  const [bedtime, setBedtime] = useState('22:30');
  const [isCustomBedtime, setIsCustomBedtime] = useState(false);
  const [customBedtime, setCustomBedtime] = useState('22:30');
  const [craves, setCraves] = useState<string[]>([]);
  const [caffeineFreq, setCaffeineFreq] = useState('');
  const [chronotype, setChronotype] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [age, setAge] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isAnalyzingChronotype, setIsAnalyzingChronotype] = useState(false);

  const isEn = language === 'en';

  if (!isOpen) return null;


  const handleNext = () => {
    if (currentStep === 4) {
      // Transitioning to Step 5 (Chronotype). Trigger analysis.
      setIsAnalyzingChronotype(true);
      setCurrentStep(5);
      
      // Auto-detect based on bedtime (parse bedtime)
      setTimeout(() => {
        let b = isCustomBedtime ? customBedtime : bedtime;
        let [h, m] = b.split(':').map(Number);
        if (h >= 4 && h < 20) {
           // Weird times, let's just say intermediate
           setChronotype('intermediate');
        } else if (h >= 20 && h <= 22) {
           setChronotype('early_bird');
        } else if (h === 23) {
           setChronotype('intermediate');
        } else {
           setChronotype('night_owl');
        }
        setIsAnalyzingChronotype(false);
      }, 1500);
      return;
    }
    if (currentStep < totalSteps) setCurrentStep(c => c + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const handleComplete = (provider: 'google' | 'guest') => {
    let chosenEmail: string | undefined = undefined;
    if (provider === 'google') {
      const trimmed = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmed || !emailRegex.test(trimmed)) {
        setEmailError(isEn ? 'Please enter a valid email address.' : 'Vui lòng nhập đúng định dạng email (VD: name@gmail.com)');
        return;
      }
      chosenEmail = trimmed;
    }

    setIsSigningIn(true);
    setTimeout(() => {
      onCompleteProfile({
        language,
        name: name.trim() || (isEn ? 'Guest' : 'Khách'),
        usualBedtime: isCustomBedtime ? customBedtime : bedtime,
        targetBedtime: isCustomBedtime ? customBedtime : bedtime,
        craves,
        energyCrave: craves,
        energyCraves: craves,
        caffeineFrequency: caffeineFreq || 'once_a_day',
        chronotype: (chronotype as any) || 'night_owl',
        goals,
        age: age === '' ? 25 : age,
        authProvider: provider,
        email: chosenEmail,
        photoUrl: chosenEmail ? `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(chosenEmail)}` : undefined,
        createdAt: new Date().toISOString()
      });
      setIsSigningIn(false);
    }, 1000);
  };

  const toggleCrave = (id: string) => setCraves(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleGoal = (id: string) => setGoals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleLanguageSelect = (lang: 'en'|'vi') => {
    setLanguage(lang);
    if (onLanguageChange) onLanguageChange(lang);
  };



  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ 
        background: currentStep === 8
          ? (isNight ? 'linear-gradient(90deg, #0A1020 0%, #1A2540 35%, #1A2540 65%, #0A1020 100%)' : 'linear-gradient(90deg, #E6F8F0 0%, #FFFFFF 35%, #FFFFFF 65%, #E6F8F0 100%)')
          : (isNight ? '#1A2540' : '#fffff8')
      }}
    >
      {/* Progress Bar Top Edge (Only steps 1-7) */}
      {currentStep < 8 && (
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 absolute top-0 left-0 z-50">
          <div 
            className="h-full bg-[#4CB28E] dark:bg-[#62D2FB] transition-all duration-500"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          />
        </div>
      )}

      {/* Absolute Top Nav */}
      <div className="fixed top-6 left-6 z-50 flex items-center gap-4">
        {currentStep === 8 ? (
          <div className="animate-fade-in pl-2">
            <Logo size="md" isNight={isNight} />
          </div>
        ) : (
          <button onClick={handleBack} className={`p-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all duration-300 ease-in-out cursor-pointer ${currentStep === 1 ? 'invisible' : 'opacity-100'}`}>
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        )}
      </div>

      <div className="fixed top-6 right-6 z-50">
        <button onClick={onClose} className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all duration-300 ease-in-out cursor-pointer">
          <X className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="flex-1 w-full relative h-full flex flex-col">
        {currentStep === 1 && (
          <StepLayout 
            handleNext={handleNext} 
            isEn={isEn} 
            stepNum={1} 
            titleClassName="font-heading font-normal text-xl sm:text-2xl md:text-[28px] lg:text-[32px] text-[#1F2937] dark:text-[#F8FAFC] mb-2 leading-snug tracking-tight"
            title={
              <span>
                1. Choose your native language <span className="inline-block mx-1.5 text-slate-400 dark:text-slate-500 font-sans font-light">/</span> Chọn ngôn ngữ của bạn
              </span>
            } 
            subtitle="Select the language you are most comfortable with. / Chọn ngôn ngữ bạn cảm thấy thuận tiện nhất."
            buttonText={language === 'vi' ? 'Tiếp tục' : 'Next / Tiếp tục'}
            isNextValid={true}
          >
            <div className="space-y-4">
              <OptionCard 
                label="English" 
                sub="Tiếng Anh" 
                selected={language === 'en'} 
                onClick={() => handleLanguageSelect('en')} 
                icon={
                  <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 tracking-wider">
                    EN
                  </span>
                } 
              />
              <OptionCard 
                label="Vietnamese" 
                sub="Tiếng Việt" 
                selected={language === 'vi'} 
                onClick={() => handleLanguageSelect('vi')} 
                icon={
                  <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 tracking-wider">
                    VI
                  </span>
                } 
              />
            </div>
          </StepLayout>
        )}

        {currentStep === 2 && (
          <StepLayout 
            handleNext={handleNext} 
            isEn={isEn} 
            stepNum={2} 
            title={isEn ? "2. When do you usually sleep?" : "2. Bạn thường ngủ lúc mấy giờ?"} 
            subtitle={isEn ? "Choose the time you usually go to bed each night to personalize your circadian rhythm." : "Chọn khung giờ bạn thường bắt đầu lên giường đi ngủ mỗi đêm để tối ưu nhịp sinh học."}
            isNextValid={true}
          >
            <div className="grid grid-cols-2 gap-3.5">
              {['21:30', '22:00', '22:30', '23:00', '23:30', '00:00'].map(time => (
                <OptionCard key={time} label={formatDisplayTime(time, isEn)} selected={!isCustomBedtime && bedtime === time} onClick={() => { setIsCustomBedtime(false); setBedtime(time); }} />
              ))}
              
              {/* Giờ tùy chỉnh có độ lớn bằng 2 cột cộng lại */}
              <div 
                onClick={() => setIsCustomBedtime(true)}
                className={`col-span-2 w-full text-left px-5 py-4 rounded-full transition-all flex items-center justify-between cursor-pointer ${
                  isCustomBedtime 
                    ? 'border-2 border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E]/10 dark:bg-[#62D2FB]/10' 
                    : 'border-2 border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-sans font-medium ${
                    isCustomBedtime ? 'text-[#1F2937] dark:text-white' : 'text-slate-700 dark:text-slate-200'
                  }`}>
                    {isEn ? 'Custom time:' : 'Giờ tùy chỉnh:'}
                  </span>
                  <div onClick={(e) => { e.stopPropagation(); setIsCustomBedtime(true); }}>
                    <TimePickerInput 
                      value={customBedtime} 
                      onChange={val => { setIsCustomBedtime(true); setCustomBedtime(val); }}
                      isEn={isEn}
                      variant="compact"
                    />
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isCustomBedtime ? 'border-[#4CB28E] dark:border-[#62D2FB] bg-[#4CB28E] dark:bg-[#62D2FB]' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {isCustomBedtime && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          </StepLayout>
        )}

        {currentStep === 3 && (
          <StepLayout 
            handleNext={handleNext} 
            isEn={isEn} 
            stepNum={3} 
            title={isEn ? "3. When your energy runs low, what do you crave most?" : "3. Khi cạn kiệt năng lượng, bạn thèm gì nhất?"} 
            subtitle={isEn ? "You can select multiple options that apply to you." : "Bạn có thể chọn nhiều lựa chọn phù hợp."} 
            isNextValid={craves.length > 0}
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                {id: 'nap', l: isEn ? 'Take a nap' : 'Ngủ chợp mắt', i: '😴'},
                {id: 'caffeine', l: isEn ? 'Have caffeine' : 'Dùng caffeine', i: '☕'},
                {id: 'phone', l: isEn ? 'Scroll on my phone' : 'Lướt điện thoại', i: '📱'},
                {id: 'exercise', l: isEn ? 'Exercise' : 'Tập thể dục', i: '💃'},
                {id: 'relax', l: isEn ? 'Relax quietly' : 'Thư giãn yên tĩnh', i: '🧘‍♀️'},
                {id: 'music', l: isEn ? 'Listen to music' : 'Nghe nhạc', i: '🎧'},
                {id: 'other', l: isEn ? 'Other' : 'Khác', i: '✨'}
              ].map(opt => (
                <OptionCard key={opt.id} label={opt.l} icon={opt.i} selected={craves.includes(opt.id)} onClick={() => toggleCrave(opt.id)} />
              ))}
            </div>
          </StepLayout>
        )}

        {currentStep === 4 && (
          <StepLayout handleNext={handleNext} isEn={isEn} stepNum={4} title={isEn ? "4. How often do you have caffeine?" : "4. Tần suất bạn dùng caffeine?"} isNextValid={caffeineFreq !== ''}>
            <div className="space-y-4">
              {[
                {id: 'never', l: isEn ? 'Never' : 'Không dùng caffeine'},
                {id: 'rarely', l: isEn ? 'Rarely' : 'Hiếm khi'},
                {id: 'few_times_week', l: isEn ? 'A few times a week' : 'Vài lần một tuần'},
                {id: 'once_a_day', l: isEn ? 'Once a day' : 'Mỗi ngày một lần'},
                {id: 'multiple_times_a_day', l: isEn ? 'Multiple times a day' : 'Nhiều lần trong ngày'}
              ].map(opt => (
                <OptionCard key={opt.id} label={opt.l} selected={caffeineFreq === opt.id} onClick={() => setCaffeineFreq(opt.id)} />
              ))}
            </div>
          </StepLayout>
        )}

        {currentStep === 5 && (
          <StepLayout handleNext={handleNext} isEn={isEn} stepNum={5} title={isEn ? "5. What's your chronotype?" : "5. Nhịp sinh học của bạn là gì?"} isNextValid={chronotype !== '' && !isAnalyzingChronotype}>
            {isAnalyzingChronotype ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#4CB28E] dark:border-t-[#62D2FB] rounded-full animate-spin"></div>
                <div className="text-slate-500 font-medium">{isEn ? "Analyzing your sleep habits..." : "Đang phân tích thói quen ngủ của bạn..."}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <OptionCard label={isEn ? "Early bird" : "Người dậy sớm (Chim sớm)"} icon="🌅" selected={chronotype === 'early_bird'} onClick={() => setChronotype('early_bird')} />
                <OptionCard label={isEn ? "Night owl" : "Người thức khuya (Cú đêm)"} icon="🌙" selected={chronotype === 'night_owl'} onClick={() => setChronotype('night_owl')} />
                <OptionCard label={isEn ? "Flexible sleeper" : "Người có lịch ngủ linh hoạt"} icon="✨" selected={chronotype === 'intermediate'} onClick={() => setChronotype('intermediate')} />
                
                {(() => {
                  let b = isCustomBedtime ? customBedtime : bedtime;
                  let [h] = b.split(':').map(Number);
                  let expected = (h >= 20 && h <= 22) ? 'early_bird' : (h >= 0 && h < 4) || h === 23 ? 'night_owl' : 'intermediate';
                  // if they chose something very conflicting
                  let hasConflict = false;
                  if (expected === 'early_bird' && chronotype === 'night_owl') hasConflict = true;
                  if (expected === 'night_owl' && chronotype === 'early_bird') hasConflict = true;
                  
                  if (hasConflict) {
                    return (
                      <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-fade-in">
                        <span className="text-lg">⚠️</span>
                        <span>{isEn ? "Warning: Your selected chronotype doesn't biologically match your bedtime. This may cause sleep inertia." : "Cảnh báo: Nhịp sinh học bạn chọn đang xung đột sinh học với giờ ngủ của bạn. Điều này có thể gây quán tính giấc ngủ."}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </StepLayout>
        )}

        {currentStep === 6 && (
          <StepLayout handleNext={handleNext} isEn={isEn} stepNum={6} title={isEn ? "6. What should we call you?" : "6. Chúng tôi nên gọi bạn là gì?"} isNextValid={name.trim().length > 0}>
            <div className="relative w-full">
              <input
                type="text"
                placeholder={isEn ? "Enter your name or nickname..." : "Nhập tên hoặc biệt danh..."}
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-6 py-5 rounded-full border-2 border-slate-200 focus:border-[#4CB28E] dark:border-[#62D2FB] focus:ring-4 focus:ring-[#4CB28E]/20 outline-none font-sans text-lg text-[#1F2937] dark:text-white bg-white dark:bg-slate-800 transition-all dark:border-slate-700 shadow-sm"
              />
              <User className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            </div>
          </StepLayout>
        )}

        {currentStep === 7 && (
          <StepLayout handleNext={handleNext} isEn={isEn} stepNum={7} title={isEn ? "7. How old are you?" : "7. Bạn bao nhiêu tuổi?"} subtitle={isEn ? "To personalize your sleep needs." : "Để cá nhân hóa nhu cầu giấc ngủ."} isNextValid={age !== '' && age > 0}>
            <input
              type="number"
              min="1"
              max="120"
              placeholder="e.g. 25"
              value={age}
              onChange={e => setAge(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-6 py-5 rounded-full border-2 border-slate-200 focus:border-[#4CB28E] dark:border-[#62D2FB] focus:ring-4 focus:ring-[#4CB28E]/20 outline-none font-sans text-xl text-[#1F2937] dark:text-white bg-white dark:bg-slate-800 transition-all dark:border-slate-700 text-center shadow-sm"
            />
          </StepLayout>
        )}

        {currentStep === 8 && (
          <div className="flex flex-col items-center justify-center w-full max-w-[700px] w-[94%] sm:w-[90%] md:w-[85%] mx-auto px-2 sm:px-6 animate-fade-in text-center h-full min-h-[70vh] pb-10">
            <h1 className="font-heading font-normal text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#1F2937] dark:text-[#F8FAFC] leading-[1.15] mb-6 sm:mb-8">
              {isEn ? (
                <>Save your personalized profile <br/> across all devices</>
              ) : (
                <>Lưu hồ sơ cá nhân hóa của bạn <br/> trên mọi thiết bị</>
              )}
            </h1>

            <div className="w-full max-w-md mx-auto space-y-5 text-left">
              <div>
                <label className="block text-sm font-sans font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {isEn ? "Enter your email to create an account:" : "Nhập email của bạn để đăng ký tài khoản:"}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="example@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleComplete('google');
                    }}
                    className="w-full px-5 py-4 pl-12 rounded-full border-2 border-slate-200 focus:border-[#4CB28E] dark:border-[#62D2FB] focus:ring-4 focus:ring-[#4CB28E]/20 outline-none font-sans text-base text-[#1F2937] dark:text-white bg-white dark:bg-slate-800 transition-all dark:border-slate-700 shadow-sm"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                {emailError && (
                  <p className="text-red-500 text-xs mt-2 font-medium px-4">{emailError}</p>
                )}
              </div>

              <button
                onClick={() => handleComplete('google')}
                disabled={isSigningIn}
                className="w-full py-4 rounded-full border border-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white dark:border-slate-700 flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer active:scale-95"
              >
                <GoogleIcon className="w-6 h-6" />
                <span className="font-sans font-bold text-lg">{isEn ? 'Sign up with Google' : 'Đăng ký bằng Google'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => handleComplete('guest')}
                  disabled={isSigningIn}
                  className="font-sans font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors underline underline-offset-4 cursor-pointer text-sm"
                >
                  {isEn ? 'or Continue as guest (temporary, no history saved)' : 'hoặc Tiếp tục dưới dạng khách (tạm thời, không lưu trữ)'}
                </button>
              </div>
            </div>
            
            {isSigningIn && (
              <div className="absolute inset-0 bg-white/50 dark:bg-[#1A2540]/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-3xl">
                <div className="w-10 h-10 border-4 border-[#4CB28E]/30 dark:border-[#62D2FB]/30 border-t-[#4CB28E] dark:border-t-[#62D2FB] rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
