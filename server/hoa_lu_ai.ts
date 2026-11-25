import { db } from './db.ts';
import {
  expandAbbreviations,
  extractSignificantTokens,
  levenshteinDistance,
  normalizeVietnamese,
  retrieveRelevantContext,
  type RetrievedChunk,
} from './rag.ts';

export interface HistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponsePayload {
  answer: string;
  citations: string[];
  followUpSuggestions: string[];
}

interface AiConfigRow {
  model: string;
  system_instruction: string;
  thinking_level: string;
  max_context_chunks: number;
  log_conversations: number;
}

type IntentId =
  | 'greeting'
  | 'help'
  | 'distinction'
  | 'location'
  | 'transport'
  | 'architecture'
  | 'specific_landmark'
  | 'experiences'
  | 'show_co_lau'
  | 'culinary'
  | 'crafts'
  | 'timing'
  | 'pricing'
  | 'itinerary'
  | 'nearby'
  | 'history'
  | 'sources';

const INTENT_RULES: Array<{ id: IntentId; phrases: string[]; weight?: number }> = [
  {
    id: 'greeting',
    phrases: ['xin chao', 'chao ban', 'chao ai', 'hello', 'hi ', 'alo', 'chao buoi'],
    weight: 1.5,
  },
  {
    id: 'help',
    phrases: ['ban lam duoc gi', 'ho tro gi', 'giup gi', 'hoi gi duoc', 'gioi thieu ban than'],
    weight: 1.5,
  },
  {
    id: 'distinction',
    phrases: [
      'phan biet',
      'khac gi',
      'khac nhau',
      'co phai co do',
      'co phai pho co that',
      'the ky x',
      'co tu xua',
      'nguyen ban',
      'co do hoa lu va pho co',
    ],
    weight: 2.2,
  },
  {
    id: 'show_co_lau',
    phrases: [
      'anh hung co lau',
      'thuc canh',
      'chuong trinh nghe thuat',
      'dinh bo linh',
      'co lau tap tran',
      'suat dien',
      'lich dien',
      'xem show',
      'show dien',
    ],
    weight: 2.0,
  },
  {
    id: 'itinerary',
    phrases: [
      'lich trinh',
      'ke hoach',
      'di choi nhu the nao',
      'goi y di',
      'mot buoi',
      'chieu toi',
      'sap xep thoi gian',
    ],
    weight: 1.9,
  },
  {
    id: 'pricing',
    phrases: [
      'gia ve',
      'chi phi',
      'bao nhieu tien',
      'mat ve',
      've vao cong',
      'mien phi',
      'ton bao nhieu',
      'bang gia',
      'phi dich vu',
      've xem',
    ],
    weight: 1.9,
  },
  {
    id: 'timing',
    phrases: [
      'gio mo cua',
      'may gio',
      'thoi gian tham quan',
      'khung gio',
      'nen di luc nao',
      'khi nao dep',
      'buoi sang',
      'buoi chieu',
      'buoi toi',
      'len den',
      'dong cua',
    ],
    weight: 1.8,
  },
  {
    id: 'culinary',
    phrases: [
      'am thuc',
      'an gi',
      'dac san',
      'com chay',
      'de nui',
      'thit de',
      'banh khoai tep',
      'banh da',
      'banh mat',
      'an uong',
      'ca phe',
      'mon ngon',
      'quan an',
    ],
    weight: 1.9,
  },
  {
    id: 'crafts',
    phrases: [
      'lang nghe',
      'thu cong',
      'ninh van',
      'bo bat',
      'van lam',
      'y yen',
      'dong ho',
      'gom',
      'da my nghe',
      'theu ren',
      'qua luu niem',
      'mua qua',
    ],
    weight: 1.9,
  },
  {
    id: 'experiences',
    phrases: [
      'hoat dong',
      'trai nghiem',
      'co gi choi',
      'choi gi',
      'co phuc',
      'thue trang phuc',
      'cheo thuyen',
      'hoa dang',
      'tro choi dan gian',
      'chup anh',
    ],
    weight: 1.8,
  },
  {
    id: 'architecture',
    phrases: [
      'kien truc',
      'cong trinh',
      'co gi dep',
      'diem nhan',
      'canh quan',
      'day nha go',
      'mai ngoi',
      'den long',
      'thuy dinh',
      'thap tu an',
      'ho ky lan',
      'nui ky lan',
    ],
    weight: 1.7,
  },
  {
    id: 'transport',
    phrases: [
      'phuong tien',
      'di bang gi',
      'xe may',
      'o to',
      'taxi',
      'xe dap',
      'gui xe',
      'bai xe',
      'di chuyen',
    ],
    weight: 1.7,
  },
  {
    id: 'location',
    phrases: [
      'vi tri',
      'o dau',
      'dia chi',
      'nam o dau',
      'duong nao',
      'trung tam ninh binh',
      'cach di',
    ],
    weight: 1.7,
  },
  {
    id: 'nearby',
    phrases: [
      'ket hop',
      'gan day',
      'xung quanh',
      'trang an',
      'hang mua',
      'tam coc',
      'bich dong',
      'ga ninh binh',
      'khoang cach',
      'cach bao xa',
    ],
    weight: 1.8,
  },
  {
    id: 'history',
    phrases: [
      'lich su',
      'hinh thanh',
      'y tuong',
      'xay dung nam nao',
      'mo cua nam nao',
      '2022',
      'chu dau tu',
    ],
    weight: 1.6,
  },
  {
    id: 'sources',
    phrases: ['nguon', 'kiem chung', 'xac thuc', 'trang chinh thuc', 'so du lich'],
    weight: 1.8,
  },
];

