import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import multer from 'multer';
import path from 'node:path';
import {
  bootstrapAdminPassword,
  getAdminAuthStatus,
  issueAdminToken,
  requireAdmin,
  verifyAdminPassword,
} from './server/auth.ts';
import { db, initDatabase } from './server/db.ts';
import { generateHoaLuReply, type HistoryTurn } from './server/hoa_lu_ai.ts';
import {
  extractTextFromFile,
  indexKnowledgeDocument,
  seedPrimaryKnowledgeIfNeeded,
} from './server/rag.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Initialize SQLite & primary knowledge base
initDatabase();
seedPrimaryKnowledgeIfNeeded().catch((err) => {
  console.error('[Init] Failed to seed primary knowledge:', err);
});

const app = express();
app.set('trust proxy', 1);

// Basic security headers (no X-Frame-Options so AI Studio preview iframe works cleanly)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '2mb' }));

// Configure memory-based multer upload for RAG documents (TXT, MD, PDF, DOCX)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.txt', '.md', '.pdf', '.docx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ định dạng TXT, Markdown (.md), PDF hoặc DOCX.'));
    }
  },
});

// Simple sliding-window rate limiter for /api/chat
const chatRateWindow = new Map<string, number[]>();

function checkChatRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxPerMinute = 15;

  const timestamps = (chatRateWindow.get(ip) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxPerMinute) {
    const oldest = timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    chatRateWindow.set(ip, timestamps);
    return { allowed: false, retryAfterSec };
  }
  timestamps.push(now);
  chatRateWindow.set(ip, timestamps);
  return { allowed: true };
}

// ---------------- PUBLIC API ROUTES ----------------

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/content', (_req, res) => {
  const articles = db
    .prepare('SELECT * FROM articles ORDER BY section_order ASC, created_at DESC')
    .all();
  const gallery = db
    .prepare('SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at DESC')
    .all();
  const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all();
  res.json({ articles, gallery, faqs });
});

app.get('/api/knowledge/overview', (_req, res) => {
  const docs = db
    .prepare(
      'SELECT id, title, filename, mime_type, content, is_primary, created_at, updated_at FROM knowledge_docs ORDER BY is_primary DESC, created_at ASC'
    )
    .all();
  res.json({ docs });
});

app.post('/api/chat', async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rateCheck = checkChatRateLimit(clientIp);
  if (!rateCheck.allowed) {
    res.status(429).json({
      error: `Bạn gửi câu hỏi quá nhanh. Vui lòng thử lại sau ${rateCheck.retryAfterSec} giây.`,
    });
    return;
  }

  const body = req.body as {
    message?: unknown;
    history?: unknown;
    sessionId?: unknown;
  };

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    res.status(400).json({ error: 'Vui lòng nhập nội dung câu hỏi.' });
    return;
  }

  const message = body.message.trim();
  if (message.length > 1500) {
    res.status(400).json({ error: 'Câu hỏi quá dài (tối đa 1.500 ký tự).' });
    return;
  }

  const history: HistoryTurn[] = [];
  if (Array.isArray(body.history)) {
    for (const item of body.history.slice(-14)) {
      if (
        item &&
        typeof item === 'object' &&
        ('role' in item && (item.role === 'user' || item.role === 'assistant')) &&
        'content' in item &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
      ) {
        history.push({
          role: item.role,
          content: item.content.slice(0, 3000),
        });
      }
    }
  }

  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.trim().length > 0
      ? body.sessionId.trim()
      : 'visitor-session';

  try {
    const reply = await generateHoaLuReply({ message, history, sessionId });
    res.json(reply);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Lỗi không xác định từ hệ thống AI.';
    console.error('[Chat Error]', msg);
    res.status(500).json({
      error: 'Không thể xử lý câu hỏi lúc này. Vui lòng thử lại sau.',
    });
  }
});

// ---------------- ADMIN AUTH ROUTES ----------------

app.get('/api/admin/status', (_req, res) => {
  res.json(getAdminAuthStatus());
});

