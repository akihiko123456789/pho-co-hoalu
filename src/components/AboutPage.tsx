import React, { useMemo } from 'react';
import { BookOpen, MessageSquareText } from 'lucide-react';
import type { KnowledgeDoc } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AboutPageProps {
  docs: KnowledgeDoc[];
  onAskAI: (prompt?: string) => void;
}

interface ParsedSection {
  id: string;
  heading: string;
  body: string;
}

function parseMarkdownSections(raw: string): ParsedSection[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const sections: ParsedSection[] = [];
  let currentHeading = '';
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join('\n').trim();
    if (currentHeading && body) {
      sections.push({
        id: `sec-${sections.length + 1}`,
        heading: currentHeading,
        body,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      continue; // Skip main document H1
    }
    if (trimmed === '---' || trimmed === 'HẾT TÀI LIỆU') {
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flush();
      currentHeading = trimmed.replace(/^##\s+/, '').trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

export const AboutPage: React.FC<AboutPageProps> = ({ docs, onAskAI }) => {
  const primaryDoc = docs.find((d) => d.is_primary === 1) || docs[0];
  const extraDocs = docs.filter((d) => primaryDoc && d.id !== primaryDoc.id);

  const sections = useMemo(() => {
    if (!primaryDoc) return [];
    return parseMarkdownSections(primaryDoc.content);
  }, [primaryDoc]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Editorial Document Masthead */}
      <header className="pb-8 border-b border-[#D8CBB4] max-w-4xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#8B261D]">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Hồ sơ giới thiệu · Cơ sở tri thức chính thức</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#2C1D14] leading-tight [text-wrap:balance]">
          Giới thiệu Phố cổ Hoa Lư – Ninh Bình
        </h1>
        <p className="text-base text-[#5C3D28] leading-relaxed max-w-2xl">
          Nội dung dưới đây được trình bày nguyên bản từ cơ sở tri thức Phố cổ Hoa Lư nhằm bảo đảm
          tính xác thực về lịch sử hình thành, kiến trúc, trải nghiệm, ẩm thực và hướng dẫn kiểm
          chứng thông tin.
        </p>
      </header>

      {/* 70 / 30 Asymmetric Reading Layout */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Reading Column */}
        <article className="lg:col-span-8 space-y-10 max-w-prose">
          {sections.length === 0 ? (
            <div className="p-6 bg-[#F3ECDD] border border-[#DED1BA] rounded-xl text-sm text-[#5C3D28]">
              Đang tải nội dung tài liệu giới thiệu...
            </div>
          ) : (
            sections.map((sec, idx) => (
              <section key={sec.id} id={sec.id} className="scroll-mt-24 space-y-3">
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#2C1D14] pb-2 border-b border-[#EAE0CE]">
                  {sec.heading}
                </h2>
                <div
                  className={
                    idx === 1
                      ? '[&>div>p:first-of-type]:first-letter:text-5xl [&>div>p:first-of-type]:first-letter:font-serif [&>div>p:first-of-type]:first-letter:font-semibold [&>div>p:first-of-type]:first-letter:text-[#8B261D] [&>div>p:first-of-type]:first-letter:float-left [&>div>p:first-of-type]:first-letter:mr-3 [&>div>p:first-of-type]:first-letter:leading-[0.9]'
                      : ''
                  }
                >
                  <MarkdownRenderer content={sec.body} />
                </div>

                {idx === 2 && (
                  <blockquote className="my-8 py-5 border-y border-[#D4AF37]/50 text-center">
                    <p className="font-serif italic text-xl sm:text-2xl text-[#2C1D14] leading-relaxed">
                      “Phố cổ Hoa Lư là công trình du lịch được xây dựng mới quanh hồ Kỳ Lân — gợi
                      nhắc cảm hứng văn hóa Đại Việt bên cạnh Khu di tích lịch sử Cố đô Hoa Lư tại
                      Trường Yên.”
                    </p>
                  </blockquote>
                )}
              </section>
            ))
          )}

          {/* Additional Knowledge Documents uploaded by Admin */}
          {extraDocs.length > 0 && (
            <div className="pt-8 border-t border-[#D8CBB4] space-y-8">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                Tài liệu bổ sung từ Ban quản trị
              </div>
              {extraDocs.map((doc) => (
                <section key={doc.id} className="p-6 bg-[#F5EFE4] border border-[#DED1BA] rounded-xl space-y-3">
                  <h3 className="font-serif text-2xl font-semibold text-[#2C1D14]">{doc.title}</h3>
                  <div className="text-xs text-[#7D6650]">
                    Tệp: {doc.filename} · Cập nhật {new Date(doc.updated_at).toLocaleDateString('vi-VN')}
                  </div>
                  <MarkdownRenderer content={doc.content} />
                </section>
              ))}
            </div>
          )}
        </article>

        {/* Sticky Chapter Index & AI Sidebar */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="p-6 bg-[#F3ECDD] border border-[#DED1BA] rounded-xl space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
                Mục lục tài liệu
              </h2>
              <nav aria-label="Mục lục giới thiệu" className="space-y-1.5">
                {sections.map((sec) => (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    className="block py-1 text-sm text-[#4A3222] hover:text-[#8B261D] transition-colors"
                  >
                    {sec.heading}
                  </a>
                ))}
              </nav>
            </div>

            <div className="p-6 bg-[#2C1D14] text-[#FAF6EE] rounded-xl space-y-3">
              <h3 className="font-serif text-lg font-semibold text-[#F6DF96]">
                Cần tóm tắt hoặc hỏi sâu hơn?
              </h3>
              <p className="text-xs text-[#DFD2C0] leading-relaxed">
                HOA LƯ AI sử dụng trực tiếp toàn bộ cơ sở tri thức này cùng kiến trúc RAG để trả lời
                chính xác từng chi tiết bạn quan tâm.
              </p>
              <button
                type="button"
                onClick={() => onAskAI('Hãy tóm tắt những điểm nổi bật nhất tại Phố cổ Hoa Lư')}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#B8860B] hover:bg-[#9E7208] text-xs font-semibold text-[#FAF6EE] transition-colors cursor-pointer"
              >
                <MessageSquareText className="w-4 h-4" />
                <span>Hỏi Trợ lý Hoa Lư AI</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