function phraseFuzzyMatch(expandedText: string, phrase: string): boolean {
  if (expandedText.includes(phrase)) return true;

  const phraseWords = phrase.split(' ').filter((w) => w.length >= 2);
  const textWords = expandedText.split(/[^a-z0-9]+/).filter((w) => w.length >= 2);

  if (phraseWords.length === 0) return false;

  let matchedWords = 0;
  for (const pw of phraseWords) {
    if (textWords.includes(pw)) {
      matchedWords++;
    } else if (pw.length >= 5) {
      const hasClose = textWords.some(
        (tw) => Math.abs(tw.length - pw.length) <= 1 && levenshteinDistance(pw, tw) <= 1
      );
      if (hasClose) matchedWords++;
    }
  }
  return matchedWords === phraseWords.length;
}

function detectIntents(expandedQuery: string): Array<{ id: IntentId; score: number }> {
  const results: Array<{ id: IntentId; score: number }> = [];

  for (const rule of INTENT_RULES) {
    let hits = 0;
    for (const p of rule.phrases) {
      if (phraseFuzzyMatch(expandedQuery, p)) {
        hits += 1;
      }
    }
    if (hits > 0) {
      results.push({ id: rule.id, score: hits * (rule.weight || 1) });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function isFollowUpMessage(expandedQuery: string): boolean {
  const shortFollowUpMarkers = [
    'o do',
    'cho do',
    'noi nay',
    'o day',
    'con ',
    'the con',
    'vay ',
    'gia thi sao',
    'may gio',
    'chi tiet hon',
    'ro hon',
    'vi du',
    'di xe may',
    'di o to',
    'nguoi',
    'cuoi tuan',
    'buoi toi',
  ];
  if (expandedQuery.length <= 45) {
    return shortFollowUpMarkers.some((m) => expandedQuery.includes(m));
  }
  return false;
}

function buildContextAwareQuery(message: string, history: HistoryTurn[]): {
  effectiveQuery: string;
  inheritedTopic: string | null;
  transportHint: string | null;
  peopleHint: string | null;
} {
  const expanded = expandAbbreviations(message);
  const recentUsers = history.filter((h) => h.role === 'user').slice(-3);
  const lastUser = recentUsers[recentUsers.length - 1]?.content || '';

  // Detect user constraints across conversation
  const allUserText = expandAbbreviations([...recentUsers.map((u) => u.content), message].join(' '));
  let transportHint: string | null = null;
  if (allUserText.includes('xe may')) transportHint = 'xe máy';
  else if (allUserText.includes('o to')) transportHint = 'ô tô';
  else if (allUserText.includes('taxi')) transportHint = 'taxi';
  else if (allUserText.includes('xe dap')) transportHint = 'xe đạp';

  const peopleMatch = allUserText.match(/(\d+)\s*(nguoi|khach|ban)/);
  const peopleHint = peopleMatch ? `${peopleMatch[1]} người` : null;

  if (lastUser && isFollowUpMessage(expanded)) {
    return {
      effectiveQuery: `${lastUser} ${message}`,
      inheritedTopic: lastUser,
      transportHint,
      peopleHint,
    };
  }

  return {
    effectiveQuery: message,
    inheritedTopic: null,
    transportHint,
    peopleHint,
  };
}

function hasOutOfScopeTopic(expandedQuery: string): boolean {
  const alwaysUnverifiedPhrases = [
    'so dien thoai',
    'hotline',
    'sdt',
    'thoi tiet',
    'du bao thoi tiet',
    'nhiet do',
    'gia vang',
    'chung khoan',
    'bong da',
    'xo so',
    'viet code',
    'lap trinh',
  ];

  if (alwaysUnverifiedPhrases.some((p) => expandedQuery.includes(p))) {
    return true;
  }

  const mentionsHoaLu =
    expandedQuery.includes('hoa lu') ||
    expandedQuery.includes('pho co') ||
    expandedQuery.includes('ninh binh') ||
    expandedQuery.includes('ky lan') ||
    expandedQuery.includes('trang an') ||
    expandedQuery.includes('hang mua') ||
    expandedQuery.includes('tam coc') ||
    expandedQuery.includes('co lau');

  if (mentionsHoaLu) return false;

  const otherCities = ['ha noi', 'sai gon', 'tp hcm', 'da nang', 'phu quoc', 'sapa'];
  return otherCities.some((p) => expandedQuery.includes(p));
}

function synthesizeFromRetrievedChunks(
  query: string,
  chunks: RetrievedChunk[],
  matchedFaqs: Array<{ question: string; answer: string; score: number }>
): { answer: string; citations: string[] } | null {
  const expanded = expandAbbreviations(query);
  if (hasOutOfScopeTopic(expanded)) {
    return null;
  }

  // Check if a newly uploaded/supplementary document is highly relevant
  const nonPrimaryHit = chunks.find((c) => c.isPrimary === 0 && c.score >= 0.45);
  if (nonPrimaryHit) {
    const relevant = chunks.filter((c) => c.score >= 0.35).slice(0, 3);
    const body = relevant
      .map((c) => {
        const cleanBody = c.content.replace(/^\[[^\]]+\]\n/, '').trim();
        return `**${c.sectionTitle}**\n${cleanBody}`;
      })
      .join('\n\n');
    return {
      answer: `Dựa trên tài liệu tri thức đã được cập nhật trong hệ thống, tôi tìm thấy các thông tin liên quan sau:\n\n${body}`,
      citations: relevant.map((c) => c.sectionTitle),
    };
  }

  if (matchedFaqs.length > 0 && matchedFaqs[0].score >= 0.65) {
    return {
      answer: matchedFaqs[0].answer,
      citations: ['Câu hỏi thường gặp Phố cổ Hoa Lư'],
    };
  }

  const tokens = extractSignificantTokens(expanded).filter((t) => t.length >= 3);
  const bestChunks = chunks
    .filter((c) => {
      if (c.score < 0.62) return false;
      const chunkWordSet = new Set(
        normalizeVietnamese(c.content)
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 3)
      );
      const exactHits = tokens.filter((t) => chunkWordSet.has(t)).length;
      return exactHits >= Math.min(2, Math.max(1, tokens.length));
    })
    .slice(0, 2);

  if (bestChunks.length > 0) {
    const blocks = bestChunks.map((c) => {
      const rawBody = c.content.replace(/^\[[^\]]+\]\n/, '').trim();
      const lines = rawBody.split('\n').filter((l) => l.trim().length > 0);
      const prioritized = lines.filter((l) => {
        const norm = normalizeVietnamese(l);
        return tokens.some((t) => norm.includes(t));
      });
      const snippet = (prioritized.length >= 2 ? prioritized : lines).slice(0, 6).join('\n');
      return `**${c.sectionTitle}**\n${snippet}`;
    });

    return {
      answer: `Theo cơ sở tri thức Phố cổ Hoa Lư, thông tin liên quan gồm:\n\n${blocks.join('\n\n')}`,
      citations: bestChunks.map((c) => c.sectionTitle),
    };
  }

  return null;
}

