import { SleepQualityMetrics, UserProfile } from '../types';

/**
 * Chuyển chuỗi giờ dạng "07:30 AM", "07:30", "14:30", "23:15", "11:00 PM" thành số phút trong ngày (0 -> 1439).
 */
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 23 * 60; // Mặc định 23:00 (11:00 PM)
  const isPM = /pm/i.test(timeStr);
  const isAM = /am/i.test(timeStr);
  const clean = timeStr.replace(/(am|pm)/gi, '').trim();
  const parts = clean.split(':').map(Number);
  let h = parts[0] || 0;
  const m = parts[1] || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return ((h * 60 + m) % 1440 + 1440) % 1440;
};

/**
 * Tính khoảng cách thời gian vòng tròn (trên mặt đồng hồ 24h) giữa 2 mốc phút.
 * Giá trị trả về từ 0 đến 720 phút (12 tiếng).
 */
export const getCircularTimeDifferenceMinutes = (min1: number, min2: number): number => {
  const diff = Math.abs(min1 - min2) % 1440;
  return diff > 720 ? 1440 - diff : diff;
};

/**
 * Tính số giờ ngủ thực tế từ giờ ngủ tới giờ thức dậy.
 */
export const calculateDurationHours = (
  bedtimeStr: string,
  wakeTimeStr: string,
  fallbackHoursStr?: string
): number => {
  if (fallbackHoursStr) {
    const match = fallbackHoursStr.match(/([\d.]+)/);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 24) {
        return parsed;
      }
    }
  }

  const bedMin = parseTimeToMinutes(bedtimeStr);
  const wakeMin = parseTimeToMinutes(wakeTimeStr);

  let diffMin = wakeMin - bedMin;
  if (diffMin <= 0) {
    diffMin += 1440; // Qua đêm
  }

  return Math.round((diffMin / 60) * 10) / 10;
};

export interface CalculateSleepScoreOptions {
  isRecommendation?: boolean;
  bedtime: string;
  wakeTime: string;
  totalSleepHours?: string;
  userProfile?: UserProfile | null;
  napDurationMinutes?: number;
  caffeineBufferHours?: number;
  language?: 'en' | 'vi';
}

/**
 * Tính toán Điểm Chất lượng Giấc ngủ (Sleep Quality Score: 0 - 100)
 * Dựa trên:
 * 1. Metric Thời lượng (Sleep Duration Metric) — Tối đa 55 điểm:
 *    - Chuẩn vàng khoa học giấc ngủ người trưởng thành: 7.25h - 8.5h (5 chu kỳ 90p).
 *    - Thừa hoặc thiếu ngủ sẽ bị trừ điểm theo tỉ lệ.
 *    - Có giấc chợp mắt (nap) khoa học giúp phục hồi thêm điểm nếu giấc đêm hơi ngắn.
 * 2. Metric Độ nhất quán (Sleep Consistency Metric) — Tối đa 45 điểm:
 *    - Đo độ lệch giữa giờ ngủ thực tế hôm nay và giờ ngủ thói quen (usualBedtime) trong hồ sơ.
 *    - Đồng bộ nhịp SCN (Suprachiasmatic nucleus) giúp tăng tỷ lệ pha ngủ sâu (Deep SWS) và REM.
 */
