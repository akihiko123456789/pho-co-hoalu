import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  MessageSquareText,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatMessage } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  queuedPrompt: string | null;
  onConsumeQueuedPrompt: () => void;
}

const INITIAL_SUGGESTIONS = [
  'Phố cổ Hoa Lư khác gì Cố đô Hoa Lư?',
  'Khung giờ gợi ý tham quan và ăn uống ở đây?',
  'Chương trình Anh hùng Cờ Lau kể về điều gì?',
  'Gợi ý lịch trình buổi chiều tối tại Phố cổ Hoa Lư',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome-hoa-lu-ai',
  role: 'assistant',
  content:
    'Xin chào quý khách. Tôi là **HOA LƯ AI – TRỢ LÝ DU LỊCH**, hỗ trợ giải đáp thông tin về kiến trúc, trải nghiệm, ẩm thực, làng nghề và gợi ý hành trình tại **Phố cổ Hoa Lư, Ninh Bình** dựa trên tài liệu tri thức đã xác thực.\n\nQuý khách muốn tìm hiểu nội dung nào hôm nay?',
  followUpSuggestions: INITIAL_SUGGESTIONS,
  timestamp: Date.now(),
};

const HoaLuAvatar: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const dim = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-br from-[#8B261D] to-[#5C1711] border border-[#D4AF37]/70 flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="w-5 h-5 text-[#F6DF96]" fill="none">
        <path
          d="M16 4L19 9H13L16 4ZM10 11H22L20 14H12L10 11ZM8 16H24L22 20H10L8 16ZM6 22H26V25H6V22Z"
          fill="currentColor"
        />
        <path d="M11 27H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen,
  onToggle,
  queuedPrompt,
  onConsumeQueuedPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId] = useState(() => `hl-${Math.random().toString(36).slice(2, 10)}`);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsLoading(true);

    try {
      const apiHistory = nextHistory
        .filter((m) => m.id !== 'welcome-hoa-lu-ai' && !m.isError)
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: apiHistory,
          sessionId,
        }),
      });

      const data = (await res.json()) as {
        answer?: string;
        citations?: string[];
        followUpSuggestions?: string[];
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Không thể nhận phản hồi từ trợ lý AI.');
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Hiện chưa có dữ liệu xác thực cho câu hỏi này.',
        citations: data.citations || [],
        followUpSuggestions: data.followUpSuggestions || [],
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errText =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối tới HOA LƯ AI lúc này. Vui lòng thử lại sau.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errText,
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && queuedPrompt && !isLoading) {
      const prompt = queuedPrompt;
      onConsumeQueuedPrompt();
      void sendMessage(prompt);
    }
  }, [isOpen, queuedPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Fallback ignored silently if clipboard blocked
    }
  };

  const handleClearHistory = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
  };

  return (
    <>
      {/* Floating bottom-right launcher */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => onToggle(true)}
          aria-label="Mở Trợ lý du lịch HOA LƯ AI"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full bg-[#2C1D14] text-[#FAF6EE] border border-[#D4AF37]/60 shadow-xl hover:bg-[#3B271B] transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B261D]"
        >
          <HoaLuAvatar size="sm" />
          <div className="text-left">
            <div className="text-xs font-semibold tracking-wide text-[#F6DF96] leading-tight">
              HOA LƯ AI
            </div>
            <div className="text-[11px] text-[#DFD3C1] leading-tight">
              Trợ lý du lịch
            </div>
          </div>
          <MessageSquareText className="w-4 h-4 text-[#D4AF37] ml-0.5" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <aside
          aria-label="Cửa sổ trò chuyện HOA LƯ AI"
          className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 z-50 sm:w-[430px] h-[min(84vh,640px)] flex flex-col bg-[#FCF9F3] border border-[#D9CCB4] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#2C1D14] text-[#FAF6EE] flex items-center justify-between gap-3 border-b border-[#4A3222] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <HoaLuAvatar />
              <div className="min-w-0">
                <h2 className="font-serif text-sm sm:text-base font-semibold text-[#F6DF96] truncate">
                  HOA LƯ AI – TRỢ LÝ DU LỊCH
                </h2>
                <p className="text-[11px] text-[#D7C9B6] truncate">
                  Tra cứu trực tiếp từ Cơ sở tri thức Phố cổ Hoa Lư
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearHistory}
                title="Xóa lịch sử trò chuyện"
                aria-label="Xóa lịch sử trò chuyện"
                className="p-2 text-[#D7C9B6] hover:text-[#FAF6EE] hover:bg-[#3E2A1E] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToggle(false)}
                title="Đóng cửa sổ"
                aria-label="Đóng cửa sổ"
                className="p-2 text-[#D7C9B6] hover:text-[#FAF6EE] hover:bg-[#3E2A1E] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FAF6EE]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex items-start gap-2.5 max-w-[92%] ${
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {!isUser && <HoaLuAvatar size="sm" />}

                    <div
                      className={`rounded-xl px-3.5 py-2.5 ${
                        isUser
                          ? 'bg-[#8B261D] text-[#FAF6EE]'
                          : msg.isError
                            ? 'bg-[#FDF1EF] border border-[#E5B8B2] text-[#7A2018]'
                            : 'bg-[#FFFFFF] border border-[#E4D9C6] text-[#2C1D14]'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      ) : msg.isError ? (
                        <div className="flex items-start gap-2 text-[13px] leading-relaxed">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#8B261D]" />
                          <span>{msg.content}</span>
                        </div>
                      ) : (
                        <>
                          <MarkdownRenderer content={msg.content} compact />

                          {/* Citations + Copy Action */}
                          <div className="mt-2.5 pt-2 border-t border-[#EFE7D8] flex items-center justify-between gap-2">
                            <div className="text-[11px] text-[#7D6650] truncate">
                              {msg.citations && msg.citations.length > 0
                                ? `Nguồn: ${msg.citations.slice(0, 2).join(' · ')}`
                                : 'Cơ sở tri thức Hoa Lư'}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleCopy(msg.id, msg.content)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#6C523D] hover:text-[#8B261D] transition-colors shrink-0 cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  <span className="text-emerald-700">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Follow-up suggestions */}
                  {!isUser &&
                    !msg.isError &&
                    msg.followUpSuggestions &&
                    msg.followUpSuggestions.length > 0 && (
                      <div className="mt-2 pl-9 flex flex-col items-start gap-1.5 w-full">
                        {msg.followUpSuggestions.map((sugg, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={isLoading}
                            onClick={() => void sendMessage(sugg)}
                            className="text-left text-xs px-3 py-1.5 rounded-lg border border-[#DFD2BC] bg-[#F5EFE4] hover:bg-[#ECE1CE] hover:border-[#C2A476] text-[#4A3222] transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {sugg}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}

            {/* Thinking state */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <HoaLuAvatar size="sm" />
                <div className="bg-[#FFFFFF] border border-[#E4D9C6] rounded-xl px-4 py-3 text-xs text-[#6C523D] flex items-center gap-2">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-bounce" />
                  </span>
                  <span>Đang tra cứu tài liệu và phản hồi...</span>
                </div>
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Input composer */}
          <div className="p-3 bg-[#FCF9F3] border-t border-[#E4D9C6] shrink-0">
            <div className="flex items-end gap-2 bg-[#FFFFFF] border border-[#D8CBB4] focus-within:border-[#8B261D] rounded-xl p-2 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Đặt câu hỏi về Phố cổ Hoa Lư..."
                maxLength={1500}
                className="flex-1 resize-none bg-transparent text-sm text-[#2C1D14] placeholder:text-[#9A856D] focus:outline-none max-h-28 px-1.5 py-1"
              />
              <button
                type="button"
                disabled={isLoading || input.trim().length === 0}
                onClick={() => void sendMessage(input)}
                aria-label="Gửi câu hỏi"
                className="p-2.5 rounded-lg bg-[#8B261D] text-[#FAF6EE] hover:bg-[#731E17] disabled:bg-[#C9B9A6] transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-[#8A735B] text-center">
              Nhấn Enter để gửi · Trợ lý chỉ cung cấp thông tin từ tài liệu xác thực
            </p>
          </div>
        </aside>
      )}
    </>
  );
};