function buildIntentResponse(
  intents: Array<{ id: IntentId; score: number }>,
  expandedQuery: string,
  opts: { transportHint: string | null; peopleHint: string | null }
): { answer: string; citations: string[]; suggestions: string[] } | null {
  if (intents.length === 0) return null;
  const primary = intents[0].id;
  const secondary = intents[1]?.id;

  if (primary === 'greeting' && intents.length === 1) {
    return {
      answer:
        'Xin chào quý khách! Tôi là **HOA LƯ AI – TRỢ LÝ DU LỊCH** hoạt động độc lập trên cơ sở tri thức chính thức về **Phố cổ Hoa Lư, Ninh Bình**.\n\nTôi có thể hỗ trợ quý khách tra cứu nhanh về:\n- **Kiến trúc & công trình** (Hồ Kỳ Lân, Tháp Tứ Ân, dãy nhà gỗ, Thủy đình)\n- **Hoạt động trải nghiệm** & chương trình *Anh hùng Cờ Lau*\n- **Ẩm thực đặc sản** Ninh Bình & các **làng nghề thủ công**\n- **Gợi ý khung giờ, lịch trình buổi chiều – tối** và các điểm kết hợp lân cận',
      citations: ['1. Khái quát Phố cổ Hoa Lư'],
      suggestions: [
        'Phố cổ Hoa Lư khác gì với Cố đô Hoa Lư?',
        'Khung giờ gợi ý tham quan đẹp nhất là khi nào?',
        'Gợi ý lịch trình buổi chiều tối tại Phố cổ Hoa Lư',
      ],
    };
  }

  if (primary === 'help') {
    return {
      answer:
        'Tôi là trợ lý du lịch chuyên biệt cho **Phố cổ Hoa Lư**, trả lời trực tiếp từ tài liệu tri thức đã được kiểm chứng và không tự suy diễn giá vé hay giờ biểu diễn chưa xác nhận.\n\nQuý khách có thể hỏi tự nhiên bằng tiếng Việt (kể cả viết tắt như *PCHL*, *AHCL*, *CĐHL*) về bất kỳ chủ đề nào như: vị trí, kiến trúc, ẩm thực, cổ phục, chèo thuyền, thả hoa đăng, lịch trình hoặc cách kết hợp Tràng An – Hang Múa.',
      citations: ['Mục đích & Nguyên tắc Cơ sở tri thức'],
      suggestions: [
        'Ở Phố cổ Hoa Lư có những kiến trúc gì nổi bật?',
        'Đến đây nên ăn những đặc sản nào?',
        'Tham quan có mất vé vào cổng không?',
      ],
    };
  }

  if (primary === 'distinction') {
    return {
      answer:
        'Cần phân biệt rõ **Phố cổ Hoa Lư** và **Khu di tích lịch sử Cố đô Hoa Lư** vì đây là hai địa điểm khác nhau:\n\n| Tiêu chí | Phố cổ Hoa Lư | Khu di tích Cố đô Hoa Lư |\n|---|---|---|\n| **Bản chất** | Tổ hợp du lịch, tham quan, ẩm thực và trải nghiệm văn hóa **được xây dựng mới** | Quần thể **di tích lịch sử** gắn với kinh đô xưa của nhà nước Đại Cồ Việt |\n| **Vị trí** | Khu vực **hồ Kỳ Lân**, dưới chân núi Kỳ Lân, trung tâm Ninh Bình | Khu vực **Trường Yên**, Ninh Bình |\n| **Thời điểm** | Giới thiệu triển khai từ cuối thập niên 2010, mở cửa đón khách đầu năm 2022 | Gắn với triều Đinh và Tiền Lê (thế kỷ X) |\n\n*Lưu ý:* Phố cổ Hoa Lư lấy cảm hứng từ văn hóa Đại Việt xưa, không phải khu phố cổ nguyên bản tồn tại liên tục từ thế kỷ X.',
      citations: ['1. Khái quát', '3. Lịch sử hình thành và ý tưởng', '14. Lưu ý phân biệt'],
      suggestions: [
        'Kiến trúc tại Phố cổ Hoa Lư có những công trình nào?',
        'Từ Phố cổ Hoa Lư có thể kết hợp đi những điểm nào?',
        'Khung giờ gợi ý tham quan Phố cổ Hoa Lư?',
      ],
    };
  }

  if (primary === 'show_co_lau') {
    return {
      answer:
        '**Chương trình thực cảnh Anh hùng Cờ Lau** là chương trình nghệ thuật khai thác câu chuyện lịch sử về **Đinh Bộ Lĩnh** – người dẹp loạn 12 sứ quân, thống nhất đất nước và lập nên nhà Đinh. Tên gọi gợi nhắc hình ảnh thuở nhỏ Đinh Bộ Lĩnh cùng bạn bè dùng cờ lau tập trận.\n\n**Các chủ đề lịch sử có thể được thể hiện:**\n- Tuổi thơ và giai thoại cờ lau tập trận.\n- Quá trình trưởng thành và tập hợp lực lượng.\n- Bối cảnh loạn 12 sứ quân.\n- Quá trình thống nhất đất nước.\n- Sự ra đời của nhà nước Đại Cồ Việt dưới triều Đinh.\n\n*Lưu ý xác thực:* Hiện chưa có lịch diễn, giờ diễn, sơ đồ chỗ ngồi, giá vé hay chính sách trẻ em cố định được xác nhận trong tài liệu vì thông tin này có thể thay đổi theo từng giai đoạn. Quý khách vui lòng kiểm tra trực tiếp trên **kênh chính thức của đơn vị tổ chức hoặc kênh bán vé chính thức** (nếu có).',
      citations: ['6. Chương trình thực cảnh Anh hùng Cờ Lau', '10. Chi phí'],
      suggestions: [
        'Ngoài xem show thì buổi tối còn hoạt động gì?',
        'Thủy đình và khu biểu diễn nằm ở đâu trong phố cổ?',
        'Gợi ý lịch trình buổi chiều tối có kết hợp xem biểu diễn',
      ],
    };
  }

  if (primary === 'pricing') {
    return {
      answer:
        'Hiện **chưa có bảng giá thống nhất được xác minh** cho toàn bộ dịch vụ tại Phố cổ Hoa Lư. Dưới đây là tổng hợp thông tin tham khảo theo tài liệu tri thức:\n\n| Hạng mục | Thông tin hiện có | Lưu ý xác thực |\n|---|---|---|\n| **Khu vực tham quan chung** | Từng được giới thiệu là miễn phí | Cần kiểm tra quy định hiện hành |\n| **Đi bộ & ngắm cảnh công cộng** | Thường không phát sinh phí riêng | Tùy quy định từng thời điểm |\n| **Ăn uống** | Tùy món, cửa hàng và khẩu phần | Xem thực đơn, hỏi rõ giá và kiểm tra hóa đơn |\n| **Thuê cổ phục** | Theo cửa hàng, loại trang phục và thời lượng | Hỏi rõ giá trước khi thuê |\n| **Chèo thuyền, thả hoa đăng** | Tính phí riêng nếu dịch vụ đang hoạt động | Tùy lịch vận hành và thời tiết |\n| **Trò chơi & hoạt động** | Tùy chương trình và đơn vị tổ chức | Xác nhận tại điểm tổ chức |\n| **Show Anh hùng Cờ Lau** | Cần xác nhận theo suất diễn và sơ đồ chỗ ngồi | Kiểm tra kênh bán vé chính thức |\n\n*Khuyến nghị:* Không sử dụng giá truyền miệng hoặc từ các bài viết cũ làm bảng giá chính thức.',
      citations: ['10. Chi phí', '8. Ẩm thực', '14. Những điều cần lưu ý'],
      suggestions: [
        'Khung giờ nào nên đi Phố cổ Hoa Lư?',
        'Ở đây có những món đặc sản nào đáng thử?',
        'Lưu ý gửi xe và phương tiện đến phố cổ?',
      ],
    };
  }

  if (primary === 'timing') {
    return {
      answer:
        'Khoảng **17:30 – 21:30** là khung giờ gợi ý để trải nghiệm không khí chiều tối sôi động khi phố cổ lên đèn. Tuy nhiên, đây **không phải giờ mở cửa chính thức được xác nhận** — quý khách nên kiểm tra giờ hoạt động thực tế trước khi đi.\n\n**Gợi ý trải nghiệm theo từng khung giờ trong ngày:**\n\n| Khung giờ | Trải nghiệm phù hợp |\n|---|---|\n| **Buổi sáng** | Đi dạo, quan sát kiến trúc và chụp ảnh khi không gian thoáng đãng |\n| **14:00 – 17:00** | Tham quan gian hàng, chụp ảnh và tìm hiểu sản phẩm thủ công |\n| **17:00 – 19:00** | Ngắm hoàng hôn, chụp ảnh lúc khu phố bắt đầu lên đèn |\n| **19:00 – 21:00** | Ăn uống, tham gia hoạt động và xem biểu diễn (nếu có lịch) |\n| **21:00 – 23:00** | Dạo phố, ngắm cảnh hồ Kỳ Lân và chụp ảnh ban đêm |',
      citations: ['9. Thời gian tham quan'],
      suggestions: [
        'Gợi ý lịch trình chi tiết một buổi chiều tối',
        'Tham quan khu vực chung có mất vé không?',
        'Buổi tối có chèo thuyền hay thả hoa đăng không?',
      ],
    };
  }

  if (primary === 'itinerary') {
    const customNotes: string[] = [];
    if (opts.transportHint) {
      customNotes.push(
        `- **Về phương tiện (${opts.transportHint}):** Khu vực gửi xe và phí gửi xe có thể thay đổi theo thời điểm; quý khách nhớ quan sát biển niêm yết, hỏi nhân viên và giữ vé gửi xe.`
      );
    }
    if (opts.peopleHint) {
      customNotes.push(
        `- **Nhóm ${opts.peopleHint}:** Khi ăn tối đặc sản địa phương, nên xem kỹ thực đơn và hỏi rõ giá theo suất hoặc đĩa để phù hợp khẩu phần cả nhóm.`
      );
    }

    const askMore =
      !opts.transportHint && !opts.peopleHint
        ? '\n\nNếu quý khách muốn điều chỉnh sát thực tế hơn, hãy cho tôi biết thêm **ngày dự kiến đi, số lượng người hoặc phương tiện di chuyển** nhé.'
        : '';

    return {
      answer:
        `Dưới đây là **lịch trình gợi ý một buổi chiều – tối tại Phố cổ Hoa Lư** (cần điều chỉnh theo giờ hoạt động và lịch diễn thực tế):\n\n| Khung giờ | Hoạt động gợi ý |\n|---|---|\n| **17:00 – 17:45** | Đến nơi, đi dạo và chụp ảnh các dãy nhà gỗ, mái ngói, lối phố |\n| **17:45 – 18:30** | Tham quan hồ Kỳ Lân, Tháp Tứ Ân và khu vực núi, chùa |\n| **18:30 – 19:30** | Ăn tối, thưởng thức đặc sản địa phương (cơm cháy, thịt dê núi, bánh khoái tép...) |\n| **19:30 – 20:30** | Tham gia hoạt động đang tổ chức như chèo thuyền, thả hoa đăng hoặc trò chơi |\n| **20:45 – 21:45** | Xem chương trình *Anh hùng Cờ Lau* nếu có suất diễn và đã mua vé |\n| **21:45 – 22:30** | Dạo phố ban đêm, tìm mua quà lưu niệm và kết thúc chuyến tham quan |${
          customNotes.length > 0 ? `\n\n**Lưu ý riêng cho hành trình của bạn:**\n${customNotes.join('\n')}` : ''
        }${askMore}`,
      citations: ['13. Lịch trình gợi ý một buổi chiều – tối', '11. Phương tiện', '14. Những điều cần lưu ý'],
      suggestions: [
        'Ở đây có những món đặc sản nào nên ăn tối?',
        'Có thể kết hợp đi Tràng An, Hang Múa trong ngày không?',
        'Thông tin vé show Anh hùng Cờ Lau như thế nào?',
      ],
    };
  }

  if (primary === 'culinary') {
    return {
      answer:
        'Tại Phố cổ Hoa Lư và khu vực trung tâm Ninh Bình, quý khách có thể tìm thưởng thức nhiều món đặc sản và đồ ăn đa dạng:\n\n- **Cơm cháy Ninh Bình:** Đặc sản nổi tiếng của địa phương.\n- **Thịt dê núi:** Các món đặc sản chế biến từ dê núi Ninh Bình.\n- **Bánh khoái tép, bánh đa, bánh mật:** Các món bánh và quà quê dân dã.\n- **Đồ ăn vặt, món nướng, đồ uống, trà và cà phê:** Phù hợp dạo phố buổi chiều tối.\n\n**Lưu ý khi ăn uống:** Giá bán và chất lượng phụ thuộc từng cửa hàng. Quý khách nên xem kỹ thực đơn, hỏi rõ giá theo suất hoặc đĩa, phí dịch vụ (nếu có) và kiểm tra hóa đơn trước khi thanh toán.',
      citations: ['8. Ẩm thực'],
      suggestions: [
        'Khung giờ ăn tối và dạo phố đẹp nhất là lúc nào?',
        'Có làng nghề hay quà lưu niệm gì ở phố cổ?',
        'Gợi ý lịch trình ăn tối kết hợp tham quan hồ Kỳ Lân',
      ],
    };
  }

  if (primary === 'crafts') {
    return {
      answer:
        'Không gian trưng bày hoặc bán hàng tại Phố cổ Hoa Lư có thể giới thiệu sản phẩm từ nhiều **làng nghề truyền thống**:\n\n| Làng nghề / Địa phương | Sản phẩm tiêu biểu |\n|---|---|\n| **Ninh Vân (Ninh Bình)** | Đá mỹ nghệ, sản phẩm chạm khắc đá |\n| **Bồ Bát (Ninh Bình)** | Gốm truyền thống |\n| **Văn Lâm (Ninh Bình)** | Thêu ren thủ công |\n| **Ý Yên (Nam Định cũ)** | Đúc đồng, sơn mài và sản phẩm mỹ nghệ |\n| **Đông Hồ (Bắc Ninh)** | Tranh dân gian |\n| **Các làng nghề mộc** | Đồ gỗ và sản phẩm thủ công |\n\n*Lưu ý:* Danh sách này không đồng nghĩa tất cả các làng nghề đều có gian hàng thường trực mọi thời điểm tại phố cổ.',
      citations: ['7. Làng nghề và sản phẩm thủ công'],
      suggestions: [
        'Ngoài mua quà thủ công, có trải nghiệm cổ phục không?',
        'Thời gian tham quan gian hàng thủ công phù hợp là khi nào?',
        'Ẩm thực ở Phố cổ Hoa Lư có những món gì?',
      ],
    };
  }

  if (primary === 'experiences') {
    return {
      answer:
        'Các hoạt động và trải nghiệm văn hóa có thể có tại Phố cổ Hoa Lư (tùy theo chương trình từng thời điểm):\n\n- **Đi bộ tham quan:** Dạo các dãy nhà gỗ, lối đi và cảnh quan quanh hồ Kỳ Lân.\n- **Chụp ảnh:** Với kiến trúc nhà gỗ, mái ngói, cầu, hồ nước và đèn lồng.\n- **Thuê cổ phục / trang phục truyền thống:** Tại các cửa hàng có cung cấp dịch vụ.\n- **Chèo thuyền:** Nếu dịch vụ đang hoạt động và thời tiết cho phép.\n- **Thả hoa đăng:** Nếu có tổ chức (lưu ý tuân thủ hướng dẫn an toàn và vệ sinh môi trường).\n- **Trò chơi dân gian & hoạt động gia đình:** Khi có chương trình tổ chức.\n- **Xem biểu diễn nghệ thuật / thực cảnh:** Nếu có lịch diễn.\n\n*Lưu ý quan trọng:* Không phải tất cả gian hàng, chèo thuyền hay thả hoa đăng đều diễn ra hằng ngày; dịch vụ thay đổi theo mùa, ngày trong tuần, thời tiết và kế hoạch tổ chức.',
      citations: ['5. Hoạt động và trải nghiệm', '14. Những điều cần lưu ý'],
      suggestions: [
        'Chương trình thực cảnh Anh hùng Cờ Lau kể về gì?',
        'Chi phí thuê cổ phục, chèo thuyền, hoa đăng thế nào?',
        'Buổi tối mấy giờ phố lên đèn đẹp nhất?',
      ],
    };
  }

  if (primary === 'architecture') {
    // Check if user asked specifically about one architectural element
    if (expandedQuery.includes('thap tu an')) {
      return {
        answer:
          '**Tháp Tứ Ân** là công trình nhiều tầng mái nằm tại khu vực hồ Kỳ Lân, đóng vai trò là điểm nhấn thị giác nổi bật của Phố cổ Hoa Lư. Vào buổi chiều tối khi hệ thống đèn lồng và ánh sáng quanh hồ bật sáng, khu vực Tháp Tứ Ân cùng mặt nước hồ Kỳ Lân là điểm ngắm cảnh và chụp ảnh được nhiều du khách yêu thích.\n\nXung quanh tháp còn có cầu và lối dạo ven hồ, núi Kỳ Lân với khu vực chùa cùng các dãy nhà gỗ mái ngói truyền thống.',
        citations: ['4. Kiến trúc và công trình nổi bật'],
        suggestions: [
          'Hồ Kỳ Lân và khu vực thủy đình có gì nổi bật?',
          'Khung giờ nào chụp ảnh Tháp Tứ Ân đẹp nhất?',
          'Phố cổ Hoa Lư được xây dựng từ khi nào?',
        ],
      };
    }

    return {
      answer:
        'Kiến trúc Phố cổ Hoa Lư kết hợp cảnh quan tự nhiên quanh hồ Kỳ Lân với các chi tiết truyền thống gợi nhắc không gian Đại Việt xưa:\n\n- **Hồ Kỳ Lân:** Không gian mặt nước trung tâm, điều hòa cảnh quan và là nơi dạo bộ, ngắm cảnh, chụp ảnh.\n- **Tháp Tứ Ân:** Công trình nhiều tầng mái, điểm nhấn thị giác nổi bật giữa khu vực hồ.\n- **Núi Kỳ Lân và khu vực chùa:** Cảnh quan núi đá và công trình tín ngưỡng tạo tổng thể văn hóa – tâm linh.\n- **Dãy nhà gỗ, mái ngói và đèn lồng:** Mang lại cảm giác không gian phố xưa dọc lối đi.\n- **Cầu và lối dạo ven hồ:** Vị trí tản bộ và chụp ảnh đẹp, đặc biệt vào buổi tối khi lên đèn.\n- **Thủy đình hoặc khu biểu diễn:** Không gian tổ chức chương trình nghệ thuật và biểu diễn theo lịch.',
      citations: ['4. Kiến trúc và công trình nổi bật'],
      suggestions: [
        'Phố cổ Hoa Lư có phải di tích từ thế kỷ X không?',
        'Hoạt động trải nghiệm tại đây có những gì?',
        'Vị trí Phố cổ Hoa Lư nằm ở đâu?',
      ],
    };
  }

  if (primary === 'location' || primary === 'transport') {
    const showBoth = primary === 'location' || secondary === 'transport';
    return {
      answer: `${
        showBoth
          ? '**Vị trí:** Phố cổ Hoa Lư nằm tại khu vực **hồ Kỳ Lân, dưới chân núi Kỳ Lân**, thuộc khu vực **trung tâm Ninh Bình**. Lưu ý rằng địa chỉ hành chính và cách ghi địa chỉ cụ thể có thể thay đổi theo việc sắp xếp đơn vị hành chính; khi cần chỉ đường chính thức, quý khách hãy kiểm tra trên bản đồ số và nguồn địa phương hiện hành.\n\n'
          : ''
      }**Phương tiện & gửi xe:**\n- Có thể di chuyển tới đây bằng **xe máy, ô tô cá nhân, taxi** hoặc **xe đạp** (nếu lưu trú gần trung tâm).\n- Vị trí bãi gửi xe và mức phí gửi xe có thể thay đổi theo thời điểm — quý khách nên quan sát biển niêm yết, hỏi nhân viên hướng dẫn và giữ vé gửi xe cẩn thận.${
        secondary === 'nearby'
          ? '\n\n**Các điểm thường kết hợp trong hành trình:** Ga Ninh Bình, Tràng An, Hang Múa, Tam Cốc – Bích Động và Khu di tích Cố đô Hoa Lư (khoảng cách chỉ mang tính ước lượng).'
          : ''
      }`,
      citations: ['2. Vị trí', '11. Phương tiện và lưu ý di chuyển'],
      suggestions: [
        'Từ Phố cổ Hoa Lư có thể kết hợp đi những điểm nào?',
        'Phố cổ Hoa Lư khác gì Cố đô Hoa Lư?',
        'Thời gian gợi ý tham quan trong ngày?',
      ],
    };
  }

  if (primary === 'nearby') {
    return {
      answer:
        'Từ Phố cổ Hoa Lư (trung tâm Ninh Bình), du khách thường kết hợp tham quan các địa điểm nổi bật sau:\n\n- **Quần thể danh thắng Tràng An:** Nổi tiếng với núi đá vôi, sông nước và tuyến thuyền qua hang động.\n- **Hang Múa:** Điểm ngắm cảnh từ trên cao với các bậc đá dẫn lên đỉnh núi.\n- **Tam Cốc – Bích Động:** Tuyến tham quan sông Ngô Đồng, hang động và chùa Bích Động.\n- **Khu di tích lịch sử Cố đô Hoa Lư (Trường Yên):** Quần thể di tích gắn với các triều Đinh, Tiền Lê và kinh đô xưa.\n- **Ga Ninh Bình:** Thuận tiện cho du khách di chuyển bằng tàu hỏa.\n\n*Lưu ý:* Mọi khoảng cách giữa Phố cổ Hoa Lư và các địa điểm trên chỉ nên xem là ước lượng; tuyến đường và điểm xuất phát thực tế có thể làm thay đổi quãng đường.',
      citations: ['2. Vị trí', '12. Địa điểm kết hợp tham quan'],
      suggestions: [
        'Phân biệt Phố cổ Hoa Lư và Cố đô Hoa Lư',
        'Di chuyển đến Phố cổ Hoa Lư bằng phương tiện gì?',
        'Gợi ý lịch trình buổi chiều tối tại Phố cổ Hoa Lư',
      ],
    };
  }

  if (primary === 'history') {
    return {
      answer:
        '**Ý tưởng & Lịch sử hình thành Phố cổ Hoa Lư:**\n\n- Phố cổ Hoa Lư được xây dựng với ý tưởng tạo dựng không gian du lịch mang cảm hứng từ **văn hóa Đại Việt**, kết hợp kiến trúc truyền thống, thương mại, ẩm thực và biểu diễn nghệ thuật.\n- Các thông tin du lịch từng giới thiệu công trình được triển khai từ giai đoạn **cuối thập niên 2010** và mở cửa đón khách vào **đầu năm 2022**.\n- **Lưu ý quan trọng:** Đây là công trình du lịch xây dựng mới, không phải khu phố cổ nguyên bản từ thế kỷ X. Các mốc thời gian, quy mô đầu tư, tổng vốn, đơn vị thực hiện cần được xác minh bằng hồ sơ chính thức của chủ đầu tư hoặc cơ quan quản lý nếu dùng cho nghiên cứu, báo cáo.',
      citations: ['3. Lịch sử hình thành và ý tưởng', '1. Khái quát'],
      suggestions: [
        'Phố cổ Hoa Lư khác gì Khu di tích Cố đô Hoa Lư?',
        'Các công trình kiến trúc nổi bật ở đây là gì?',
        'Những nguồn chính thức nào dùng để kiểm chứng thông tin?',
      ],
    };
  }

  if (primary === 'sources') {
    return {
      answer:
        'Để kiểm chứng hoặc cập nhật các thông tin vận hành hiện hành (giá vé, giờ mở cửa, lịch diễn, địa chỉ hành chính), nên ưu tiên các nguồn sau theo thứ tự:\n\n1. **Sở Du lịch tỉnh Ninh Bình** và cổng thông tin du lịch chính thức của tỉnh.\n2. **Cổng thông tin điện tử tỉnh Ninh Bình** và cơ quan quản lý văn hóa – du lịch địa phương.\n3. **Thông báo chính thức của chủ đầu tư hoặc đơn vị vận hành** Phố cổ Hoa Lư.\n4. **Kênh bán vé chính thức của chương trình Anh hùng Cờ Lau** (nếu có).\n5. **Bản đồ số hiện hành** để kiểm tra địa chỉ, tuyến đường và khoảng cách thực tế.',
      citations: ['15. Nguồn nên dùng để cập nhật và kiểm chứng'],
      suggestions: [
        'Giờ mở cửa và giá vé hiện có thông tin gì?',
        'Phố cổ Hoa Lư nằm ở khu vực nào?',
        'Gợi ý lịch trình buổi chiều tối',
      ],
    };
  }

  return null;
}

