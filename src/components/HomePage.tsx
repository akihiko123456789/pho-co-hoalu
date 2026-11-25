import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Compass,
  Info,
  MapPin,
  MessageSquareText,
  Utensils,
} from 'lucide-react';
import type { Article, FaqItem, GalleryItem, PageView } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { MarkdownRenderer } from './MarkdownRenderer';

interface HomePageProps {
  articles: Article[];
  gallery: GalleryItem[];
  faqs: FaqItem[];
  onNavigate: (page: PageView, sectionId?: string) => void;
  onAskAI: (prompt?: string) => void;
  onSelectArticle: (article: Article) => void;
}

const SUGGESTED_ITINERARY = [
  {
    time: '17:00 – 17:45',
    activity: 'Đến Phố cổ Hoa Lư, đi dạo và chụp ảnh các dãy nhà gỗ, mái ngói, lối phố ven hồ.',
  },
  {
    time: '17:45 – 18:30',
    activity: 'Tham quan hồ Kỳ Lân, Tháp Tứ Ân và khu vực núi, chùa khi phố bắt đầu lên đèn.',
  },
  {
    time: '18:30 – 19:30',
    activity: 'Ăn tối, thưởng thức các món đặc sản địa phương như cơm cháy, thịt dê núi, bánh khoái tép.',
  },
  {
    time: '19:30 – 20:30',
    activity: 'Tham gia hoạt động đang tổ chức như chèo thuyền, thả hoa đăng hoặc trò chơi dân gian (tùy lịch).',
  },
  {
    time: '20:45 – 21:45',
    activity: 'Xem chương trình thực cảnh Anh hùng Cờ Lau nếu có suất diễn và đã mua vé từ kênh chính thức.',
  },
  {
    time: '21:45 – 22:30',
    activity: 'Dạo phố ban đêm, ngắm cảnh hồ, tìm mua sản phẩm thủ công lưu niệm và kết thúc hành trình.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({
  articles,
  gallery,
  faqs,
  onNavigate,
  onAskAI,
  onSelectArticle,
}) => {
  const [openFaqId, setOpenFaqId] = useState<string | null>(faqs[0]?.id || null);

  const architectureArticles = articles.filter((a) => a.category === 'Kiến trúc');
  const experienceArticles = articles.filter((a) => a.category === 'Trải nghiệm');
  const culinaryAndCraftArticles = articles.filter(
    (a) => a.category === 'Ẩm thực' || a.category === 'Làng nghề & Kết hợp'
  );

  return (
    <div>
      {/* HERO SECTION */}
      <section className="relative min-h-[78vh] flex items-end bg-[#1D130D] overflow-hidden">
        <ImageWithFallback
          src="/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg"
          alt="Toàn cảnh Phố cổ Hoa Lư, Hồ Kỳ Lân và Tháp Tứ Ân lúc hoàng hôn tại Ninh Bình"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#1A100A]/92 via-[#1A100A]/50 to-[#1A100A]/25"
        />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs sm:text-sm font-medium tracking-widest uppercase text-[#E8C56E]">
              Hồ Kỳ Lân · Trung tâm Ninh Bình
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#FAF6EE] leading-[1.12] [text-wrap:balance]">
              Phố Cổ Hoa Lư
            </h1>
            <p className="text-base sm:text-lg text-[#EDE3D4] leading-relaxed">
              Không gian du lịch, tham quan, ẩm thực và trải nghiệm văn hóa bên hồ Kỳ Lân — tái hiện
              một phần kiến trúc và đời sống Đại Việt xưa, gợi nhắc thời kỳ Hoa Lư là kinh đô nhà
              nước Đại Cồ Việt.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onAskAI()}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-[#B8860B] hover:bg-[#9E7208] text-[#FAF6EE] text-sm font-semibold transition-colors cursor-pointer"
              >
                <MessageSquareText className="w-4 h-4" />
                <span>Hỏi Trợ lý Hoa Lư AI</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#FAF6EE]/12 hover:bg-[#FAF6EE]/20 text-[#FAF6EE] border border-[#FAF6EE]/30 text-sm font-medium backdrop-blur-sm transition-colors cursor-pointer"
              >
                <span>Khám phá điểm đến</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* OPERATIONAL & NAVIGATION STRIP */}
      <section className="bg-[#EFE6D5] border-b border-[#DED1BA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#8B261D] shrink-0 mt-1" />
              <div>
                <div className="font-semibold text-[#2C1D14]">Vị trí trung tâm</div>
                <div className="text-xs text-[#5C3D28] mt-0.5">
                  Khu vực hồ Kỳ Lân, dưới chân núi Kỳ Lân, Ninh Bình
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#8B261D] shrink-0 mt-1" />
              <div>
                <div className="font-semibold text-[#2C1D14] tabular-nums">Gợi ý: 17:30 – 21:30</div>
                <div className="text-xs text-[#5C3D28] mt-0.5">
                  Khung giờ đẹp lúc lên đèn (cần kiểm tra giờ mở cửa thực tế)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-[#8B261D] shrink-0 mt-1" />
              <div>
                <div className="font-semibold text-[#2C1D14]">Phân biệt di tích</div>
                <div className="text-xs text-[#5C3D28] mt-0.5">
                  Công trình du lịch xây mới — khác Khu di tích Cố đô Hoa Lư
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-3 text-xs font-medium text-[#8B261D]">
              <a href="#kien-truc" className="hover:underline underline-offset-4">
                Kiến trúc
              </a>
              <span aria-hidden="true" className="text-[#B8A68E]">
                ·
              </span>
              <a href="#trai-nghiem" className="hover:underline underline-offset-4">
                Trải nghiệm
              </a>
              <span aria-hidden="true" className="text-[#B8A68E]">
                ·
              </span>
              <a href="#am-thuc" className="hover:underline underline-offset-4">
                Ẩm thực
              </a>
              <span aria-hidden="true" className="text-[#B8A68E]">
                ·
              </span>
              <a href="#lich-trinh" className="hover:underline underline-offset-4">
                Lịch trình
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* OVERVIEW SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                01. Khái quát &amp; Ý tưởng hình thành
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2C1D14] leading-tight [text-wrap:balance]">
                Tái hiện không gian văn hóa Đại Việt giữa lòng Ninh Bình
              </h2>
              <p className="text-[15.5px] text-[#4A3222] leading-[1.75]">
                Ý tưởng của Phố cổ Hoa Lư là tạo dựng một không gian du lịch mang cảm hứng từ văn hóa
                Đại Việt, kết hợp kiến trúc truyền thống, hoạt động thương mại, ẩm thực và biểu diễn
                nghệ thuật. Công trình được giới thiệu triển khai từ cuối thập niên 2010 và mở cửa đón
                khách vào đầu năm 2022.
              </p>
              <p className="text-[15.5px] text-[#4A3222] leading-[1.75]">
                <strong>Lưu ý phân biệt:</strong> Phố cổ Hoa Lư là tổ hợp du lịch được xây dựng mới
                quanh hồ Kỳ Lân — không phải khu phố cổ nguyên bản tồn tại liên tục từ thế kỷ X. Quần
                thể di tích lịch sử gắn với kinh đô xưa của các triều Đinh – Tiền Lê là{' '}
                <strong>Khu di tích lịch sử Cố đô Hoa Lư</strong> nằm tại khu vực Trường Yên.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#8B261D] hover:text-[#681A13] transition-colors cursor-pointer"
              >
                <span>Đọc toàn văn tài liệu giới thiệu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span aria-hidden="true" className="text-[#CBBBA4]">
                |
              </span>
              <button
                type="button"
                onClick={() => onAskAI('Phố cổ Hoa Lư khác gì với Khu di tích Cố đô Hoa Lư?')}
                className="text-sm font-medium text-[#5C3D28] hover:text-[#2C1D14] underline underline-offset-4 cursor-pointer"
              >
                Hỏi AI để hiểu rõ hơn
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[300px] rounded-xl overflow-hidden border border-[#DFD2BC] bg-[#EFE6D5]">
              <ImageWithFallback
                src="/src/assets/images/pho_co_wooden_houses_1795618580199.jpg"
                alt="Dãy nhà gỗ, mái ngói và đèn lồng ven hồ tại Phố cổ Hoa Lư"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE SECTION */}
      <section id="kien-truc" className="bg-[#F3ECDD] border-y border-[#E2D6C0] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                02. Kiến trúc &amp; Công trình nổi bật
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2C1D14]">
                Dấu ấn cảnh quan quanh hồ Kỳ Lân
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('explore')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B261D] hover:underline underline-offset-4 shrink-0 cursor-pointer"
            >
              <span>Xem tất cả điểm khám phá</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {architectureArticles.map((article) => (
              <article
                key={article.id}
                className="bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#E9DEC8]">
                  <ImageWithFallback
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs text-[#7D6650]">
                      <span>{article.category}</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span>Phố cổ Hoa Lư</span>
                    </div>
                    <h3 className="font-serif text-2xl font-semibold text-[#2C1D14]">
                      {article.title}
                    </h3>
                    <p className="text-sm text-[#4A3222] leading-relaxed">{article.summary}</p>
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-[#EFE7D8]">
                    <button
                      type="button"
                      onClick={() => onSelectArticle(article)}
                      className="text-sm font-semibold text-[#8B261D] hover:text-[#6B1C15] inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAskAI(`Giới thiệu chi tiết về ${article.title}`)}
                      className="text-xs font-medium text-[#5C3D28] hover:text-[#2C1D14] cursor-pointer"
                    >
                      Hỏi AI
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Highlighted architectural elements list */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Hồ Kỳ Lân',
                desc: 'Không gian mặt nước trung tâm, tạo cảnh quan cho khu phố và là nơi du khách ngắm cảnh, chụp ảnh.',
              },
              {
                name: 'Tháp Tứ Ân',
                desc: 'Công trình nhiều tầng mái, tạo điểm nhấn thị giác nổi bật giữa khu vực hồ.',
              },
              {
                name: 'Núi Kỳ Lân & khu vực chùa',
                desc: 'Cảnh quan núi đá và công trình tín ngưỡng góp phần tạo nên tổng thể văn hóa – tâm linh.',
              },
              {
                name: 'Dãy nhà gỗ, mái ngói & đèn lồng',
                desc: 'Chi tiết kiến trúc truyền thống tạo cảm giác không gian phố xưa dọc lối dạo.',
              },
              {
                name: 'Cầu và lối dạo ven hồ',
                desc: 'Các vị trí đi bộ, ngắm cảnh và chụp ảnh lý tưởng, đặc biệt khi khu phố lên đèn.',
              },
              {
                name: 'Thủy đình & khu biểu diễn',
                desc: 'Không gian có thể tổ chức các chương trình nghệ thuật và hoạt động biểu diễn theo lịch.',
              },
            ].map((item) => (
              <div
                key={item.name}
                className="p-5 bg-[#FAF6EE] border border-[#E2D6C0] rounded-xl space-y-1.5"
              >
                <h3 className="font-serif text-lg font-semibold text-[#2C1D14]">{item.name}</h3>
                <p className="text-sm text-[#5C3D28] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCES & ANH HUNG CO LAU */}
      <section id="trai-nghiem" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="space-y-2 max-w-2xl mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
            03. Hoạt động &amp; Nghệ thuật
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#2C1D14]">
            Trải nghiệm văn hóa &amp; Chương trình thực cảnh
          </h2>
          <p className="text-sm text-[#5C3D28]">
            Lưu ý: Các hoạt động trải nghiệm và suất diễn có thể thay đổi theo mùa, ngày trong tuần,
            thời tiết và kế hoạch tổ chức thực tế.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {experienceArticles.map((article) => (
            <div
              key={article.id}
              className="bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] overflow-hidden bg-[#E9DEC8]">
                <ImageWithFallback
                  src={article.image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="text-xs text-[#7D6650]">{article.category}</div>
                  <h3 className="font-serif text-2xl font-semibold text-[#2C1D14]">
                    {article.title}
                  </h3>
                  <p className="text-sm text-[#4A3222] leading-relaxed">{article.summary}</p>
                </div>
                <div className="pt-3 border-t border-[#EFE7D8] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectArticle(article)}
                    className="text-sm font-semibold text-[#8B261D] hover:underline underline-offset-4 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Đọc chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAskAI(`Thông tin về ${article.title} tại Phố cổ Hoa Lư`)}
                    className="text-xs font-medium text-[#5C3D28] hover:text-[#2C1D14] cursor-pointer"
                  >
                    Hỏi AI về lịch &amp; lưu ý
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CULINARY & CRAFT VILLAGES */}
      <section id="am-thuc" className="bg-[#2C1D14] text-[#FAF6EE] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#E8C56E]">
                04. Ẩm thực &amp; Làng nghề truyền thống
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#FAF6EE]">
                Hương vị Ninh Bình &amp; Tinh hoa thủ công
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onAskAI('Đến Phố cổ Hoa Lư nên ăn gì và có những làng nghề nào?')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D4AF37]/50 text-xs font-medium text-[#F6DF96] hover:bg-[#3C281C] transition-colors shrink-0 cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Hỏi AI gợi ý ẩm thực</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {culinaryAndCraftArticles.map((item) => (
              <div
                key={item.id}
                className="bg-[#38261B] border border-[#4D3627] rounded-xl overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto overflow-hidden bg-[#22160F] shrink-0">
                  <ImageWithFallback
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs text-[#D4AF37]">{item.category}</div>
                    <h3 className="font-serif text-xl font-semibold text-[#FAF6EE]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#DFD2C0] leading-relaxed">{item.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectArticle(item)}
                    className="self-start text-xs font-semibold text-[#F6DF96] hover:underline underline-offset-4 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Xem chi tiết danh sách</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUGGESTED EVENING ITINERARY & FAQ */}
      <section id="lich-trinh" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Itinerary */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                05. Lịch trình gợi ý
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#2C1D14]">
                Một buổi chiều – tối tại Phố cổ Hoa Lư
              </h2>
              <p className="text-sm text-[#5C3D28]">
                Lịch trình dưới đây mang tính tham khảo và cần điều chỉnh theo giờ hoạt động, lịch
                diễn thực tế tại thời điểm tham quan.
              </p>
            </div>

            <div className="border-t border-[#DED1BA] divide-y divide-[#E7DCC7]">
              {SUGGESTED_ITINERARY.map((step) => (
                <div key={step.time} className="py-4 flex flex-col sm:flex-row sm:gap-6 gap-1">
                  <div className="font-mono text-xs sm:text-sm font-medium text-[#8B261D] tabular-nums shrink-0 sm:w-32">
                    {step.time}
                  </div>
                  <p className="text-sm text-[#3F2A1D] leading-relaxed">{step.activity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                06. Giải đáp nhanh
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#2C1D14]">
                Câu hỏi thường gặp
              </h2>
              <p className="text-sm text-[#5C3D28]">
                Tổng hợp các thông tin quan trọng trước khi lên kế hoạch tham quan.
              </p>
            </div>

            <div className="border-t border-[#DED1BA] divide-y divide-[#DED1BA]">
              {faqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div key={faq.id} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      className="w-full flex items-start justify-between gap-4 text-left py-1 cursor-pointer"
                    >
                      <span className="text-sm sm:text-[15px] font-semibold text-[#2C1D14]">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#8B261D] shrink-0 mt-1 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="mt-2 pr-6">
                        <MarkdownRenderer content={faq.answer} compact />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY & MAP GATEWAY */}
      <section className="bg-[#F3ECDD] border-t border-[#E2D6C0] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                07. Thư viện &amp; Định vị
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#2C1D14]">
                Hình ảnh không gian &amp; Bản đồ tham quan
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('gallery')}
                className="text-sm font-semibold text-[#8B261D] hover:underline underline-offset-4 cursor-pointer"
              >
                Mở thư viện ảnh
              </button>
              <span aria-hidden="true" className="text-[#CBBBA4]">
                ·
              </span>
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2C1D14] hover:text-[#8B261D] cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Xem bản đồ chỉ đường</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.slice(0, 3).map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate('gallery')}
                className="group text-left bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden cursor-pointer"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#E5D8C1]">
                  <ImageWithFallback
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                </div>
                <div className="p-4 space-y-1">
                  <div className="text-xs text-[#7D6650] tabular-nums">
                    Ảnh 0{idx + 1} · {item.category}
                  </div>
                  <div className="font-serif text-base font-semibold text-[#2C1D14]">
                    {item.title}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