app.post('/api/admin/bootstrap', (req, res) => {
  const { password } = req.body as { password?: unknown };
  if (typeof password !== 'string') {
    res.status(400).json({ error: 'Vui lòng nhập mật khẩu hợp lệ.' });
    return;
  }

  const result = bootstrapAdminPassword(password);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }

  const session = issueAdminToken();
  res.json({ ok: true, ...session });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body as { password?: unknown };
  if (typeof password !== 'string' || !verifyAdminPassword(password)) {
    res.status(401).json({ error: 'Mật khẩu quản trị không chính xác.' });
    return;
  }

  const session = issueAdminToken();
  res.json({ ok: true, ...session });
});

// ---------------- PROTECTED ADMIN ROUTES ----------------

app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
  const articles = db
    .prepare('SELECT * FROM articles ORDER BY section_order ASC, created_at DESC')
    .all();
  const gallery = db
    .prepare('SELECT * FROM gallery_items ORDER BY sort_order ASC, created_at DESC')
    .all();
  const faqs = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC').all();
  const docs = db
    .prepare(`
      SELECT kd.*,
        (SELECT COUNT(*) FROM knowledge_chunks kc WHERE kc.doc_id = kd.id) as chunk_count,
        (SELECT COUNT(*) FROM knowledge_chunks kc WHERE kc.doc_id = kd.id AND kc.embedding IS NOT NULL) as embedded_count
      FROM knowledge_docs kd
      ORDER BY kd.is_primary DESC, kd.created_at DESC
    `)
    .all();
  const aiConfig = db.prepare('SELECT * FROM ai_config WHERE id = 1').get();
  const chatLogs = db
    .prepare('SELECT * FROM chat_logs ORDER BY id DESC LIMIT 100')
    .all();

  res.json({ articles, gallery, faqs, docs, aiConfig, chatLogs });
});

// Articles CRUD
app.post('/api/admin/articles', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : 'Kiến trúc';
  const summary = typeof b.summary === 'string' ? b.summary.trim() : '';
  const content = typeof b.content === 'string' ? b.content.trim() : '';
  const imageUrl =
    typeof b.image_url === 'string' && b.image_url.trim().startsWith('/')
      ? b.image_url.trim()
      : '/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg';
  const sectionOrder = Number(b.section_order) || 10;
  const isFeatured = b.is_featured ? 1 : 0;

  if (!title || !summary || !content) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ tiêu đề, tóm tắt và nội dung.' });
    return;
  }

  const id = `art-${crypto.randomUUID().slice(0, 8)}`;
  const slug = `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${id.slice(-4)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO articles (id, title, slug, category, summary, content, image_url, section_order, is_featured, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, slug, category, summary, content, imageUrl, sectionOrder, isFeatured, now, now);

  const created = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  res.status(201).json({ article: created });
});

app.put('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const b = req.body as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : '';
  const summary = typeof b.summary === 'string' ? b.summary.trim() : '';
  const content = typeof b.content === 'string' ? b.content.trim() : '';
  const imageUrl = typeof b.image_url === 'string' ? b.image_url.trim() : '';
  const sectionOrder = Number(b.section_order) || 0;
  const isFeatured = b.is_featured ? 1 : 0;

  if (!title || !summary || !content) {
    res.status(400).json({ error: 'Tiêu đề, tóm tắt và nội dung không được để trống.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM articles WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }

  db.prepare(`
    UPDATE articles
    SET title = ?, category = ?, summary = ?, content = ?, image_url = ?, section_order = ?, is_featured = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title,
    category || 'Kiến trúc',
    summary,
    content,
    imageUrl || '/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg',
    sectionOrder,
    isFeatured,
    new Date().toISOString(),
    id
  );

  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  res.json({ article: updated });
});

app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Không tìm thấy bài viết.' });
    return;
  }
  res.json({ ok: true });
});

