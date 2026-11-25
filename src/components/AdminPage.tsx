import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AiConfig,
  Article,
  ChatLog,
  FaqItem,
  GalleryItem,
  KnowledgeDoc,
} from '../types';
import { ImageWithFallback } from './ImageWithFallback';

interface AdminPageProps {
  adminToken: string | null;
  onSetAdminToken: (token: string | null) => void;
  onRefreshPublicContent: () => Promise<void>;
}

type AdminTab = 'articles' | 'gallery' | 'knowledge' | 'ai' | 'faqs';

const AVAILABLE_IMAGES = [
  { label: 'Hồ Kỳ Lân & Tháp Tứ Ân', path: '/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg' },
  { label: 'Dãy nhà gỗ & đèn lồng', path: '/src/assets/images/pho_co_wooden_houses_1795618580199.jpg' },
  { label: 'Thủy đình & Hoa đăng', path: '/src/assets/images/thuy_dinh_performance_1795618580818.jpg' },
  { label: 'Ẩm thực Ninh Bình', path: '/src/assets/images/am_thuc_ninh_binh_1795618581115.jpg' },
  { label: 'Làng nghề & Cổ phục', path: '/src/assets/images/lang_nghe_co_phuc_1795618583047.jpg' },
  { label: 'Danh thắng Tràng An – Cố đô', path: '/src/assets/images/trang_an_co_do_1795618582029.jpg' },
];

