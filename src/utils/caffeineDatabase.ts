export interface DrinkPreset {
  name: string;
  keywords: string[];
  mg: number;
  icon: string;
  category: string;
  volumeMl: number;
  servingLabel: string;
  note?: string;
}

export const DRINK_DATABASE: DrinkPreset[] = [
  // Cà phê Việt Nam
  { name: 'Cà phê sữa đá', keywords: ['sữa đá', 'nâu đá', 'cà phê sữa', 'cafe sữa', 'cf sữa', 'sữa nong', 'sua da'], mg: 110, icon: '☕', category: 'Cà phê', volumeMl: 180, servingLabel: 'Phin nhỏ 180ml', note: 'Phin truyền thống + sữa đặc (~110mg • ~1.1 ly)' },
  { name: 'Cà phê đen đá', keywords: ['đen đá', 'cà phê đen', 'cafe đen', 'cf đen', 'den da', 'đen nóng'], mg: 130, icon: '☕', category: 'Cà phê', volumeMl: 150, servingLabel: 'Phin đậm 150ml', note: 'Phin nguyên chất đậm vị (~130mg • ~1.3 ly)' },
  { name: 'Cà phê muối', keywords: ['muối', 'cà phê muối', 'cafe muối', 'cf muối', 'muoi'], mg: 95, icon: '☕', category: 'Cà phê', volumeMl: 180, servingLabel: 'Ly vừa 180ml', note: 'Cà phê phin kem muối béo nhẹ (~95mg • ~1.0 ly)' },
  { name: 'Bạc xỉu', keywords: ['bạc xỉu', 'bac xiu', 'bạc sỉu'], mg: 60, icon: '🥛', category: 'Cà phê', volumeMl: 200, servingLabel: 'Ly 200ml', note: 'Nhiều sữa ít cà phê (~60mg • ~0.6 ly)' },
  { name: 'Cà phê cốt dừa', keywords: ['cốt dừa', 'cot dua', 'dừa'], mg: 85, icon: '🥥', category: 'Cà phê', volumeMl: 250, servingLabel: 'Ly 250ml', note: 'Cà phê đá xay nước cốt dừa (~85mg • ~0.9 ly)' },
  { name: 'Cà phê trứng', keywords: ['trứng', 'egg coffee', 'trung'], mg: 110, icon: '☕', category: 'Cà phê', volumeMl: 180, servingLabel: 'Ly 180ml', note: 'Cà phê phin kèm kem trứng đánh bông (~110mg • ~1.1 ly)' },
  { name: 'Cold Brew (Ủ lạnh)', keywords: ['cold brew', 'ủ lạnh', 'u lanh'], mg: 140, icon: '🧊', category: 'Cà phê', volumeMl: 250, servingLabel: 'Ly 250ml', note: 'Ủ lạnh thời gian dài, nồng độ cao (~140mg • ~1.4 ly)' },
  
  // Cà phê Ý / Hiện đại
  { name: 'Espresso (1 shot)', keywords: ['espresso'], mg: 65, icon: '☕', category: 'Cà phê', volumeMl: 30, servingLabel: 'Shot 30ml', note: '1 shot máy tiêu chuẩn (~65mg • ~0.7 ly)' },
  { name: 'Double Espresso (2 shot)', keywords: ['double espresso', 'doppio'], mg: 130, icon: '☕', category: 'Cà phê', volumeMl: 60, servingLabel: 'Shot đôi 60ml', note: '2 shot đậm vị (~130mg • ~1.3 ly)' },
  { name: 'Americano', keywords: ['americano', 'long black'], mg: 120, icon: '☕', category: 'Cà phê', volumeMl: 350, servingLabel: 'Ly vừa 350ml', note: 'Espresso pha loãng nước ấm/đá (~120mg • ~1.2 ly)' },
  { name: 'Latte / Cappuccino', keywords: ['latte', 'cappuccino', 'flat white', 'capu'], mg: 80, icon: '☕', category: 'Cà phê', volumeMl: 350, servingLabel: 'Ly vừa 350ml', note: 'Espresso kết hợp sữa tươi đánh bọt (~80mg • ~0.8 ly)' },
  { name: 'Mocha', keywords: ['mocha'], mg: 90, icon: '☕', category: 'Cà phê', volumeMl: 350, servingLabel: 'Ly vừa 350ml', note: 'Espresso kết hợp socola & sữa (~90mg • ~0.9 ly)' },
  { name: 'Caramel Macchiato', keywords: ['macchiato', 'caramel'], mg: 85, icon: '☕', category: 'Cà phê', volumeMl: 350, servingLabel: 'Ly vừa 350ml', note: 'Espresso sốt caramel béo thơm (~85mg • ~0.9 ly)' },
  { name: 'Freeze / Cà phê đá xay', keywords: ['freeze', 'đá xay', 'frappuccino', 'highland freeze'], mg: 75, icon: '🍧', category: 'Cà phê', volumeMl: 400, servingLabel: 'Ly lớn 400ml', note: 'Cà phê đá xay whipping cream (~75mg • ~0.8 ly)' },
  { name: 'Cà phê Decaf (tách caffeine)', keywords: ['decaf', 'khử caffeine', 'tách caffeine'], mg: 5, icon: '☕', category: 'Cà phê', volumeMl: 250, servingLabel: 'Ly 250ml', note: 'Đã loại bỏ 97% lượng caffeine (~5mg • ~0.1 ly)' },

  // Trà & Trà sữa
  { name: 'Trà sữa trân châu', keywords: ['trà sữa', 'tra sua', 'boba', 'milk tea'], mg: 65, icon: '🧋', category: 'Trà', volumeMl: 500, servingLabel: 'Ly lớn 500ml', note: 'Trà đen/ô long đậm ủ sữa tươi (~65mg • ~0.7 ly)' },
  { name: 'Trà đào cam sả', keywords: ['trà đào', 'đào cam sả', 'tra dao', 'đào'], mg: 50, icon: '🍑', category: 'Trà', volumeMl: 500, servingLabel: 'Ly lớn 500ml', note: 'Trà đen thanh mát kèm đào (~50mg • ~0.5 ly)' },
  { name: 'Trà sen vàng', keywords: ['sen vàng', 'trà sen', 'tra sen', 'sen vang'], mg: 60, icon: '🪷', category: 'Trà', volumeMl: 500, servingLabel: 'Ly lớn 500ml', note: 'Trà ô long thanh dịu kem củ sen (~60mg • ~0.6 ly)' },
  { name: 'Trà ô long / Trà xanh', keywords: ['ô long', 'o long', 'trà xanh', 'green tea', 'tra xanh'], mg: 45, icon: '🍵', category: 'Trà', volumeMl: 350, servingLabel: 'Tách 350ml', note: 'Lá trà tự nhiên thanh nhẹ (~45mg • ~0.5 ly)' },
  { name: 'Trà lài / Trà nhài', keywords: ['lài', 'nhài', 'jasmine', 'lai'], mg: 40, icon: '🌸', category: 'Trà', volumeMl: 350, servingLabel: 'Tách 350ml', note: 'Trà ướp hoa nhài êm dịu (~40mg • ~0.4 ly)' },
  { name: 'Trà vải / Trà mận / Trà dâu', keywords: ['trà vải', 'trà mận', 'trà dâu', 'trà trái cây', 'trà hoa quả', 'tra vai', 'tra man'], mg: 45, icon: '🍓', category: 'Trà', volumeMl: 500, servingLabel: 'Ly lớn 500ml', note: 'Trà ủ hương vị trái cây (~45mg • ~0.5 ly)' },
  { name: 'Trà chanh / Trà tắc', keywords: ['trà chanh', 'trà tắc', 'tra chanh', 'tra tac', 'trà quất'], mg: 35, icon: '🍋', category: 'Trà', volumeMl: 400, servingLabel: 'Ly 400ml', note: 'Trà pha chua nhẹ thanh nhiệt (~35mg • ~0.4 ly)' },
  { name: 'Matcha Latte / Matcha đá xay', keywords: ['matcha', 'mạt trà'], mg: 70, icon: '🍵', category: 'Trà', volumeMl: 350, servingLabel: 'Ly vừa 350ml', note: 'Bột trà xanh Nhật Bản nguyên chất (~70mg • ~0.7 ly)' },
  { name: 'Hojicha', keywords: ['hojicha', 'trà rang'], mg: 25, icon: '🍂', category: 'Trà', volumeMl: 350, servingLabel: 'Tách 350ml', note: 'Trà xanh rang nhiệt hạ caffeine (~25mg • ~0.3 ly)' },

  // Nước tăng lực & Nước ngọt
  { name: 'Bò Húc / Red Bull', keywords: ['bò húc', 'red bull', 'redbull', 'bo huc'], mg: 80, icon: '⚡', category: 'Tăng lực', volumeMl: 250, servingLabel: 'Lon 250ml', note: 'Lon tiêu chuẩn 250ml (~80mg • ~0.8 ly)' },
  { name: 'Monster Energy', keywords: ['monster'], mg: 150, icon: '⚡', category: 'Tăng lực', volumeMl: 473, servingLabel: 'Lon lớn 473ml', note: 'Lon lớn 473ml hàm lượng cao (~150mg • ~1.5 ly)' },
  { name: 'Sting dâu / Sting vàng', keywords: ['sting'], mg: 65, icon: '⚡', category: 'Tăng lực', volumeMl: 330, servingLabel: 'Chai 330ml', note: 'Chai 330ml giải khát (~65mg • ~0.7 ly)' },
  { name: 'Warrior / Compact / Number 1', keywords: ['warrior', 'compact', 'number 1', 'number one', 'number1'], mg: 75, icon: '⚡', category: 'Tăng lực', volumeMl: 330, servingLabel: 'Chai 330ml', note: 'Nước tăng lực năng lượng (~75mg • ~0.8 ly)' },
  { name: 'Coca-Cola / Pepsi', keywords: ['coca', 'pepsi', 'coke', 'cola'], mg: 35, icon: '🥤', category: 'Nước ngọt', volumeMl: 330, servingLabel: 'Lon 330ml', note: 'Lon 330ml nước ngọt có gas (~35mg • ~0.4 ly)' },

  // Thức uống khác & Không chứa caffeine
  { name: 'Cacao / Sô cô la nóng', keywords: ['cacao', 'socola', 'chocolate', 'milo'], mg: 20, icon: '🍫', category: 'Khác', volumeMl: 250, servingLabel: 'Ly 250ml', note: 'Chứa lượng nhỏ theobromine (~20mg • ~0.2 ly)' },
  { name: 'Trà hoa cúc / Bạc hà (Thảo mộc)', keywords: ['hoa cúc', 'bạc hà', 'thảo mộc', 'camomile', 'chamomile', 'peppermint', 'atiso'], mg: 0, icon: '🌼', category: 'Thảo mộc', volumeMl: 350, servingLabel: 'Tách 350ml', note: '100% thảo mộc tự nhiên (0mg caffeine)' },
  { name: 'Nước cam / Chanh tươi / Nước dừa', keywords: ['nước cam', 'chanh tươi', 'sinh tố', 'nước ép', 'nước dừa', 'nuoc cam', 'nuoc dua'], mg: 0, icon: '🍊', category: 'Trái cây', volumeMl: 300, servingLabel: 'Ly 300ml', note: 'Nước ép hoa quả tươi (0mg caffeine)' },
];