// Gallery CRUD
app.post('/api/admin/gallery', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : 'Kiến trúc';
  const caption = typeof b.caption === 'string' ? b.caption.trim() : '';
  const imageUrl = typeof b.image_url === 'string' ? b.image_url.trim() : '';
  const sortOrder = Number(b.sort_order) || 10;

  if (!title || !imageUrl || (!imageUrl.startsWith('/') && !imageUrl.startsWith('https://'))) {
    res.status(400).json({ error: 'Vui lòng cung cấp tiêu đề và đường dẫn ảnh hợp lệ.' });
    return;
  }

  const id = `gal-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO gallery_items (id, title, category, caption, image_url, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, category, caption, imageUrl, sortOrder, now);

  const created = db.prepare('SELECT * FROM gallery_items WHERE id = ?').get(id);
  res.status(201).json({ item: created });
});

app.delete('/api/admin/gallery/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM gallery_items WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Không tìm thấy hình ảnh.' });
    return;
  }
  res.json({ ok: true });
});

// FAQs CRUD
app.post('/api/admin/faqs', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const question = typeof b.question === 'string' ? b.question.trim() : '';
  const answer = typeof b.answer === 'string' ? b.answer.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : 'Tổng quan';
  const sortOrder = Number(b.sort_order) || 10;

  if (!question || !answer) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ câu hỏi và câu trả lời.' });
    return;
  }

  const id = `faq-${crypto.randomUUID().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO faqs (id, question, answer, category, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, question, answer, category, sortOrder);

  const created = db.prepare('SELECT * FROM faqs WHERE id = ?').get(id);
  res.status(201).json({ faq: created });
});

app.put('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const question = typeof b.question === 'string' ? b.question.trim() : '';
  const answer = typeof b.answer === 'string' ? b.answer.trim() : '';
  const category = typeof b.category === 'string' ? b.category.trim() : 'Tổng quan';
  const sortOrder = Number(b.sort_order) || 0;

  if (!question || !answer) {
    res.status(400).json({ error: 'Câu hỏi và câu trả lời không được để trống.' });
    return;
  }

  const result = db
    .prepare('UPDATE faqs SET question = ?, answer = ?, category = ?, sort_order = ? WHERE id = ?')
    .run(question, answer, category, sortOrder, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Không tìm thấy FAQ.' });
    return;
  }
  const updated = db.prepare('SELECT * FROM faqs WHERE id = ?').get(req.params.id);
  res.json({ faq: updated });
});

app.delete('/api/admin/faqs/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Không tìm thấy FAQ.' });
    return;
  }
  res.json({ ok: true });
});