export async function generateHoaLuReply(params: {
  message: string;
  history: HistoryTurn[];
  sessionId: string;
}): Promise<ChatResponsePayload> {
  const configRow = db
    .prepare(
      'SELECT model, system_instruction, thinking_level, max_context_chunks, log_conversations FROM ai_config WHERE id = 1'
    )
    .get() as AiConfigRow | undefined;

  const maxChunks = Math.min(12, Math.max(2, configRow?.max_context_chunks || 6));
  const retrievalMode = configRow?.thinking_level === 'STRICT' ? 'STRICT' : 'HYBRID';

  const contextInfo = buildContextAwareQuery(params.message, params.history);
  const expandedEffective = expandAbbreviations(contextInfo.effectiveQuery);

  const { chunks, matchedFaqs } = await retrieveRelevantContext(
    contextInfo.effectiveQuery,
    maxChunks,
    retrievalMode
  );

  // 1. Check if a newly uploaded supplementary RAG doc or high-specificity RAG passage answers this directly
  const nonPrimaryStrongHit = chunks.find((c) => c.isPrimary === 0 && c.score >= 0.42);
  let answer = '';
  let citations: string[] = [];
  let followUpSuggestions: string[] = [];

  if (nonPrimaryStrongHit) {
    const ragSynth = synthesizeFromRetrievedChunks(params.message, chunks, matchedFaqs);
    if (ragSynth) {
      answer = ragSynth.answer;
      citations = ragSynth.citations;
      followUpSuggestions = [
        'Khung giờ gợi ý tham quan Phố cổ Hoa Lư?',
        'Ở đây có những món đặc sản nào?',
        'Phố cổ Hoa Lư khác gì Cố đô Hoa Lư?',
      ];
    }
  }

  // 2. Otherwise evaluate intent + multi-turn NLU grounded in verified sections
  if (!answer && !hasOutOfScopeTopic(expandedEffective)) {
    const intents = detectIntents(expandedEffective);
    const intentReply = buildIntentResponse(intents, expandedEffective, {
      transportHint: contextInfo.transportHint,
      peopleHint: contextInfo.peopleHint,
    });

    if (intentReply) {
      answer = intentReply.answer;
      citations = intentReply.citations;
      followUpSuggestions = intentReply.suggestions;
    }
  }

  if (!answer) {
    // 3. Fall back to pure RAG passage synthesis from SQLite knowledge_chunks + FAQs
    const ragSynth = synthesizeFromRetrievedChunks(params.message, chunks, matchedFaqs);
    if (ragSynth) {
      answer = ragSynth.answer;
      citations = ragSynth.citations;
      followUpSuggestions = [
        'Phố cổ Hoa Lư có những kiến trúc nào nổi bật?',
        'Khung giờ gợi ý tham quan buổi chiều tối?',
        'Các địa điểm kết hợp tham quan gần Phố cổ Hoa Lư?',
      ];
    } else {
      // 4. Honest unverified / out-of-scope response per mandatory accuracy rules
      answer =
        'Hiện **chưa có dữ liệu xác thực** trong cơ sở tri thức Phố cổ Hoa Lư về nội dung bạn vừa hỏi.\n\nTôi là **HOA LƯ AI**, chỉ cung cấp thông tin đã được kiểm chứng từ tài liệu Phố cổ Hoa Lư (vị trí, kiến trúc, hoạt động trải nghiệm, *Anh hùng Cờ Lau*, ẩm thực, làng nghề, lịch trình gợi ý và các điểm kết hợp tại Ninh Bình). Nếu bạn cần kiểm tra thông tin vận hành thực tế mới nhất (giá vé, giờ mở cửa, số điện thoại hoặc sự kiện phát sinh), vui lòng đối chiếu với **Sở Du lịch tỉnh Ninh Bình**, **Cổng thông tin điện tử tỉnh Ninh Bình** hoặc **đơn vị vận hành Phố cổ Hoa Lư**.';
      citations = ['14. Những điều cần lưu ý', '15. Nguồn kiểm chứng'];
      followUpSuggestions = [
        'Phố cổ Hoa Lư nằm ở đâu và khác gì Cố đô Hoa Lư?',
        'Ở Phố cổ Hoa Lư có những hoạt động và ẩm thực gì?',
        'Gợi ý lịch trình buổi chiều tối tại Phố cổ Hoa Lư',
      ];
    }
  }

  // Filter out suggestions that duplicate recent user turns
  const askedNorms = new Set(
    [...params.history.filter((h) => h.role === 'user').map((h) => h.content), params.message].map(
      (t) => normalizeVietnamese(t)
    )
  );
  const filteredSuggestions = followUpSuggestions
    .filter((s) => !askedNorms.has(normalizeVietnamese(s)))
    .slice(0, 3);

  const finalPayload: ChatResponsePayload = {
    answer,
    citations,
    followUpSuggestions:
      filteredSuggestions.length > 0
        ? filteredSuggestions
        : ['Gợi ý lịch trình buổi chiều tối tại Phố cổ Hoa Lư', 'Ẩm thực đặc sản Ninh Bình ở đây có gì?'],
  };

  if (configRow?.log_conversations === 1) {
    db.prepare(`
      INSERT INTO chat_logs (session_id, user_message, assistant_reply, sources_used, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      params.sessionId.slice(0, 64),
      params.message,
      finalPayload.answer,
      JSON.stringify(finalPayload.citations),
      new Date().toISOString()
    );
  }

  return finalPayload;
}