export interface EstimationResult {
  mg: number;
  reason: string;
  icon: string;
  category: string;
  volumeMl: number;
  servingLabel: string;
}

// 1 Ly cà phê tiêu chuẩn tương đương 100mg caffeine (chuẩn dễ tính, dễ hiểu)
export const STANDARD_CUP_MG = 100;

export const mgToStandardCups = (mg: number): number => {
  if (mg <= 0) return 0;
  return Number((mg / STANDARD_CUP_MG).toFixed(1));
};

export interface CaffeineLoadLevel {
  level: 1 | 2 | 3 | 4;
  title: string;
  shortLabel: string;
  cupRange: string;
  feeling: string;
  recommendation: string;
  colorHex: string;
  textColor: string;
  bgLight: string;
  borderColor: string;
  liquidGradient: string;
}

export const getCaffeineLoadLevel = (consumedMg: number, dailyLimitMg: number = 400): CaffeineLoadLevel => {
  const cups = consumedMg / STANDARD_CUP_MG;

  if (cups < 1.0) {
    return {
      level: 1,
      title: 'Khởi động & Thư thái',
      shortLabel: 'Êm dịu',
      cupRange: '0 – 1.0 Ly (<100mg)',
      feeling: 'Tỉnh táo nhẹ, sảng khoái, nhịp tim và huyết áp hoàn toàn bình thường.',
      recommendation: 'Trạng thái rất an toàn. Có thể nạp thêm 1 ly nếu cần tăng thêm năng lượng.',
      colorHex: '#10B981',
      textColor: 'text-emerald-500',
      bgLight: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      liquidGradient: 'from-emerald-500 via-teal-400 to-emerald-400',
    };
  }

  if (cups <= 2.5) {
    return {
      level: 2,
      title: 'Vùng tập trung đỉnh cao (Sweet Spot)',
      shortLabel: 'Tối ưu',
      cupRange: '1.0 – 2.5 Ly (100–250mg)',
      feeling: 'Độ tập trung cao nhất trong ngày! Tinh thần sắc bén, phản xạ nhanh, không run tay.',
      recommendation: 'Khung năng lượng lý tưởng cho công việc đòi hỏi tư duy hoặc học tập chuyên sâu.',
      colorHex: '#F59E0B',
      textColor: 'text-amber-500',
      bgLight: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      liquidGradient: 'from-amber-500 via-yellow-400 to-amber-400',
    };
  }

  if (cups <= (dailyLimitMg / STANDARD_CUP_MG) - 0.2) {
    return {
      level: 3,
      title: 'Chạm ngưỡng cảnh giác',
      shortLabel: 'Cảnh giác',
      cupRange: `2.5 – ${(dailyLimitMg / STANDARD_CUP_MG).toFixed(1)} Ly`,
      feeling: 'Cơ thể bắt đầu nhạy cảm, tim đập nhanh hơn nhẹ, có thể hơi bồn chồn nếu uống vội.',
      recommendation: 'Nên dừng nạp thêm. Hãy chuyển sang uống nước ấm hoặc trà hoa cúc để giữ nước.',
      colorHex: '#F97316',
      textColor: 'text-orange-500',
      bgLight: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      liquidGradient: 'from-orange-500 via-amber-500 to-orange-400',
    };
  }

  return {
    level: 4,
    title: 'Quá tải (Caffeine Overload)',
    shortLabel: 'Đầy bình / Quá tải',
    cupRange: `>${(dailyLimitMg / STANDARD_CUP_MG).toFixed(1)} Ly (>${dailyLimitMg}mg)`,
    feeling: 'Dễ say cà phê, cồn cào ruột, lo âu nhẹ và chắc chắn phá vỡ pha ngủ sâu (Deep Sleep) ban đêm.',
    recommendation: 'ĐÃ ĐẦY BÌNH! Ngừng hoàn toàn đồ uống kích thích. Uống 300–500ml nước lọc ngay để hỗ trợ đào thải.',
    colorHex: '#EF4444',
    textColor: 'text-rose-500',
    bgLight: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    liquidGradient: 'from-rose-600 via-red-500 to-rose-500',
  };
};

