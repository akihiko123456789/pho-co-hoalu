import React from 'react';
import { MapPin, ShieldCheck } from 'lucide-react';
import type { PageView } from '../types';

interface FooterProps {
  onNavigate: (page: PageView, sectionId?: string) => void;
  onOpenChat: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenChat }) => {
  return (
    <footer className="bg-[#231710] text-[#E8DFD1] border-t border-[#3D2B1F]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand & Context */}
          <div className="md:col-span-5 space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[#FAF6EE]">
              Phố Cổ Hoa Lư
            </h2>
            <p className="text-sm text-[#CBBBA4] leading-relaxed max-w-md">
              Không gian du lịch, tham quan, ẩm thực và trải nghiệm văn hóa tại khu vực hồ Kỳ Lân,
              dưới chân núi Kỳ Lân, khu vực trung tâm Ninh Bình.
            </p>
            <div className="flex items-start gap-2.5 text-xs text-[#B7A48C]">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>
                Khu vực hồ Kỳ Lân, trung tâm Ninh Bình. Kiểm tra địa chỉ hành chính và tuyến đường
                thực tế trên bản đồ số khi di chuyển.
              </span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
              Khám phá
            </h3>
            <ul className="space-y-2 text-sm text-[#D6C8B4]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-[#FAF6EE] transition-colors cursor-pointer"
                >
                  Giới thiệu &amp; Lịch sử
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'kien-truc')}
                  className="hover:text-[#FAF6EE] transition-colors cursor-pointer"
                >
                  Kiến trúc nổi bật
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'trai-nghiem')}
                  className="hover:text-[#FAF6EE] transition-colors cursor-pointer"
                >
                  Hoạt động &amp; Trải nghiệm
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'am-thuc')}
                  className="hover:text-[#FAF6EE] transition-colors cursor-pointer"
                >
                  Ẩm thực &amp; Làng nghề
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('gallery')}
                  className="hover:text-[#FAF6EE] transition-colors cursor-pointer"
                >
                  Thư viện hình ảnh
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('map')}
                  className="hover:text-[#FAF6EE] transition-colors cursor-pointer"
                >
                  Bản đồ &amp; Chỉ đường
                </button>
              </li>
            </ul>
          </div>

          {/* Official Verification Channels */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
              Nguồn đối chiếu &amp; Hỗ trợ
            </h3>
            <p className="text-xs text-[#B7A48C] leading-relaxed">
              Giá vé, giờ mở cửa và lịch chương trình thực cảnh Anh hùng Cờ Lau có thể thay đổi theo
              thời điểm. Vui lòng kiểm chứng qua Sở Du lịch tỉnh Ninh Bình, Cổng thông tin điện tử
              tỉnh Ninh Bình hoặc thông báo chính thức của đơn vị vận hành.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenChat}
                className="text-xs font-medium text-[#D4AF37] hover:text-[#FAF6EE] underline underline-offset-4 transition-colors cursor-pointer"
              >
                Hỏi Trợ lý Hoa Lư AI
              </button>
              <span aria-hidden="true" className="text-[#5C4433]">
                ·
              </span>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-1.5 text-xs text-[#A5927B] hover:text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quản trị viên</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#38271C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#9B8872]">
          <span>
            Cổng thông tin văn hóa Phố cổ Hoa Lư, Ninh Bình — Dữ liệu đối chiếu từ Cơ sở tri thức chính thức.
          </span>
          <span>Cố đô Hoa Lư (Trường Yên) &amp; Phố cổ Hoa Lư (Hồ Kỳ Lân)</span>
        </div>
      </div>
    </footer>
  );
};
