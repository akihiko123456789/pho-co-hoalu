import React, { useMemo, useState } from 'react';
import { ArrowRight, MessageSquareText, X } from 'lucide-react';
import type { Article } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ExplorePageProps {
  articles: Article[];
  selectedArticle: Article | null;
  onSelectArticle: (article: Article | null) => void;
  onAskAI: (prompt?: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  articles,
  selectedArticle,
  onSelectArticle,
  onAskAI,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(articles.map((a) => a.category)));
    return ['Tất cả', ...unique];
  }, [articles]);

  const filtered = useMemo(() => {
    if (activeCategory === 'Tất cả') return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="max-w-3xl space-y-3 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
          Khám phá không gian văn hóa
        </p>
        <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#2C1D14]">
          Kiến trúc, Trải nghiệm &amp; Ẩm thực
        </h1>
        <p className="text-base text-[#5C3D28] leading-relaxed">
          Chọn từng chủ đề để xem thông tin chi tiết về các công trình quanh hồ Kỳ Lân, hoạt động văn
          hóa, ẩm thực địa phương và các danh thắng Ninh Bình thường kết hợp trong hành trình.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div
        role="tablist"
        aria-label="Lọc theo danh mục khám phá"
        className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#EFE6D5] rounded-xl w-fit mb-10 border border-[#DED1BA]"
      >
        {categories.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#2C1D14] text-[#FAF6EE]'
                  : 'text-[#5C3D28] hover:text-[#2C1D14] hover:bg-[#E5D9C3]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-10 text-center bg-[#F3ECDD] border border-[#DED1BA] rounded-xl text-sm text-[#5C3D28]">
          Chưa có bài viết nào trong danh mục này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((item, idx) => (
            <article
              key={item.id}
              className="bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden flex flex-col hover:border-[#C2A476] transition-colors"
            >
              <div className="aspect-[4/3] overflow-hidden bg-[#E5D8C1]">
                <ImageWithFallback
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-xs text-[#7D6650] tabular-nums">
                    {item.category} · Mục {String(idx + 1).padStart(2, '0')}
                  </div>
                  <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
                    {item.title}
                  </h2>
                  <p className="text-sm text-[#4A3222] leading-relaxed">{item.summary}</p>
                </div>

                <div className="pt-3 border-t border-[#EFE7D8] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onSelectArticle(item)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8B261D] hover:underline underline-offset-4 cursor-pointer"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAskAI(`Hãy giải thích rõ hơn về: ${item.title}`)}
                    className="text-xs font-medium text-[#5C3D28] hover:text-[#2C1D14] cursor-pointer"
                  >
                    Hỏi AI
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-modal-title"
          className="fixed inset-0 z-50 bg-[#1B110B]/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => onSelectArticle(null)}
        >
          <div
            className="bg-[#FCF9F3] border border-[#D8CBB4] rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/9] relative bg-[#2C1D14]">
              <ImageWithFallback
                src={selectedArticle.image_url}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => onSelectArticle(null)}
                aria-label="Đóng chi tiết"
                className="absolute top-3 right-3 p-2.5 rounded-full bg-[#1B110B]/70 text-[#FAF6EE] hover:bg-[#1B110B] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest font-semibold text-[#8B261D]">
                  {selectedArticle.category}
                </div>
                <h2
                  id="article-modal-title"
                  className="font-serif text-2xl sm:text-3xl font-semibold text-[#2C1D14]"
                >
                  {selectedArticle.title}
                </h2>
              </div>

              <div className="pt-2 border-t border-[#EAE0CE]">
                <MarkdownRenderer content={selectedArticle.content} />
              </div>

              <div className="pt-5 border-t border-[#EAE0CE] flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const title = selectedArticle.title;
                    onSelectArticle(null);
                    onAskAI(`Tôi muốn hỏi thêm thông tin về ${title} ở Phố cổ Hoa Lư.`);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-medium transition-colors cursor-pointer"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span>Hỏi Hoa Lư AI về nội dung này</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectArticle(null)}
                  className="px-4 py-2.5 rounded-lg border border-[#D8CBB4] text-sm font-medium text-[#2C1D14] hover:bg-[#EFE6D5] transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