export const calculateSleepQualityScore = ({
  bedtime,
  wakeTime,
  totalSleepHours,
  userProfile,
  napDurationMinutes = 0,
  caffeineBufferHours = 9,
  isRecommendation = false,
  language = 'en',
}: CalculateSleepScoreOptions): SleepQualityMetrics => {
  const isEn = language === 'en';

  const durationHours = calculateDurationHours(bedtime, wakeTime, totalSleepHours);

  // 1. TÍNH ĐIỂM THỜI LƯỢNG (DURATION SCORE: MAX 55 ĐIỂM)
  let rawDurationScore = 0;
  let durationDetail = '';

  if (durationHours >= 7.25 && durationHours <= 8.5) {
    // Lý tưởng: ~5 chu kỳ 90 phút (7.5h)
    rawDurationScore = 53 + Math.min(2, Math.max(0, (durationHours - 7.25) * 1.6));
    durationDetail = isEn ? `${durationHours}h • Optimal 5 deep sleep cycles` : `${durationHours}h • Chuẩn 5 chu kỳ ngủ sâu tối ưu`;
  } else if (durationHours > 8.5 && durationHours <= 9.5) {
    // Ngủ bù tốt: ~6 chu kỳ (9h)
    rawDurationScore = 50 - (durationHours - 8.5) * 4;
    durationDetail = isEn ? `${durationHours}h • Great recovery sleep` : `${durationHours}h • Giấc ngủ bù phục hồi thể lực`;
  } else if (durationHours >= 6.25 && durationHours < 7.25) {
    // Hơi thiếu nhẹ (4 - 4.5 chu kỳ)
    rawDurationScore = 44 + (durationHours - 6.25) * 8;
    durationDetail = isEn ? `${durationHours}h • Near optimal (4-5 cycles)` : `${durationHours}h • Gần đạt chuẩn (4-5 chu kỳ)`;
  } else if (durationHours >= 5.0 && durationHours < 6.25) {
    // Thiếu ngủ trung bình
    rawDurationScore = 32 + (durationHours - 5.0) * 9.6;
    durationDetail = isEn ? `${durationHours}h • Below recommended, fatigue likely` : `${durationHours}h • Dưới khuyến nghị, dễ mệt mỏi`;
  } else if (durationHours >= 4.0 && durationHours < 5.0) {
    // Thiếu ngủ nặng
    rawDurationScore = 20 + (durationHours - 4.0) * 12;
    durationDetail = isEn ? `${durationHours}h • High sleep debt, poor focus` : `${durationHours}h • Nợ ngủ cao, suy giảm tập trung`;
  } else if (durationHours < 4.0) {
    // Kiệt sức
    rawDurationScore = Math.max(10, durationHours * 4.5);
    durationDetail = isEn ? `${durationHours}h • Severe sleep deprivation` : `${durationHours}h • Rất thiếu ngủ, cần ngủ bù gấp`;
  } else {
    // Ngủ quá nhiều (> 9.5h) có thể gây ngái ngủ / quán tính ngủ
    rawDurationScore = Math.max(30, 48 - (durationHours - 9.5) * 7);
    durationDetail = isEn ? `${durationHours}h • Oversleeping, may cause inertia` : `${durationHours}h • Ngủ dài, có thể gây ngái ngủ`;
  }

  // Cộng điểm phục hồi nếu có giấc chợp mắt (nap) khi ngủ đêm < 7.25h
  if (napDurationMinutes >= 15 && napDurationMinutes <= 45 && durationHours < 7.5) {
    const napBonus = Math.min(5, Math.round((napDurationMinutes / 20) * 2.5));
    rawDurationScore = Math.min(55, rawDurationScore + napBonus);
    durationDetail += isEn ? ` (+Nap ${napDurationMinutes}m offset)` : ` (+Nap ${napDurationMinutes}p bù nợ)`;
  }

  const durationScore = Math.min(55, Math.max(0, Math.round(rawDurationScore)));

  // 2. TÍNH ĐIỂM ĐỘ NHẤT QUÁN (CONSISTENCY SCORE: MAX 45 ĐIỂM)
  const currentBedMin = parseTimeToMinutes(bedtime);
  
  // Lấy usualBedtime từ hồ sơ người dùng nếu có, hoặc mặc định 23:00
  const usualBedtimeStr = userProfile?.usualBedtime || '23:00';
  const usualBedMin = parseTimeToMinutes(usualBedtimeStr);

  const rawVarianceMin = getCircularTimeDifferenceMinutes(currentBedMin, usualBedMin);
  const varianceMin = isRecommendation ? Math.min(rawVarianceMin, 30) : rawVarianceMin; // Leniency for optimal plans

  let rawConsistencyScore = 0;
  let consistencyDetail = '';

  if (varianceMin <= 20) {
    // Sai lệch cực nhỏ: Đồng bộ nhịp sinh học tuyệt đối
    rawConsistencyScore = 45 - (varianceMin / 20) * 2;
    consistencyDetail = isEn ? `${varianceMin}m variance from habit • Excellent` : `Lệch ${varianceMin}p so với thói quen • Rất chuẩn`;
  } else if (varianceMin <= 45) {
    // Sai lệch trong vùng an toàn (dưới 45p)
    rawConsistencyScore = 40 + ((45 - varianceMin) / 25) * 3;
    consistencyDetail = isEn ? `${varianceMin}m variance • Good consistency` : `Lệch ${varianceMin}p so với thói quen • Nhất quán tốt`;
  } else if (varianceMin <= 90) {
    // Sai lệch 1 - 1.5 tiếng
    rawConsistencyScore = 32 + ((90 - varianceMin) / 45) * 8;
    consistencyDetail = isEn ? `${varianceMin}m variance • Slight circadian shift` : `Lệch ${varianceMin}p • Nhịp sinh học xê dịch nhẹ`;
  } else if (varianceMin <= 150) {
    // Sai lệch 1.5 - 2.5 tiếng (Social jetlag)
    rawConsistencyScore = 22 + ((150 - varianceMin) / 60) * 10;
    consistencyDetail = isEn ? `${Math.round(varianceMin / 60 * 10) / 10}h variance • Noticeable shift` : `Lệch ${Math.round(varianceMin / 60 * 10) / 10}h • Có độ trễ nhịp sinh học`;
  } else {
    // Sai lệch lớn (> 2.5 tiếng)
    rawConsistencyScore = Math.max(10, 20 - ((varianceMin - 150) / 120) * 8);
    consistencyDetail = isEn ? `${Math.round(varianceMin / 60 * 10) / 10}h variance • Severe shift` : `Lệch ${Math.round(varianceMin / 60 * 10) / 10}h • Lệch ca nhiều so với thường ngày`;
  }

  // Bảo vệ chất lượng ngủ: nếu ngừng caffeine đúng chuẩn (buffer >= 8.5 tiếng), cộng nhẹ 1-2 điểm độ sâu
  if (caffeineBufferHours >= 8.5 && rawConsistencyScore < 45) {
    rawConsistencyScore = Math.min(45, rawConsistencyScore + 2);
  }

  const consistencyScore = Math.min(45, Math.max(0, Math.round(rawConsistencyScore)));

  // 3. TỔNG ĐIỂM (0 - 100)
  let totalScore = Math.min(100, Math.max(0, durationScore + consistencyScore));
  if (isRecommendation && totalScore < 90) totalScore = Math.max(90, totalScore);

  // 4. XẾP HẠNG & PHẢN HỒI THÂN THIỆN
  let rating: SleepQualityMetrics['rating'] = 'good';
  let ratingLabel = '';
  let ratingColor: SleepQualityMetrics['ratingColor'] = 'blue';
  let feedback = '';

  if (totalScore >= 88) {
    rating = 'exceptional';
    ratingLabel = 'Tối ưu (Xuất sắc)';
    ratingColor = 'emerald';
    feedback = `Thời lượng đạt chuẩn ${durationHours}h và giờ ngủ khớp nhịp sinh học (lệch ${varianceMin}p). Giấc ngủ sâu SWS và REM sẽ diễn ra trọn vẹn nhất.`;
  } else if (totalScore >= 74) {
    rating = 'good';
    ratingLabel = 'Tốt & Cân bằng';
    ratingColor = 'blue';
    feedback = `Lịch ngủ ${durationHours}h phục hồi tốt thể lực. Duy trì khung giờ này sẽ giúp bạn tỉnh táo tự nhiên vào sáng mai.`;
  } else if (totalScore >= 58) {
    rating = 'fair';
    ratingLabel = 'Khá (Cần lưu ý)';
    ratingColor = 'amber';
    feedback = durationHours < 6.5
      ? `Thời lượng ${durationHours}h hơi ngắn so với nhu cầu. Hãy kết hợp một giấc chợp mắt 20-30p buổi trưa để nạp lại năng lượng.`
      : `Giờ ngủ lệch ${Math.round(varianceMin / 60 * 10) / 10}h so với thói quen. Nên duy trì giờ lên giường ổn định hơn để tránh mệt mỏi.`;
  } else {
    rating = 'needs_rest';
    ratingLabel = 'Cần phục hồi gấp';
    ratingColor = 'rose';
    feedback = `Thời lượng ${durationHours}h và lệch nhịp nhiều (${Math.round(varianceMin / 60 * 10) / 10}h). Hãy cố gắng ngủ sớm hơn hoặc dùng tính năng Tái tạo (Auto-Regenerate) để bù nợ ngủ.`;
  }

  return {
    totalScore,
    durationScore,
    consistencyScore,
    durationHours,
    consistencyVarianceMinutes: varianceMin,
    rating,
    ratingLabel,
    ratingColor,
    feedback,
    breakdown: {
      durationTitle: isEn ? `Total Sleep Duration (${durationScore}/55)` : `Thời lượng ngủ (${durationScore}/55)`,
      durationDetail,
      consistencyTitle: isEn ? `Circadian Consistency (${consistencyScore}/45)` : `Độ nhất quán giờ ngủ (${consistencyScore}/45)`,
      consistencyDetail,
    },
  };
};