export const estimateCaffeineFromName = (inputName: string): EstimationResult => {
  const norm = inputName.trim().toLowerCase();
  if (!norm) {
    return {
      mg: 80,
      reason: 'Tự động tính mức tiêu chuẩn (~80mg • ~0.8 ly)',
      icon: '☕',
      category: 'Cà phê',
      volumeMl: 250,
      servingLabel: 'Ly vừa 250ml',
    };
  }

  // 1. Khớp từ khóa cụ thể trong danh bạ
  for (const preset of DRINK_DATABASE) {
    if (norm === preset.name.toLowerCase()) {
      return {
        mg: preset.mg,
        reason: preset.note || `${preset.name} (~${preset.mg}mg)`,
        icon: preset.icon,
        category: preset.category,
        volumeMl: preset.volumeMl,
        servingLabel: preset.servingLabel,
      };
    }
  }

  for (const preset of DRINK_DATABASE) {
    for (const kw of preset.keywords) {
      if (norm.includes(kw)) {
        return {
          mg: preset.mg,
          reason: preset.note || `${preset.name} (~${preset.mg}mg)`,
          icon: preset.icon,
          category: preset.category,
          volumeMl: preset.volumeMl,
          servingLabel: preset.servingLabel,
        };
      }
    }
  }

  // 2. Phân loại dự phòng thông minh theo từ khóa
  if (norm.includes('đen') || norm.includes('phin') || norm.includes('espresso') || norm.includes('cold brew')) {
    return { mg: 120, reason: 'Cà phê nguyên chất / phin đậm vị (~120mg • ~1.2 ly)', icon: '☕', category: 'Cà phê', volumeMl: 180, servingLabel: 'Phin 180ml' };
  }
  if (norm.includes('muối') || norm.includes('sữa') || norm.includes('latte') || norm.includes('capu') || norm.includes('bạc xỉu') || norm.includes('dừa')) {
    return { mg: 85, reason: 'Cà phê pha sữa hoặc kem béo (~85mg • ~0.9 ly)', icon: '☕', category: 'Cà phê', volumeMl: 250, servingLabel: 'Ly vừa 250ml' };
  }
  if (norm.includes('matcha')) {
    return { mg: 70, reason: 'Bột trà xanh matcha tự nhiên (~70mg • ~0.7 ly)', icon: '🍵', category: 'Trà', volumeMl: 350, servingLabel: 'Ly vừa 350ml' };
  }
  if (norm.includes('tăng lực') || norm.includes('energy') || norm.includes('bò') || norm.includes('sting') || norm.includes('red bull')) {
    return { mg: 80, reason: 'Nước tăng lực năng lượng (~80mg • ~0.8 ly)', icon: '⚡', category: 'Tăng lực', volumeMl: 250, servingLabel: 'Lon 250ml' };
  }
  if (norm.includes('trà sữa') || norm.includes('boba') || norm.includes('milk tea')) {
    return { mg: 65, reason: 'Trà sữa đóng ly (~65mg • ~0.7 ly)', icon: '🧋', category: 'Trà', volumeMl: 500, servingLabel: 'Ly lớn 500ml' };
  }
  if (norm.includes('trà') || norm.includes('tea')) {
    return { mg: 45, reason: 'Trà lá / trà trái cây (~45mg • ~0.5 ly)', icon: '🧋', category: 'Trà', volumeMl: 350, servingLabel: 'Ly vừa 350ml' };
  }
  if (norm.includes('coca') || norm.includes('pepsi') || norm.includes('cola') || norm.includes('soda')) {
    return { mg: 35, reason: 'Nước ngọt có gas (~35mg • ~0.4 ly)', icon: '🥤', category: 'Nước ngọt', volumeMl: 330, servingLabel: 'Lon 330ml' };
  }
  if (norm.includes('cacao') || norm.includes('socola') || norm.includes('chocolate') || norm.includes('milo')) {
    return { mg: 20, reason: 'Cacao / socola (~20mg • ~0.2 ly)', icon: '🍫', category: 'Khác', volumeMl: 250, servingLabel: 'Ly 250ml' };
  }
  if (norm.includes('thảo mộc') || norm.includes('hoa cúc') || norm.includes('bạc hà') || norm.includes('nước ép') || norm.includes('sinh tố') || norm.includes('cam') || norm.includes('chanh') || norm.includes('dừa')) {
    return { mg: 0, reason: 'Thảo mộc / hoa quả tự nhiên (0mg caffeine)', icon: '🌱', category: 'Thảo mộc', volumeMl: 300, servingLabel: 'Ly 300ml' };
  }
  if (norm.includes('decaf')) {
    return { mg: 5, reason: 'Cà phê khử caffeine decaf (~5mg • ~0.1 ly)', icon: '☕', category: 'Cà phê', volumeMl: 250, servingLabel: 'Ly vừa 250ml' };
  }
  if (norm.includes('cà phê') || norm.includes('cafe') || norm.includes('coffee') || norm.includes('cf')) {
    return { mg: 100, reason: 'Cà phê tiêu chuẩn (~100mg • ~1.0 ly)', icon: '☕', category: 'Cà phê', volumeMl: 250, servingLabel: 'Ly vừa 250ml' };
  }

  return { mg: 65, reason: 'Ước tính trung bình (~65mg • ~0.7 ly)', icon: '☕', category: 'Khác', volumeMl: 250, servingLabel: 'Ly vừa 250ml' };
};
