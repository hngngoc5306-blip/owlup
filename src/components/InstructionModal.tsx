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
  Moon,
  Sun
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
                      ? 'font-bold text-white dark:text-[#17233E] shadow-sm'
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
              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4 border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
                <Sun className="w-6 h-6 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg text-amber-900 dark:text-amber-200">
                    {isEn ? '💡 Pro Tip: Start Your Day with OwlUp' : '💡 Mẹo vàng: Mở OwlUp vào buổi sáng'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-amber-800/90 dark:text-amber-200/80 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Input tomorrow’s wake time and today’s busy hours every morning. OwlUp will instantly reverse-calculate your optimal nap, caffeine curfew, and bedtime.'
                      : 'Hãy tạo thói quen nhập giờ thức dậy sáng mai và lịch bận ngay vào buổi sáng. OwlUp sẽ tự động tính toán lùi giờ chợp mắt, giờ ngắt caffeine và giờ đi ngủ tối nay.'}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4" style={{ border: '1px solid rgba(76,178,141,0.3)', backgroundColor: 'rgba(76,178,141,0.10)' }}>
                <LayoutDashboard className="w-6 h-6 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Dashboard: Your Daily Compass' : 'Trang chủ: La bàn nhịp sinh học'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Instantly view your key biological anchors: tonight’s sleep window and your strict caffeine cutoff time.'
                      : 'Nắm bắt nhanh 2 thông số quyết định mức năng lượng trong ngày: Khung giờ ngủ và Giờ ngắt Caffeine an toàn.'}
                  </p>
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
                    {isEn ? 'Sleep Schedule: Smart Auto-Planning' : 'Lịch ngủ: Tự động hóa thời gian nghỉ'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'No manual math needed. Just input your busy slots (meetings, work) and tomorrow’s wake time.'
                      : 'Không cần tự tính toán. Chỉ cần nhập các khung giờ bận (làm việc, họp hành) và thời điểm thức dậy mong muốn vào ngày mai.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Gap Analysis & Power Naps:' : 'Tối ưu khe hở thời gian:'}
                    </strong>{' '}
                    {isEn
                      ? 'The algorithm finds gaps in your schedule to insert restorative power naps and calculate a bedtime that guarantees full sleep cycles.'
                      : 'Thuật toán sẽ tự động phân tích thời gian rảnh để chèn giấc ngủ trưa (Power Nap) phù hợp và tính toán giờ lên giường chuẩn khoa học.'}
                  </div>
                </div>
              </div>
            </div>
          )}
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Step 1 & 2: Busy Hours & Wake Anchor:' : 'Bước 1 & 2: Khung giờ bận & Giờ dậy sáng mai:'}
                    </strong>{' '}
                    {isEn
                      ? 'Input classes, work shifts, and your required wake-up time, then choose 1 of 4 scientific recovery goals.'
                      : 'Nhập lịch học, ca làm và mốc giờ dậy muộn nhất sáng mai, sau đó chọn 1 trong 4 mục tiêu phục hồi sinh học.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />

          {/* SLIDE 3: CAFFEINE */}
          {activeSlide === 3 && (
            <div className="space-y-4 animate-premium-in">
              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4" style={{ border: '1px solid rgba(76,178,141,0.3)', backgroundColor: 'rgba(76,178,141,0.10)' }}>
                <Coffee className="w-6 h-6 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Caffeine: Prevent Energy Crashes' : 'Caffeine: Tránh sập nguồn'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Control your caffeine intake to stay alert without ruining your deep sleep.'
                      : 'Kiểm soát lượng Caffeine nạp vào để duy trì sự tỉnh táo mà không phá vỡ giấc ngủ đêm.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Protect Your Sleep:' : 'Bảo vệ giấc ngủ:'}
                    </strong>{' '}
                    {isEn
                      ? 'Track your drinks. OwlUp shows the real-time half-life decay and warns you if you drink too close to your cutoff time.'
                      : 'Hiển thị thời gian đào thải (half-life) và cảnh báo tự động nếu bạn uống cà phê quá gần "Giờ giới nghiêm" (Curfew).'}
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
                    {isEn ? '24h Timeline: Live Tracking' : 'Lộ trình 24h: Theo dõi thời gian thực'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'A visual map showing exactly what stage of the circadian rhythm your body is currently in.'
                      : 'Bản đồ trực quan chỉ ra chính xác cơ thể bạn đang ở giai đoạn nào trong ngày.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? '5 Biological Pillars:' : '5 Trụ cột sinh học:'}
                    </strong>{' '}
                    {isEn
                      ? 'Sunlight exposure, Peak caffeine window, Power nap, Caffeine cutoff, and Melatonin wind-down time.'
                      : 'Thời điểm đón ánh nắng, Khung giờ vàng uống cafe, Thời gian chợp mắt, Giờ ngắt cafe, và Giờ tiết Melatonin để ngủ.'}
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
            style={{ backgroundColor: isNight ? '#62D2FB' : '#4CB28E', color: isNight ? '#17233E' : '#FFFFFF' }}
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