// RAG Knowledge Documents Upload, Replace, Reindex, Delete
app.post('/api/admin/knowledge/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const titleInput = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const replaceDocId = typeof req.body?.replaceDocId === 'string' ? req.body.replaceDocId.trim() : '';

    if (!file) {
      res.status(400).json({ error: 'Vui lòng chọn tệp TXT, MD, PDF hoặc DOCX.' });
      return;
    }

    const extracted = await extractTextFromFile(file.buffer, file.originalname, file.mimetype);
    if (!extracted || extracted.trim().length < 20) {
      res.status(400).json({ error: 'Tài liệu không chứa đủ văn bản có thể đọc được.' });
      return;
    }

    const now = new Date().toISOString();
    const safeFilename = path.basename(file.originalname);
    const title = titleInput || safeFilename.replace(/\.[^.]+$/, '');

    if (replaceDocId) {
      const existing = db.prepare('SELECT id FROM knowledge_docs WHERE id = ?').get(replaceDocId);
      if (!existing) {
        res.status(404).json({ error: 'Không tìm thấy tài liệu cần thay thế.' });
        return;
      }
      db.prepare(`
        UPDATE knowledge_docs
        SET title = ?, filename = ?, mime_type = ?, content = ?, updated_at = ?
        WHERE id = ?
      `).run(title, safeFilename, file.mimetype, extracted, now, replaceDocId);

      const indexStats = await indexKnowledgeDocument(replaceDocId, title, extracted);
      const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(replaceDocId);
      res.json({ doc, ...indexStats });
      return;
    }

    const docId = `doc-${crypto.randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO knowledge_docs (id, title, filename, mime_type, content, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(docId, title, safeFilename, file.mimetype, extracted, now, now);

    const indexStats = await indexKnowledgeDocument(docId, title, extracted);
    const doc = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(docId);
    res.status(201).json({ doc, ...indexStats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi xử lý tài liệu.';
    res.status(400).json({ error: message });
  }
});

app.put('/api/admin/knowledge/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body as { title?: unknown; content?: unknown };

  if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
    res.status(400).json({ error: 'Tiêu đề và nội dung tài liệu không được để trống.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM knowledge_docs WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy tài liệu.' });
    return;
  }

  db.prepare('UPDATE knowledge_docs SET title = ?, content = ?, updated_at = ? WHERE id = ?').run(
    title.trim(),
    content.trim(),
    new Date().toISOString(),
    id
  );

  const indexStats = await indexKnowledgeDocument(id, title.trim(), content.trim());
  const updated = db.prepare('SELECT * FROM knowledge_docs WHERE id = ?').get(id);
  res.json({ doc: updated, ...indexStats });
});

app.post('/api/admin/knowledge/:id/reindex', requireAdmin, async (req, res) => {
  const row = db
    .prepare('SELECT id, title, content FROM knowledge_docs WHERE id = ?')
    .get(req.params.id) as { id: string; title: string; content: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Không tìm thấy tài liệu.' });
    return;
  }

  const stats = await indexKnowledgeDocument(row.id, row.title, row.content);
  res.json({ ok: true, ...stats });
});

app.delete('/api/admin/knowledge/:id', requireAdmin, (req, res) => {
  const row = db
    .prepare('SELECT id, is_primary FROM knowledge_docs WHERE id = ?')
    .get(req.params.id) as { id: string; is_primary: number } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Không tìm thấy tài liệu.' });
    return;
  }
  if (row.is_primary === 1) {
    res.status(400).json({ error: 'Không thể xóa tài liệu nền tảng chính. Bạn có thể cập nhật hoặc thay thế nội dung tài liệu này.' });
    return;
  }

  db.prepare('DELETE FROM knowledge_docs WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

// AI Config & Conversation Logs
app.put('/api/admin/ai-config', requireAdmin, (req, res) => {
  const b = req.body as Record<string, unknown>;
  const model =
    b.model === 'hoalu-rag-strict' || b.model === 'hoalu-rag-hybrid'
      ? b.model
      : 'hoalu-rag-hybrid';
  const systemInstruction =
    typeof b.system_instruction === 'string' && b.system_instruction.trim().length > 0
      ? b.system_instruction.trim()
      : '';
  const thinkingLevel =
    b.thinking_level === 'STRICT' || b.thinking_level === 'HYBRID'
      ? b.thinking_level
      : 'HYBRID';
  const maxChunks = Math.min(12, Math.max(2, Number(b.max_context_chunks) || 6));
  const logConversations = b.log_conversations ? 1 : 0;

  if (!systemInstruction) {
    res.status(400).json({ error: 'Quy tắc vận hành (System Instruction) không được để trống.' });
    return;
  }

  db.prepare(`
    UPDATE ai_config
    SET model = ?, system_instruction = ?, thinking_level = ?, max_context_chunks = ?, log_conversations = ?, updated_at = ?
    WHERE id = 1
  `).run(
    model,
    systemInstruction,
    thinkingLevel,
    maxChunks,
    logConversations,
    new Date().toISOString()
  );

  const updated = db.prepare('SELECT * FROM ai_config WHERE id = 1').get();
  res.json({ aiConfig: updated });
});

app.delete('/api/admin/chat-logs', requireAdmin, (_req, res) => {
  db.prepare('DELETE FROM chat_logs').run();
  res.json({ ok: true });
});

// ---------------- STATIC & VITE MIDDLEWARE ----------------

async function startServer(): Promise<void> {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const publicDir = path.resolve(process.cwd(), 'public');
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pho Co Hoa Lu server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
