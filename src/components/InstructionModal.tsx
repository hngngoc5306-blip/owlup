import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  LayoutDashboard, 
  CalendarCheck, 
  Coffee, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Moon
} from 'lucide-react';
import { AppLanguage } from '../types';

export type FeatureGuideType = 'dashboard' | 'planner' | 'caffeine' | 'timeline' | 'all';

interface InstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNight: boolean;
  language?: AppLanguage;
  featureFocus?: FeatureGuideType;
  onNavigateToDashboard?: () => void;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({
  isOpen,
  onClose,
  isNight,
  language = 'en',
  featureFocus = 'all',
  onNavigateToDashboard,
}) => {
  const isEn = language === 'en';

  const getInitialSlide = (focus: FeatureGuideType): number => {
    switch (focus) {
      case 'dashboard': return 1;
      case 'planner': return 2;
      case 'caffeine': return 3;
      case 'timeline': return 4;
      default: return 1;
    }
  };

  const [activeSlide, setActiveSlide] = useState<number>(() => getInitialSlide(featureFocus));

  useEffect(() => {
    if (isOpen) {
      setActiveSlide(getInitialSlide(featureFocus));
    }
  }, [featureFocus, isOpen]);

  if (!isOpen) return null;

  const isSingleMode = featureFocus !== 'all';
  const totalSlides = 4;

  const handleNext = () => {
    if (isSingleMode) {
      handleFinish();
      return;
    }
    
    if (activeSlide < totalSlides) {
      setActiveSlide(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (activeSlide > 1) {
      setActiveSlide(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    onClose();
    if (featureFocus === 'dashboard' && onNavigateToDashboard) {
      onNavigateToDashboard();
    }
  };

  return (
    <div 
      id="instruction-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        id="instruction-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all animate-scale-in"
        style={{
          backgroundColor: isNight ? '#1A2540' : '#FFFFFF',
          borderColor: isNight ? '#2D3748' : '#E5E7EB',
          color: isNight ? '#F8FAFC' : '#1F2937',
        }}
      >
        {/* HEADER BAR */}
        <div 
          className="p-5 pb-4 border-b flex items-center justify-between"
          style={{
            borderColor: isNight ? '#2D3748' : '#F1F5F9',
            backgroundColor: isNight ? '#23374B' : '#F8FAFC',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(76,178,141,0.15)', color: isNight ? '#62D2FB' : '#4CB28E' }}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }}>
                {isSingleMode 
                  ? (isEn ? 'Feature Guide' : 'Khám phá tính năng')
                  : (isEn ? 'OwlUp Guidebook' : 'Cẩm nang OwlUp')}
              </span>
              <h3 className="font-heading font-bold text-base sm:text-lg">
                {activeSlide === 1 && (isEn ? 'Understanding Your Dashboard' : 'Ý nghĩa của Tổng quan')}
                {activeSlide === 2 && (isEn ? 'How to Use Sleep Schedule' : 'Cách dùng Lịch ngủ')}
                {activeSlide === 3 && (isEn ? 'Caffeine Metabolism Logic' : 'Cơ chế tính Caffeine')}
                {activeSlide === 4 && (isEn ? 'The 24h Circadian Timeline' : 'Lộ trình chăm sóc 24h')}
              </h3>
            </div>
          </div>

          <button
            onClick={handleFinish}
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-200 hover:bg-slate-700/20 transition-colors cursor-pointer"
            title={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TAB BUTTONS */}
        {!isSingleMode && (
          <div className="flex border-b border-slate-200 dark:border-[#2D3748]/40 bg-slate-100 dark:bg-[#233355]/40 px-3 py-2 gap-1.5 text-sm font-semibold overflow-x-auto">
            {[
              { id: 1, label: isEn ? 'Dashboard' : 'Tổng quan', icon: LayoutDashboard },
              { id: 2, label: isEn ? 'Sleep Schedule' : 'Lịch ngủ', icon: CalendarCheck },
              { id: 3, label: isEn ? 'Caffeine' : 'Caffeine', icon: Coffee },
              { id: 4, label: isEn ? 'Timeline' : 'Lộ trình', icon: Clock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSlide(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shrink-0 text-sm ${
                    activeSlide === tab.id
                      ? 'font-bold text-white dark:text-[#0E172A] shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-[#233355]'
                  }`}
                  style={activeSlide === tab.id ? { backgroundColor: isNight ? '#62D2FB' : '#4CB28E' } : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* SLIDE CONTENT */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">
          {/* SLIDE 1: DASHBOARD */}
          {activeSlide === 1 && (
            <div className="space-y-4 animate-premium-in">
              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4" style={{ border: '1px solid rgba(76,178,141,0.3)', backgroundColor: 'rgba(76,178,141,0.10)' }}>
                <Moon className="w-6 h-6 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Start Your Day: The Dashboard' : 'Bắt đầu ngày mới với Trang tổng quan'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Check this screen first thing in the morning. It instantly tells you exactly when to sleep tonight and your strict cutoff time to stop drinking coffee today.'
                      : 'Mỗi sáng thức dậy, hãy mở mục Tổng quan đầu tiên. Ở đây sẽ chỉ định rõ đêm nay bạn cần ngủ mấy giờ và mấy giờ chiều nay phải dừng nạp cà phê.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Follow the Sleep Plan:' : 'Lịch ngủ & Chợp mắt:'}
                    </strong>{' '}
                    {isEn
                      ? 'Target 5 full 90-minute sleep cycles (7.5 hours) for deep physical and cognitive rejuvenation.'
                      : 'Thiết lập 5 chu kỳ (7.5 tiếng) để phục hồi tối đa thể chất và thần kinh.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Watch your Caffeine Cutoff:' : 'Lưu ý giờ ngắt Caffeine:'}
                    </strong>{' '}
                    {isEn
                      ? 'Enforces stopping caffeine 8 hours before bed so half-life metabolism clears your bloodstream.'
                      : 'Dừng nạp caffeine trước giờ ngủ 8 tiếng để cơ thể kịp đào thải sạch.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: SLEEP SCHEDULE */}
          {activeSlide === 2 && (
            <div className="space-y-4 animate-premium-in">
              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4" style={{ border: '1px solid rgba(76,178,141,0.3)', backgroundColor: 'rgba(76,178,141,0.10)' }}>
                <CalendarCheck className="w-6 h-6 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Synchronize Sleep & Power Nap (Sleep Schedule)' : 'Đồng bộ Giấc ngủ & Chợp mắt (Lịch ngủ)'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Synchronize your biological clock with your busy routine. Simply enter your busy commitments (work, study, shifts), and OwlUp will automatically optimize your night sleep and afternoon power nap.'
                      : 'Đồng bộ hóa nhịp sinh học với lịch trình bận rộn. Bạn chỉ cần nhập khung giờ bận (học tập, làm việc, ca kíp), hệ thống sẽ tự động tính toán thời gian ngủ đêm và chợp mắt buổi trưa tối ưu nhất cho bạn.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Step 1: Your busy hours' : 'Bước 1: Khung giờ bận trong ngày'}
                    </strong>{' '}
                    {isEn
                      ? 'Enter classes, shifts, meetings, or workouts so the system finds optimal rest slots.'
                      : 'Nhập lịch học, ca làm, họp hoặc tập luyện để hệ thống tìm khoảng trống rảnh rỗi trong ngày.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Step 2: Recommended recovery routine' : 'Bước 2: Lịch phục hồi đề xuất'}
                    </strong>{' '}
                    {isEn
                      ? 'Calculates quality score (90+ standard), optimal bedtime, wake time, and afternoon power nap.'
                      : 'Hệ thống tính điểm chất lượng (chuẩn từ 90+ điểm), đề xuất giờ ngủ đêm và chợp mắt buổi trưa.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Step 3: Flexible customization' : 'Bước 3: Tùy chỉnh linh hoạt'}
                    </strong>{' '}
                    {isEn
                      ? 'Fine-tune sleep hours and nap duration to your liking, then agree to sync directly to your 24h Timeline.'
                      : 'Chủ động điều chỉnh giờ ngủ và chợp mắt theo mong muốn, sau đó đồng ý để lưu vào Lộ trình 24h.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: CAFFEINE */}
          {activeSlide === 3 && (
            <div className="space-y-4 animate-premium-in">
              <div className="p-4 sm:p-5 rounded-2xl border border-[#62D2FB]/30 bg-[#62D2FB]/10 flex items-start gap-4">
                <Coffee className="w-6 h-6 text-[#62D2FB] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Log your Drinks (Caffeine)' : 'Ghi chú đồ uống (Caffeine)'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? "Just drank a cup of coffee? Go to this tab and log it immediately. We will track how much energy you have left."
                      : 'Vừa uống xong một ly cà phê? Hãy vào tab này và chọn loại đồ uống tương ứng. Hệ thống sẽ tính xem bạn còn được uống thêm bao nhiêu nữa.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Track your Safe Limit:' : 'Theo dõi hạn mức an toàn:'}
                    </strong>{' '}
                    {isEn
                      ? 'Protects your heart health and guarantees restful deep sleep phases.'
                      : 'Bảo vệ tim mạch và bảo đảm giấc ngủ sâu không bị xáo trộn.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'See when it wears off:' : 'Biết khi nào hết tác dụng:'}
                    </strong>{' '}
                    {isEn
                      ? 'Every logged cup automatically synchronizes with the 24-hour recovery timeline.'
                      : 'Mọi cốc đồ uống ghi nhận sẽ tự động đồng bộ sang lộ trình phục hồi 24 giờ.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: TIMELINE */}
          {activeSlide === 4 && (
            <div className="space-y-4 animate-premium-in">
              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4" style={{ border: '1px solid rgba(76,178,141,0.3)', backgroundColor: 'rgba(76,178,141,0.10)' }}>
                <Clock className="w-6 h-6 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Follow your Daily Routine (Timeline)' : 'Bám sát nhịp độ trong ngày (Lộ trình)'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? "Scroll through the timeline to see exactly what you should be doing right now. It's your step-by-step guide for the whole day."
                      : 'Trượt dọc thanh Lộ trình để biết ngay lúc này bạn nên làm gì. Đó là lịch trình chi tiết từng bước cho cả ngày của bạn.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'What to do right now:' : 'Hành động ngay lúc này:'}
                    </strong>{' '}
                    {isEn
                      ? 'Syncs with your biological chronotype without harsh alarm shocks.'
                      : 'Đồng bộ nhịp điệu sinh học mà không gây căng thẳng hay phán xét.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BUTTONS */}
        <div 
          className="p-4 sm:p-5 border-t flex items-center justify-between"
          style={{
            borderColor: isNight ? '#1E293B' : '#F1F5F9',
            backgroundColor: isNight ? '#0F172A' : '#FFFFFF',
          }}
        >
          {activeSlide > 1 && !isSingleMode ? (
            <button
              onClick={handleBack}
              className="px-4 py-2.5 text-sm sm:text-base font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isEn ? 'Back' : 'Quay lại'}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-7 py-3 rounded-xl text-sm sm:text-base font-bold flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 hover:-translate-y-0.5"
            style={{ backgroundColor: isNight ? '#62D2FB' : '#4CB28E', color: isNight ? '#0E172A' : '#FFFFFF' }}
          >
            <span>
              {activeSlide === totalSlides || isSingleMode 
                ? (isEn ? 'Got it' : 'Đã hiểu')
                : (isEn ? 'Next' : 'Tiếp theo')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default InstructionModal;
