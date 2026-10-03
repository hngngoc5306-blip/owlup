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
              {/* Highlight Recommendation Banner */}
              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4 border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
                <Sun className="w-6 h-6 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg text-amber-900 dark:text-amber-200">
                    {isEn ? '💡 Best Practice: Start Your Day with OwlUp' : '💡 Mẹo vàng: Mở OwlUp ngay khi bắt đầu ngày mới'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-amber-800/90 dark:text-amber-200/80 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'The most effective time to use OwlUp is in the morning as you start your day. By setting your wake-up anchor for tomorrow and your busy hours early, OwlUp immediately reverse-calculates your ideal afternoon nap, caffeine curfew, and bedtime for an optimal 24h timeline!'
                      : 'Thời điểm lý tưởng nhất để mở OwlUp là vào buổi sáng khi vừa thức dậy. Chỉ cần thiết lập mốc giờ thức dậy sáng mai và lịch bận, OwlUp sẽ tính toán lùi khoa học ngay từ sớm: giờ chợp mắt trưa, giờ ngắt caffeine và giờ đi ngủ tối nay để bạn có lộ trình 24h trọn vẹn nhất!'}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl flex items-start gap-4" style={{ border: '1px solid rgba(76,178,141,0.3)', backgroundColor: 'rgba(76,178,141,0.10)' }}>
                <Moon className="w-6 h-6 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                <div>
                  <h4 className="font-heading font-bold text-base sm:text-lg dark:text-white">
                    {isEn ? 'Dashboard: Core Health Hub' : 'Trang tổng quan: Trung tâm điều hướng nhanh'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Instantly view your 2 core biological anchors for the day: tonight’s sleep window and your strict afternoon caffeine cutoff time.'
                      : 'Nắm bắt tức thì 2 thông số sinh học quan trọng nhất trong ngày: Giấc ngủ đêm nay (giờ ngủ → giờ dậy) và Giờ ngưng nạp caffeine an toàn.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Tonight’s Sleep & Power Nap:' : 'Giấc ngủ đêm & Chợp mắt trưa:'}
                    </strong>{' '}
                    {isEn
                      ? 'Shows tonight’s bedtime, wake target, and scheduled nap duration to keep your energy peaks stable.'
                      : 'Hiển thị giờ lên giường, giờ thức dậy và thời lượng chợp mắt để duy trì mức năng lượng cao nhất.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Adjust Sleep Schedule Shortcut:' : 'Tùy chỉnh lịch ngủ tiện lợi:'}
                    </strong>{' '}
                    {isEn
                      ? 'Use the "Adjust Sleep Schedule" button anytime your day’s plans shift to re-optimize rest times.'
                      : 'Nhấn nút "Tùy chỉnh lịch ngủ" bất kỳ lúc nào có kế hoạch mới để cập nhật lại lịch trình.'}
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
                    {isEn ? 'Synchronize Sleep & Power Nap (Sleep Schedule)' : 'Thiết lập & Đồng bộ Lịch ngủ 4 bước'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Reverse-engineers your optimal rest schedule around your actual commitments, detecting sleep debt and protecting deep recovery.'
                      : 'Tự động tính toán ngược lịch nghỉ ngơi tối ưu theo lịch trình bận rộn, phát hiện nợ ngủ hôm qua và bảo vệ giấc ngủ sâu.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
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
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Step 3: Smart Sleep Debt & Nap Recommendation:' : 'Bước 3: Đề xuất lịch ngủ & Bù đắp nợ giấc:'}
                    </strong>{' '}
                    {isEn
                      ? 'Automatically adapts tonight’s sleep if you incurred sleep debt yesterday, scheduling a midday nap before 15:30 and 10h caffeine curfew.'
                      : 'Tự động phát hiện nợ ngủ hôm qua để bù đắp tối nay; xếp lịch chợp mắt trưa (trước 15:30) và giờ ngắt caffeine chuẩn xác (10h trước khi ngủ).'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Step 4: Custom Adjustment & Confirm:' : 'Bước 4: Tự sắp xếp lịch ngủ & Đồng ý:'}
                    </strong>{' '}
                    {isEn
                      ? 'Fine-tune sleep and nap times flexibly with strict input validation, then confirm to sync to your 24h Timeline.'
                      : 'Chủ động điều chỉnh giờ ngủ và thời lượng chợp mắt theo mong muốn, sau đó nhấn "Đồng ý" để lưu vào Lộ trình 24h.'}
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
                    {isEn ? 'Caffeine Advisor: Smart Metabolism Tracking' : 'Tư vấn Caffeine: Quản lý năng lượng thông minh'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Track your drinks in real time. OwlUp calculates caffeine half-life decay to safeguard your deep sleep quality.'
                      : 'Ghi nhận đồ uống theo thời gian thực. OwlUp tính toán chu kỳ bán hủy (half-life) đào thải caffeine để bảo vệ giấc ngủ sâu.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Diverse Drink Library & Custom Input:' : 'Thư viện đồ uống đa dạng & Nhập nhanh:'}
                    </strong>{' '}
                    {isEn
                      ? 'Log espresso, drip coffee, green tea, matcha, energy drinks, and boba with accurate mg caffeine contents.'
                      : 'Ghi nhận cà phê phin, espresso, trà, matcha, nước tăng lực, pre-workout... với hàm lượng caffeine chuẩn.'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Safe 400mg Limit & Bedtime Curfew:' : 'Hạn mức an toàn 400mg & Cảnh báo trước ngủ:'}
                    </strong>{' '}
                    {isEn
                      ? 'Prevents caffeine jitter and warns you when drinking too close to tonight’s scheduled bedtime.'
                      : 'Bảo vệ tim mạch khỏi quá liều (tối đa 400mg/ngày) và cảnh báo khi nạp caffeine quá gần giờ đi ngủ.'}
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
                    {isEn ? '24h Circadian Timeline: Your Daily Compass' : 'Lộ trình phục hồi 24h: Kim chỉ nam nhịp sinh học'}
                  </h4>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {isEn
                      ? 'Follow personalized biological milestones throughout the day to sustain high performance without burnout.'
                      : 'Bám sát chuỗi mốc sinh học cá nhân hóa trong suốt 24 giờ để làm việc hiệu quả mà không bị kiệt sức.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 dark:text-slate-300">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: isNight ? '#62D2FB' : '#4CB28E' }} />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? '5 Core Daily Milestones:' : '5 Mốc sinh học cốt lõi:'}
                    </strong>{' '}
                    {isEn
                      ? 'Sunlight exposure (cortisol boost), peak focus caffeine window, power nap, caffeine cutoff, and wind-down bedtime (melatonin release).'
                      : 'Đón ánh sáng mặt trời (tăng cortisol), Khung giờ vàng caffeine, Chớp mắt xả mệt, Ngừng caffeine và Chuẩn bị ngủ (tiết melatonin).'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2D3748]/50 bg-slate-100 dark:bg-[#233355]/40 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#4CB28E] dark:text-[#62D2FB] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {isEn ? 'Live Status Indicators:' : 'Chỉ báo thời gian thực:'}
                    </strong>{' '}
                    {isEn
                      ? 'Real-time markers let you know exactly what your body needs at any given moment.'
                      : 'Đánh dấu trực quan mốc thời gian thực hiện tại để bạn luôn biết cơ thể cần làm gì ngay lúc này.'}
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