export const AdminPage: React.FC<AdminPageProps> = ({
  adminToken,
  onSetAdminToken,
  onRefreshPublicContent,
}) => {
  const [authStatus, setAuthStatus] = useState<{
    needsSetup: boolean;
    hasEnvPasscode: boolean;
  } | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('knowledge');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Dashboard data
  const [articles, setArticles] = useState<Article[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);

  // Article form state
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState('Kiến trúc');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artImage, setArtImage] = useState(AVAILABLE_IMAGES[0].path);

  // Gallery form state
  const [galTitle, setGalTitle] = useState('');
  const [galCategory, setGalCategory] = useState('Kiến trúc');
  const [galCaption, setGalCaption] = useState('');
  const [galImage, setGalImage] = useState(AVAILABLE_IMAGES[0].path);

  // Knowledge upload & edit state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string>('');
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);
  const [docBusy, setDocBusy] = useState(false);

  // FAQ form state
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('Tổng quan');

  const notify = (type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then((data) => setAuthStatus(data))
      .catch(() => setAuthStatus({ needsSetup: false, hasEnvPasscode: false }));
  }, []);

  const loadDashboard = async (token: string) => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        onSetAdminToken(null);
        return;
      }
      const data = await res.json();
      setArticles(data.articles || []);
      setGallery(data.gallery || []);
      setFaqs(data.faqs || []);
      setDocs(data.docs || []);
      setAiConfig(data.aiConfig || null);
      setChatLogs(data.chatLogs || []);
    } catch {
      notify('err', 'Không thể tải dữ liệu quản trị.');
    }
  };

  useEffect(() => {
    if (adminToken) {
      void loadDashboard(adminToken);
    }
  }, [adminToken]);

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (passwordInput.trim().length < 6) {
      setAuthError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể thiết lập mật khẩu.');
      onSetAdminToken(data.token);
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Lỗi thiết lập.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại.');
      onSetAdminToken(data.token);
      setPasswordInput('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setAuthLoading(false);
    }
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  // ---------------- ARTICLES HANDLERS ----------------
  const saveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const url = editingArticleId
      ? `/api/admin/articles/${editingArticleId}`
      : '/api/admin/articles';
    const method = editingArticleId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify({
        title: artTitle,
        category: artCategory,
        summary: artSummary,
        content: artContent,
        image_url: artImage,
        is_featured: 1,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('err', data.error || 'Lỗi lưu bài viết.');
      return;
    }
    notify('ok', editingArticleId ? 'Đã cập nhật bài viết.' : 'Đã thêm bài viết mới.');
    setEditingArticleId(null);
    setArtTitle('');
    setArtSummary('');
    setArtContent('');
    await loadDashboard(adminToken);
    await onRefreshPublicContent();
  };

  const deleteArticle = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/articles/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      notify('ok', 'Đã xóa bài viết.');
      await loadDashboard(adminToken);
      await onRefreshPublicContent();
    }
  };

  // ---------------- GALLERY HANDLERS ----------------
  const addGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: galTitle,
        category: galCategory,
        caption: galCaption,
        image_url: galImage,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('err', data.error || 'Lỗi thêm ảnh.');
      return;
    }
    notify('ok', 'Đã thêm ảnh vào thư viện.');
    setGalTitle('');
    setGalCaption('');
    await loadDashboard(adminToken);
    await onRefreshPublicContent();
  };

  const deleteGalleryItem = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/gallery/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      notify('ok', 'Đã xóa ảnh khỏi thư viện.');
      await loadDashboard(adminToken);
      await onRefreshPublicContent();
    }
  };

  // ---------------- KNOWLEDGE RAG HANDLERS ----------------
  const handleUploadKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !uploadFile) return;

    setDocBusy(true);
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      if (uploadTitle.trim()) form.append('title', uploadTitle.trim());
      if (replaceTargetId) form.append('replaceDocId', replaceTargetId);

      const res = await fetch('/api/admin/knowledge/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể xử lý tài liệu.');

      notify(
        'ok',
        `Đã nạp tài liệu (${data.chunkCount} phân đoạn RAG, ${data.embeddedCount} vector embedding).`
      );
      setUploadFile(null);
      setUploadTitle('');
      setReplaceTargetId('');
      await loadDashboard(adminToken);
      await onRefreshPublicContent();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Lỗi tải lên tài liệu.');
    } finally {
      setDocBusy(false);
    }
  };

  const handleSaveEditedDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingDoc) return;
    setDocBusy(true);
    try {
      const res = await fetch(`/api/admin/knowledge/${editingDoc.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          title: editingDoc.title,
          content: editingDoc.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật tài liệu.');

      notify(
        'ok',
        `Đã lưu và lập chỉ mục lại (${data.chunkCount} phân đoạn, ${data.embeddedCount} vector).`
      );
      setEditingDoc(null);
      await loadDashboard(adminToken);
      await onRefreshPublicContent();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Lỗi cập nhật.');
    } finally {
      setDocBusy(false);
    }
  };

  const handleReindexDoc = async (id: string) => {
    if (!adminToken) return;
    setDocBusy(true);
    try {
      const res = await fetch(`/api/admin/knowledge/${id}/reindex`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể lập chỉ mục.');
      notify('ok', `Đã tạo lại chỉ mục RAG: ${data.chunkCount} đoạn (${data.embeddedCount} vector).`);
      await loadDashboard(adminToken);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Lỗi reindex.');
    } finally {
      setDocBusy(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/knowledge/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      notify('err', data.error || 'Không thể xóa tài liệu.');
      return;
    }
    notify('ok', 'Đã xóa tài liệu kiến thức.');
    await loadDashboard(adminToken);
    await onRefreshPublicContent();
  };

  // ---------------- AI CONFIG & FAQS ----------------
  const saveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !aiConfig) return;
    const res = await fetch('/api/admin/ai-config', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(aiConfig),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('err', data.error || 'Lỗi lưu cấu hình HOA LƯ AI.');
      return;
    }
    setAiConfig(data.aiConfig);
    notify('ok', 'Đã cập nhật cấu hình Trợ lý HOA LƯ AI nội bộ.');
  };

  const clearLogs = async () => {
    if (!adminToken) return;
    const res = await fetch('/api/admin/chat-logs', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      setChatLogs([]);
      notify('ok', 'Đã xóa lịch sử nhật ký hội thoại.');
    }
  };

  const saveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    const url = editingFaqId ? `/api/admin/faqs/${editingFaqId}` : '/api/admin/faqs';
    const method = editingFaqId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify({
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      notify('err', data.error || 'Lỗi lưu FAQ.');
      return;
    }
    notify('ok', editingFaqId ? 'Đã cập nhật FAQ.' : 'Đã thêm FAQ mới.');
    setEditingFaqId(null);
    setFaqQuestion('');
    setFaqAnswer('');
    await loadDashboard(adminToken);
    await onRefreshPublicContent();
  };

  const deleteFaq = async (id: string) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/faqs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      notify('ok', 'Đã xóa FAQ.');
      await loadDashboard(adminToken);
      await onRefreshPublicContent();
    }
  };

  // ---------------- LOGIN / FIRST-RUN BOOTSTRAP GATE ----------------
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="bg-[#FCF9F3] border border-[#DFD2BC] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EFE6D5] border border-[#D8CBB4] flex items-center justify-center mx-auto text-[#8B261D]">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-[#2C1D14]">
              {authStatus?.needsSetup
                ? 'Thiết lập mật khẩu Quản trị lần đầu'
                : 'Đăng nhập Trang Quản trị'}
            </h1>
            <p className="text-xs text-[#5C3D28] leading-relaxed">
              {authStatus?.needsSetup
                ? 'Chưa có mật khẩu quản trị được thiết lập. Hãy tạo mật khẩu quản trị đầu tiên để bảo vệ khu vực cấu hình và dữ liệu RAG.'
                : 'Khu vực dành riêng cho quản trị viên để cập nhật bài viết, thư viện ảnh, tài liệu kiến thức RAG và cấu hình HOA LƯ AI.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-lg bg-[#FDF1EF] border border-[#E5B8B2] text-xs text-[#8B261D]">
              {authError}
            </div>
          )}

          {authStatus?.needsSetup ? (
            <form onSubmit={handleBootstrap} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Mật khẩu quản trị mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm focus:outline-none focus:border-[#8B261D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm focus:outline-none focus:border-[#8B261D]"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold transition-colors cursor-pointer"
              >
                {authLoading ? 'Đang thiết lập...' : 'Lưu mật khẩu & Vào quản trị'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Mật khẩu quản trị
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu quản trị..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm focus:outline-none focus:border-[#8B261D]"
                />
              </div>
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-lg bg-[#2C1D14] hover:bg-[#3F2A1D] text-[#FAF6EE] text-sm font-semibold transition-colors cursor-pointer"
              >
                {authLoading ? 'Đang xác thực...' : 'Đăng nhập'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATED ADMIN DASHBOARD ----------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DED1BA]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8B261D]">
            Hệ thống quản trị nội dung &amp; RAG
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#2C1D14]">
            Quản trị Website Phố cổ Hoa Lư
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onSetAdminToken(null)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D8CBB4] text-xs font-medium text-[#4A3222] hover:bg-[#EFE6D5] transition-colors self-start cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {statusMsg && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2 ${
            statusMsg.type === 'ok'
              ? 'bg-[#EEF6F0] border-[#B7D8C0] text-[#1D5B2E]'
              : 'bg-[#FDF1EF] border-[#E5B8B2] text-[#8B261D]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#EFE6D5] border border-[#DED1BA] rounded-xl w-fit">
        {[
          { id: 'knowledge', label: 'Tài liệu RAG AI', icon: Database },
          { id: 'articles', label: 'Bài viết & Điểm đến', icon: FileText },
          { id: 'gallery', label: 'Thư viện ảnh', icon: ImageIcon },
          { id: 'faqs', label: 'Câu hỏi thường gặp', icon: HelpCircle },
          { id: 'ai', label: 'Cấu hình AI nội bộ & Nhật ký', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#2C1D14] text-[#FAF6EE]'
                  : 'text-[#5C3D28] hover:text-[#2C1D14]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KNOWLEDGE BASE & RAG */}
      {activeTab === 'knowledge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <form
              onSubmit={handleUploadKnowledge}
              className="p-6 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-4"
            >
              <div className="flex items-center gap-2 font-serif text-xl font-semibold text-[#2C1D14]">
                <Upload className="w-5 h-5 text-[#8B261D]" />
                <span>Tải lên / Thay thế tài liệu RAG</span>
              </div>
              <p className="text-xs text-[#5C3D28] leading-relaxed">
                Hỗ trợ tệp <strong>TXT, Markdown (.md), PDF, DOCX</strong>. Hệ thống tự động trích
                xuất văn bản, chia đoạn và tạo vector embedding cho HOA LƯ AI mà không cần sửa mã
                nguồn.
              </p>

              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Hành động
                </label>
                <select
                  value={replaceTargetId}
                  onChange={(e) => setReplaceTargetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
                >
                  <option value="">Thêm mới làm tài liệu kiến thức bổ sung</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      Thay thế tài liệu: {d.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Tiêu đề hiển thị (tùy chọn)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ví dụ: Cập nhật lịch biểu diễn tháng 12"
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Chọn tệp (.txt, .md, .pdf, .docx)
                </label>
                <input
                  type="file"
                  required
                  accept=".txt,.md,.pdf,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-[#4A3222] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-[#D8CBB4] file:bg-[#F5EFE4] file:text-xs file:font-medium hover:file:bg-[#EAE0CE]"
                />
              </div>

              <button
                type="submit"
                disabled={docBusy || !uploadFile}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{docBusy ? 'Đang xử lý & lập chỉ mục...' : 'Nạp vào Cơ sở tri thức'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
              Danh sách tài liệu đang hoạt động ({docs.length})
            </h2>

            {docs.map((doc) => (
              <div
                key={doc.id}
                className="p-5 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#8B261D] font-medium">
                      {doc.is_primary === 1 ? 'Tài liệu nền tảng chính' : 'Tài liệu bổ sung'} ·{' '}
                      {doc.filename}
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[#2C1D14]">{doc.title}</h3>
                    <div className="text-xs text-[#7D6650] tabular-nums mt-0.5">
                      {doc.chunk_count ?? 0} phân đoạn RAG · {doc.embedded_count ?? 0} vector
                      embedding · Cập nhật {new Date(doc.updated_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={docBusy}
                      onClick={() => void handleReindexDoc(doc.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D8CBB4] text-xs font-medium text-[#4A3222] hover:bg-[#EFE6D5] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Tạo lại vector</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDoc(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D8CBB4] text-xs font-medium text-[#2C1D14] hover:bg-[#EFE6D5] cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Sửa nội dung</span>
                    </button>
                    {doc.is_primary !== 1 && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteDoc(doc.id)}
                        aria-label={`Xóa tài liệu ${doc.title}`}
                        className="p-1.5 rounded-lg text-[#8B261D] hover:bg-[#FDF1EF] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {editingDoc && (
              <form
                onSubmit={handleSaveEditedDoc}
                className="p-6 bg-[#F5EFE4] border border-[#C2A476] rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-semibold text-[#2C1D14]">
                    Chỉnh sửa trực tiếp: {editingDoc.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingDoc(null)}
                    className="text-xs text-[#5C3D28] hover:underline cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm font-medium"
                />
                <textarea
                  rows={14}
                  required
                  value={editingDoc.content}
                  onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-xs font-mono leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={docBusy}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{docBusy ? 'Đang lưu & reindex...' : 'Lưu & Cập nhật RAG'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ARTICLES */}
      {activeTab === 'articles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={saveArticle}
            className="lg:col-span-5 p-6 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-4 h-fit"
          >
            <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
              {editingArticleId ? 'Chỉnh sửa bài viết' : 'Thêm bài viết mới'}
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Tiêu đề</label>
              <input
                type="text"
                required
                value={artTitle}
                onChange={(e) => setArtTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">Danh mục</label>
                <select
                  value={artCategory}
                  onChange={(e) => setArtCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
                >
                  <option value="Kiến trúc">Kiến trúc</option>
                  <option value="Trải nghiệm">Trải nghiệm</option>
                  <option value="Ẩm thực">Ẩm thực</option>
                  <option value="Làng nghề & Kết hợp">Làng nghề &amp; Kết hợp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">Hình ảnh</label>
                <select
                  value={artImage}
                  onChange={(e) => setArtImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
                >
                  {AVAILABLE_IMAGES.map((img) => (
                    <option key={img.path} value={img.path}>
                      {img.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Tóm tắt</label>
              <textarea
                rows={2}
                required
                value={artSummary}
                onChange={(e) => setArtSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">
                Nội dung chi tiết (Markdown)
              </label>
              <textarea
                rows={6}
                required
                value={artContent}
                onChange={(e) => setArtContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{editingArticleId ? 'Cập nhật' : 'Thêm bài viết'}</span>
              </button>
              {editingArticleId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingArticleId(null);
                    setArtTitle('');
                    setArtSummary('');
                    setArtContent('');
                  }}
                  className="text-xs text-[#5C3D28] hover:underline cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {articles.map((art) => (
              <div
                key={art.id}
                className="p-4 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-[#8B261D] font-medium">{art.category}</div>
                  <h3 className="font-serif text-lg font-semibold text-[#2C1D14]">{art.title}</h3>
                  <p className="text-xs text-[#5C3D28] line-clamp-2">{art.summary}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingArticleId(art.id);
                      setArtTitle(art.title);
                      setArtCategory(art.category);
                      setArtSummary(art.summary);
                      setArtContent(art.content);
                      setArtImage(art.image_url);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#D8CBB4] text-xs font-medium hover:bg-[#EFE6D5] cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteArticle(art.id)}
                    aria-label={`Xóa bài ${art.title}`}
                    className="p-1.5 rounded-lg text-[#8B261D] hover:bg-[#FDF1EF] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GALLERY */}
      {activeTab === 'gallery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={addGalleryItem}
            className="lg:col-span-5 p-6 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-4 h-fit"
          >
            <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
              Thêm hình ảnh vào thư viện
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Tiêu đề ảnh</label>
              <input
                type="text"
                required
                value={galTitle}
                onChange={(e) => setGalTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Danh mục</label>
              <select
                value={galCategory}
                onChange={(e) => setGalCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              >
                <option value="Không gian hồ">Không gian hồ</option>
                <option value="Kiến trúc">Kiến trúc</option>
                <option value="Trải nghiệm">Trải nghiệm</option>
                <option value="Ẩm thực">Ẩm thực</option>
                <option value="Làng nghề">Làng nghề</option>
                <option value="Vùng phụ cận">Vùng phụ cận</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">
                Chọn ảnh từ thư viện lưu trữ
              </label>
              <select
                value={galImage}
                onChange={(e) => setGalImage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              >
                {AVAILABLE_IMAGES.map((img) => (
                  <option key={img.path} value={img.path}>
                    {img.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Chú thích</label>
              <textarea
                rows={3}
                value={galCaption}
                onChange={(e) => setGalCaption(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm ảnh</span>
            </button>
          </form>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {gallery.map((g) => (
              <div
                key={g.id}
                className="bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#E5D8C1]">
                  <ImageWithFallback
                    src={g.image_url}
                    alt={g.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3.5 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] text-[#8B261D] font-medium">{g.category}</div>
                    <div className="font-serif text-sm font-semibold text-[#2C1D14]">{g.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteGalleryItem(g.id)}
                    aria-label={`Xóa ảnh ${g.title}`}
                    className="p-1.5 rounded-lg text-[#8B261D] hover:bg-[#FDF1EF] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FAQS */}
      {activeTab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={saveFaq}
            className="lg:col-span-5 p-6 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-4 h-fit"
          >
            <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
              {editingFaqId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi thường gặp'}
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Danh mục</label>
              <input
                type="text"
                value={faqCategory}
                onChange={(e) => setFaqCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Câu hỏi</label>
              <input
                type="text"
                required
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">Câu trả lời</label>
              <textarea
                rows={4}
                required
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingFaqId ? 'Lưu FAQ' : 'Thêm FAQ'}</span>
              </button>
              {editingFaqId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFaqId(null);
                    setFaqQuestion('');
                    setFaqAnswer('');
                  }}
                  className="text-xs text-[#5C3D28] hover:underline cursor-pointer"
                >
                  Hủy
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="p-4 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs text-[#8B261D] font-medium">{faq.category}</div>
                  <h3 className="text-sm font-semibold text-[#2C1D14]">{faq.question}</h3>
                  <p className="text-xs text-[#5C3D28] leading-relaxed">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFaqId(faq.id);
                      setFaqQuestion(faq.question);
                      setFaqAnswer(faq.answer);
                      setFaqCategory(faq.category);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-[#D8CBB4] text-xs font-medium hover:bg-[#EFE6D5] cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteFaq(faq.id)}
                    aria-label={`Xóa FAQ ${faq.question}`}
                    className="p-1.5 rounded-lg text-[#8B261D] hover:bg-[#FDF1EF] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: STANDALONE AI CONFIG & CHAT LOGS */}
      {activeTab === 'ai' && aiConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={saveAiConfig}
            className="lg:col-span-6 p-6 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-4 h-fit"
          >
            <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
              Cấu hình HOA LƯ AI (RAG &amp; NLU Độc lập)
            </h2>
            <p className="text-xs text-[#5C3D28] leading-relaxed">
              Trợ lý AI vận hành hoàn toàn độc lập trên máy chủ bằng vector ngữ nghĩa cục bộ và
              xử lý ngôn ngữ tiếng Việt, không phụ thuộc dịch vụ bên thứ ba.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Chế độ truy xuất RAG
                </label>
                <select
                  value={aiConfig.thinking_level === 'STRICT' ? 'STRICT' : 'HYBRID'}
                  onChange={(e) =>
                    setAiConfig({
                      ...aiConfig,
                      thinking_level: e.target.value,
                      model: e.target.value === 'STRICT' ? 'hoalu-rag-strict' : 'hoalu-rag-hybrid',
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm"
                >
                  <option value="HYBRID">Kết hợp Vector ngữ nghĩa + Từ khóa mờ</option>
                  <option value="STRICT">Ưu tiên khớp chính xác tài liệu</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A3222] mb-1">
                  Số đoạn RAG truy xuất (Top K)
                </label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={aiConfig.max_context_chunks}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, max_context_chunks: Number(e.target.value) || 6 })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4A3222] mb-1">
                Quy tắc vận hành &amp; Nguyên tắc trả lời (HOA LƯ AI)
              </label>
              <textarea
                rows={10}
                required
                value={aiConfig.system_instruction}
                onChange={(e) => setAiConfig({ ...aiConfig, system_instruction: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#FFFFFF] border border-[#D8CBB4] text-xs leading-relaxed"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#2C1D14] cursor-pointer">
              <input
                type="checkbox"
                checked={aiConfig.log_conversations === 1}
                onChange={(e) =>
                  setAiConfig({ ...aiConfig, log_conversations: e.target.checked ? 1 : 0 })
                }
                className="rounded border-[#D8CBB4]"
              />
              <span>Lưu lịch sử hội thoại để quản trị viên rà soát chất lượng</span>
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8B261D] hover:bg-[#731E17] text-[#FAF6EE] text-sm font-semibold cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu cấu hình HOA LƯ AI</span>
            </button>
          </form>

          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#8B261D]" />
                <h2 className="font-serif text-xl font-semibold text-[#2C1D14]">
                  Lịch sử hội thoại ({chatLogs.length})
                </h2>
              </div>
              {chatLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => void clearLogs()}
                  className="text-xs font-medium text-[#8B261D] hover:underline cursor-pointer"
                >
                  Xóa toàn bộ nhật ký
                </button>
              )}
            </div>

            {chatLogs.length === 0 ? (
              <div className="p-6 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl text-sm text-[#5C3D28]">
                Chưa có cuộc hội thoại nào được ghi nhận.
              </div>
            ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {chatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 bg-[#FCF9F3] border border-[#DFD2BC] rounded-xl space-y-2"
                  >
                    <div className="text-[11px] text-[#7D6650] tabular-nums">
                      {new Date(log.created_at).toLocaleString('vi-VN')} · Phiên {log.session_id}
                    </div>
                    <div className="text-xs font-semibold text-[#2C1D14]">
                      Khách: {log.user_message}
                    </div>
                    <div className="text-xs text-[#4A3222] line-clamp-4 whitespace-pre-wrap">
                      AI: {log.assistant_reply}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
