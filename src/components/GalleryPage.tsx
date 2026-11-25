import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  SlidersHorizontal,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { GalleryItem } from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface GalleryPageProps {
  items: GalleryItem[];
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ items }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Tất cả');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(items.map((g) => g.category)));
    return ['Tất cả', ...unique];
  }, [items]);

  const filtered = useMemo(() => {
    if (activeCategory === 'Tất cả') return items;
    return items.filter((g) => g.category === activeCategory);
  }, [items, activeCategory]);

  useEffect(() => {
    if (viewerIndex === null || !isPlaying || filtered.length <= 1) return;
    const timer = setInterval(() => {
      setViewerIndex((prev) => (prev === null ? 0 : (prev + 1) % filtered.length));
    }, 4500);
    return () => clearInterval(timer);
  }, [viewerIndex, isPlaying, filtered.length]);

  useEffect(() => {
    if (viewerIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewerIndex(null);
        setIsPlaying(false);
        setIsZoomed(false);
      } else if (e.key === 'ArrowRight') {
        setViewerIndex((prev) => (prev === null ? 0 : (prev + 1) % filtered.length));
      } else if (e.key === 'ArrowLeft') {
        setViewerIndex((prev) =>
          prev === null ? 0 : (prev - 1 + filtered.length) % filtered.length
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewerIndex, filtered.length]);

  const openSlideshow = () => {
    if (filtered.length === 0) return;
    setViewerIndex(0);
    setIsPlaying(true);
    setIsZoomed(false);
  };

  const activeItem = viewerIndex !== null ? filtered[viewerIndex] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
            Thư viện hình ảnh
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#2C1D14]">
            Nhịp sống &amp; Cảnh sắc Phố cổ Hoa Lư
          </h1>
          <p className="text-base text-[#5C3D28] leading-relaxed">
            Chọn danh mục để lọc ảnh, nhấp vào từng khung hình để phóng to hoặc bật chế độ trình
            chiếu tự động.
          </p>
        </div>

        <button
          type="button"
          onClick={openSlideshow}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4" />
          <span>Trình chiếu Slideshow</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7D6650] mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Danh mục:</span>
        </span>
        <div
          role="tablist"
          aria-label="Danh mục thư viện ảnh"
          className="flex flex-wrap items-center gap-1.5 p-1 bg-[#EFE6D5] rounded-xl border border-[#DED1BA]"
        >
          {categories.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveCategory(cat);
                  setViewerIndex(null);
                  setIsPlaying(false);
                }}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
        {filtered.map((item, idx) => (
          <figure
            key={item.id}
            className="group bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden flex flex-col"
          >
            <button
              type="button"
              onClick={() => {
                setViewerIndex(idx);
                setIsPlaying(false);
                setIsZoomed(false);
              }}
              aria-label={`Phóng to ảnh: ${item.title}`}
              className="relative aspect-[4/3] overflow-hidden bg-[#E5D8C1] cursor-pointer text-left"
            >
              <ImageWithFallback
                src={item.image_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
              <span className="absolute bottom-3 right-3 p-2 rounded-lg bg-[#1B110B]/70 text-[#FAF6EE] opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4" />
              </span>
            </button>
            <figcaption className="p-4 space-y-1.5">
              <div className="text-xs text-[#7D6650] tabular-nums">
                Hình {String(idx + 1).padStart(2, '0')} · {item.category}
              </div>
              <h2 className="font-serif text-lg font-semibold text-[#2C1D14]">{item.title}</h2>
              <p className="text-xs text-[#5C3D28] leading-relaxed">{item.caption}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Lightbox & Slideshow Modal */}
      {activeItem && viewerIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Trình xem và trình chiếu hình ảnh"
          className="fixed inset-0 z-50 bg-[#140C08]/95 text-[#FAF6EE] flex flex-col"
        >
          {/* Top toolbar */}
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-[#3A281E]">
            <div className="text-xs sm:text-sm text-[#DFD2C0] tabular-nums truncate">
              {viewerIndex + 1} / {filtered.length} · {activeItem.category}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2C1D14] hover:bg-[#3F2A1D] border border-[#543A28] text-xs font-medium cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Tạm dừng' : 'Trình chiếu'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsZoomed((z) => !z)}
                aria-label={isZoomed ? 'Thu nhỏ ảnh' : 'Phóng to ảnh'}
                className="p-2 rounded-lg bg-[#2C1D14] hover:bg-[#3F2A1D] border border-[#543A28] cursor-pointer"
              >
                {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewerIndex(null);
                  setIsPlaying(false);
                  setIsZoomed(false);
                }}
                aria-label="Đóng trình xem"
                className="p-2 rounded-lg bg-[#2C1D14] hover:bg-[#8B261D] border border-[#543A28] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center image */}
          <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
            {filtered.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setViewerIndex((viewerIndex - 1 + filtered.length) % filtered.length)
                }
                aria-label="Ảnh trước"
                className="absolute left-3 sm:left-6 z-10 p-3 rounded-full bg-[#231710]/85 hover:bg-[#8B261D] border border-[#543A28] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <div className="max-w-5xl w-full flex flex-col items-center">
              <div
                key={activeItem.id}
                className={`overflow-hidden rounded-xl transition-transform duration-300 ${
                  isZoomed ? 'scale-125 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed((z) => !z)}
              >
                <ImageWithFallback
                  src={activeItem.image_url}
                  alt={activeItem.title}
                  className="max-h-[68vh] w-auto object-contain rounded-xl"
                />
              </div>
              <div className="mt-4 text-center max-w-2xl space-y-1">
                <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#F6DF96]">
                  {activeItem.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#D6C8B4]">{activeItem.caption}</p>
              </div>
            </div>

            {filtered.length > 1 && (
              <button
                type="button"
                onClick={() => setViewerIndex((viewerIndex + 1) % filtered.length)}
                aria-label="Ảnh tiếp theo"
                className="absolute right-3 sm:right-6 z-10 p-3 rounded-full bg-[#231710]/85 hover:bg-[#8B261D] border border-[#543A28] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
