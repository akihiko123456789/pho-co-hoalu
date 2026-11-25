import React, { useState } from 'react';
import { Menu, MessageSquareText, X } from 'lucide-react';
import type { PageView } from '../types';

interface HeaderProps {
  currentPage: PageView;
  onNavigate: (page: PageView, sectionId?: string) => void;
  onOpenChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, onOpenChat }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ id: PageView; label: string }> = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'about', label: 'Giới thiệu' },
    { id: 'explore', label: 'Khám phá' },
    { id: 'gallery', label: 'Thư viện' },
    { id: 'map', label: 'Bản đồ' },
  ];

  const handleLinkClick = (page: PageView, sectionId?: string) => {
    setMobileOpen(false);
    onNavigate(page, sectionId);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FAF6EE]/95 backdrop-blur-md border-b border-[#E3D8C5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleLinkClick('home')}
          className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[#2C1D14] hover:text-[#8B261D] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#8B261D] rounded"
        >
          Phố Cổ Hoa Lư
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleLinkClick(item.id)}
                className={`relative py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#8B261D] rounded ${
                  active
                    ? 'text-[#8B261D]'
                    : 'text-[#5C3D28] hover:text-[#2C1D14]'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 bottom-0 h-[1.5px] bg-[#8B261D]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenChat}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#FAF6EE] bg-[#8B261D] hover:bg-[#731E17] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B261D] cursor-pointer"
          >
            <MessageSquareText className="w-4 h-4 shrink-0" />
            <span>Trợ lý AI</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 text-[#2C1D14] hover:bg-[#EFE6D5] rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#FAF6EE] border-b border-[#E3D8C5] px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLinkClick(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? 'bg-[#EFE6D5] text-[#8B261D]'
                  : 'text-[#2C1D14] hover:bg-[#F2EAD8]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 mt-2 border-t border-[#E3D8C5] grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleLinkClick('home', 'kien-truc')}
              className="px-2 py-2 text-xs font-medium text-[#5C3D28] bg-[#F2EAD8] rounded-md text-center"
            >
              Kiến trúc
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('home', 'trai-nghiem')}
              className="px-2 py-2 text-xs font-medium text-[#5C3D28] bg-[#F2EAD8] rounded-md text-center"
            >
              Trải nghiệm
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('home', 'am-thuc')}
              className="px-2 py-2 text-xs font-medium text-[#5C3D28] bg-[#F2EAD8] rounded-md text-center"
            >
              Ẩm thực
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
