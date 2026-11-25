import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import fs from 'node:fs';
import path from 'node:path';
import { db, PRIMARY_KNOWLEDGE_PATH } from './db.ts';

export interface TextChunk {
  sectionTitle: string;
  chunkIndex: number;
  content: string;
}

const VECTOR_DIM = 256;

export function normalizeVietnamese(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

const ABBREVIATION_MAP: Record<string, string> = {
  pchl: 'pho co hoa lu',
  cdhl: 'co do hoa lu',
  nb: 'ninh binh',
  hkl: 'ho ky lan',
  tta: 'thap tu an',
  ahcl: 'anh hung co lau',
  ta: 'trang an',
  hm: 'hang mua',
  tc: 'tam coc',
  gv: 'gia ve',
  gmc: 'gio mo cua',
  dc: 'dia chi',
  ko: 'khong',
  k: 'khong',
  bn: 'bao nhieu',
  ntn: 'nhu the nao',
  tn: 'the nao',
  tg: 'thoi gian',
  lt: 'lich trinh',
  dd: 'dia diem',
  an: 'am thuc mon an',
  ln: 'lang nghe',
};

const SEMANTIC_CONCEPTS: Array<{ concept: string; keywords: string[] }> = [
  {
    concept: 'concept_distinction',
    keywords: ['phan biet', 'khac nhau', 'khac gi', 'co phai', 'the ky x', 'xay dung moi', 'truong yen', 'co do hoa lu'],
  },
  {
    concept: 'concept_location',
    keywords: ['vi tri', 'o dau', 'dia chi', 'duong di', 'ban do', 'chi duong', 'trung tam', 'ho ky lan', 'nui ky lan'],
  },
  {
    concept: 'concept_architecture',
    keywords: ['kien truc', 'cong trinh', 'thap tu an', 'nha go', 'mai ngoi', 'den long', 'cau', 'thuy dinh', 'chua'],
  },
  {
    concept: 'concept_experience',
    keywords: ['hoat dong', 'trai nghiem', 'choi gi', 'co phuc', 'cheo thuyen', 'hoa dang', 'tro choi', 'chup anh', 'di bo'],
  },
  {
    concept: 'concept_show',
    keywords: ['anh hung co lau', 'thuc canh', 'bieu dien', 'suat dien', 'san khau', 'dinh bo linh', '12 su quan', 'dai co viet'],
  },
  {
    concept: 'concept_culinary',
    keywords: ['am thuc', 'an gi', 'dac san', 'com chay', 'de nui', 'banh khoai tep', 'banh da', 'banh mat', 'tra', 'ca phe', 'quan an'],
  },
  {
    concept: 'concept_craft',
    keywords: ['lang nghe', 'thu cong', 'ninh van', 'bo bat', 'van lam', 'y yen', 'dong ho', 'gom', 'da my nghe', 'theu ren', 'tranh dan gian'],
  },
  {
    concept: 'concept_timing',
    keywords: ['gio mo cua', 'may gio', 'thoi gian', 'khung gio', 'buoi sang', 'buoi chieu', 'buoi toi', 'len den', 'hoang hon'],
  },
  {
    concept: 'concept_pricing',
    keywords: ['gia ve', 'chi phi', 'mat ve', 'mien phi', 'bao nhieu tien', 'phi gui xe', 'thue do', 'hoa don', 'bang gia'],
  },
  {
    concept: 'concept_transport',
    keywords: ['phuong tien', 'di bang gi', 'xe may', 'o to', 'taxi', 'xe dap', 'bai gui xe', 'gui xe', 'ga ninh binh'],
  },
  {
    concept: 'concept_itinerary',
    keywords: ['lich trinh', 'ke hoach', 'goi y', 'mot buoi', 'chieu toi', 'di may nguoi'],
  },
  {
    concept: 'concept_nearby',
    keywords: ['ket hop', 'gan day', 'lan can', 'trang an', 'hang mua', 'tam coc', 'bich dong', 'khoang cach'],
  },
  {
    concept: 'concept_verification',
    keywords: ['kiem chung', 'nguon', 'chinh thuc', 'so du lich', 'cong thong tin', 'chu dau tu'],
  },
];

export function expandAbbreviations(query: string): string {
  const norm = normalizeVietnamese(query);
  let expanded = norm;
  for (const [abbr, full] of Object.entries(ABBREVIATION_MAP)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    expanded = expanded.replace(regex, full);
  }
  return expanded;
}

function fnv1aHash(str: string, seed = 2166136261): number {
  let hash = seed;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addFeature(vec: Float64Array, feature: string, weight: number): void {
  const h1 = fnv1aHash(feature, 2166136261);
  const h2 = fnv1aHash(feature, 16777619);
  const idx = h1 % VECTOR_DIM;
  const sign = (h2 & 1) === 0 ? 1 : -1;
  vec[idx] += sign * weight;
}

/**
 * Deterministic standalone local semantic embedding (256-dimensional)
 * combining Vietnamese normalized unigrams, bigrams, character 3-grams,
 * and domain concept subspaces. Requires zero external APIs.
 */
export function computeLocalEmbedding(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIM);
  const expanded = expandAbbreviations(text);
  const tokens = expanded.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    addFeature(vec, `u:${tok}`, 1.0);

    // Bigram features
    if (i < tokens.length - 1) {
      addFeature(vec, `b:${tok}_${tokens[i + 1]}`, 1.35);
    }

    // Character 3-grams for typo & stem resilience
    if (tok.length >= 3) {
      for (let c = 0; c <= tok.length - 3; c++) {
        addFeature(vec, `c:${tok.slice(c, c + 3)}`, 0.35);
      }
    }
  }

  // Domain concept subspace projection
  for (const group of SEMANTIC_CONCEPTS) {
    let matches = 0;
    for (const kw of group.keywords) {
      if (expanded.includes(kw)) {
        matches++;
      }
    }
    if (matches > 0) {
      addFeature(vec, group.concept, 1.8 * Math.min(2.5, matches));
    }
  }

  // L2 normalize
  let normSq = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq);
  const out: number[] = new Array(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i++) {
    out[i] = norm === 0 ? 0 : Number((vec[i] / norm).toFixed(6));
  }
  return out;
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  if (Math.abs(alen - blen) > 2) return 99;

  const dp: number[] = Array.from({ length: blen + 1 }, (_, j) => j);
  for (let i = 1; i <= alen; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= blen; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[blen];
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.txt' || ext === '.md' || mimeType.startsWith('text/')) {
    return buffer.toString('utf8');
  }

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return (result.text || '').trim();
    } finally {
      await parser.destroy();
    }
  }

  if (
    ext === '.docx' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || '').trim();
  }

  throw new Error('Định dạng tài liệu không được hỗ trợ. Chỉ chấp nhận TXT, MD, PDF, DOCX.');
}

export function chunkDocumentContent(rawContent: string, docTitle: string): TextChunk[] {
  const lines = rawContent.replace(/\r\n/g, '\n').split('\n');
  const sections: Array<{ title: string; body: string }> = [];

  let currentH2 = docTitle;
  let currentH3 = '';
  let bufferLines: string[] = [];

  const flushSection = () => {
    const body = bufferLines.join('\n').trim();
    if (body.length > 0) {
      const sectionLabel = currentH3 ? `${currentH2} — ${currentH3}` : currentH2;
      sections.push({ title: sectionLabel, body });
    }
    bufferLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      flushSection();
      currentH2 = trimmed.replace(/^##\s+/, '').trim();
      currentH3 = '';
    } else if (trimmed.startsWith('### ')) {
      flushSection();
      currentH3 = trimmed.replace(/^###\s+/, '').trim();
    } else if (trimmed === '---' || trimmed === 'HẾT TÀI LIỆU') {
      continue;
    } else {
      bufferLines.push(line);
    }
  }
  flushSection();

  const chunks: TextChunk[] = [];
  let idx = 0;
  const MAX_CHUNK_CHARS = 850;

  for (const section of sections) {
    if (section.body.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        sectionTitle: section.title,
        chunkIndex: idx++,
        content: `[${section.title}]\n${section.body}`,
      });
      continue;
    }

    const paragraphs = section.body.split(/\n{2,}/);
    let current = '';

    for (const para of paragraphs) {
      const candidate = current ? `${current}\n\n${para}` : para;
      if (candidate.length > MAX_CHUNK_CHARS && current.length > 0) {
        chunks.push({
          sectionTitle: section.title,
          chunkIndex: idx++,
          content: `[${section.title}]\n${current}`,
        });
        current = para;
      } else {
        current = candidate;
      }
    }

    if (current.trim().length > 0) {
      chunks.push({
        sectionTitle: section.title,
        chunkIndex: idx++,
        content: `[${section.title}]\n${current.trim()}`,
      });
    }
  }

  return chunks;
}

export async function indexKnowledgeDocument(
  docId: string,
  title: string,
  content: string
): Promise<{ chunkCount: number; embeddedCount: number }> {
  const chunks = chunkDocumentContent(content, title);

  db.prepare('DELETE FROM knowledge_chunks WHERE doc_id = ?').run(docId);

  const insertChunk = db.prepare(`
    INSERT INTO knowledge_chunks (doc_id, section_title, chunk_index, content, embedding)
    VALUES (?, ?, ?, ?, ?)
  `);

  let embeddedCount = 0;
  for (const chunk of chunks) {
    const vec = computeLocalEmbedding(chunk.content);
    embeddedCount++;
    insertChunk.run(
      docId,
      chunk.sectionTitle,
      chunk.chunkIndex,
      chunk.content,
      JSON.stringify(vec)
    );
  }

  return { chunkCount: chunks.length, embeddedCount };
}

export async function seedPrimaryKnowledgeIfNeeded(): Promise<void> {
  const existing = db
    .prepare('SELECT id FROM knowledge_docs WHERE is_primary = 1')
    .get() as { id: string } | undefined;

  if (existing) {
    // Re-generate local embeddings if any chunks have missing/mismatched dimension vectors
    const rows = db
      .prepare('SELECT id, content, embedding FROM knowledge_chunks')
      .all() as Array<{ id: number; content: string; embedding: string | null }>;
    const updateStmt = db.prepare('UPDATE knowledge_chunks SET embedding = ? WHERE id = ?');
    for (const r of rows) {
      let needsLocalVec = !r.embedding;
      if (r.embedding) {
        try {
          const parsed = JSON.parse(r.embedding) as unknown[];
          if (!Array.isArray(parsed) || parsed.length !== VECTOR_DIM) {
            needsLocalVec = true;
          }
        } catch {
          needsLocalVec = true;
        }
      }
      if (needsLocalVec) {
        updateStmt.run(JSON.stringify(computeLocalEmbedding(r.content)), r.id);
      }
    }
    return;
  }

  if (!fs.existsSync(PRIMARY_KNOWLEDGE_PATH)) {
    console.warn('[RAG] Primary knowledge file not found at:', PRIMARY_KNOWLEDGE_PATH);
    return;
  }

  const content = fs.readFileSync(PRIMARY_KNOWLEDGE_PATH, 'utf8');
  const now = new Date().toISOString();
  const docId = 'doc-primary-hoa-lu';

  db.prepare(`
    INSERT INTO knowledge_docs (id, title, filename, mime_type, content, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    docId,
    'Cơ sở tri thức: Phố cổ Hoa Lư – Ninh Bình',
    'Kien_thuc_Pho_co_Hoa_Lu_3ff8f08d.md',
    'text/markdown',
    content,
    now,
    now
  );

  await indexKnowledgeDocument(docId, 'Cơ sở tri thức: Phố cổ Hoa Lư – Ninh Bình', content);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

const STOPWORDS = new Set([
  'la', 'gi', 'o', 'dau', 'co', 'khong', 'nhung', 'cac', 'va', 'cua', 'tai', 'cho',
  'toi', 'minh', 'ban', 'quy', 'khach', 've', 'nay', 'do', 'kia', 'the', 'nao',
  'sao', 'duoc', 'hay', 'hoi', 'xin', 'chao', 've', 'den', 'voi', 'trong', 'ngoai',
  'nhu', 'thi', 'ma', 'de', 'di', 'xem', 'tim', 'hieu', 'biet', 'them', 'nhe', 'a',
]);

export function extractSignificantTokens(expandedText: string): string[] {
  return expandedText
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function lexicalFuzzyScore(queryExpanded: string, chunkText: string): number {
  const normChunk = normalizeVietnamese(chunkText);
  const chunkTokens = normChunk.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const chunkSet = new Set(chunkTokens);

  const queryTokens = extractSignificantTokens(queryExpanded);
  if (queryTokens.length === 0) return 0;

  let hits = 0;
  for (const qt of queryTokens) {
    if (chunkSet.has(qt) || normChunk.includes(qt)) {
      hits += 1;
    } else if (qt.length >= 4) {
      // Check slight typo tolerance (edit distance <= 1)
      let matchedFuzzy = false;
      for (const ct of chunkSet) {
        if (Math.abs(ct.length - qt.length) <= 1 && levenshteinDistance(qt, ct) <= 1) {
          matchedFuzzy = true;
          break;
        }
      }
      if (matchedFuzzy) hits += 0.8;
    }
  }

  // Bigram phrase bonus
  let phraseBonus = 0;
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
    if (normChunk.includes(bigram)) {
      phraseBonus += 0.35;
    }
  }

  return hits / queryTokens.length + Math.min(0.65, phraseBonus);
}

export interface RetrievedChunk {
  id: number;
  docId: string;
  docTitle: string;
  isPrimary: number;
  sectionTitle: string;
  content: string;
  score: number;
}

export async function retrieveRelevantContext(
  query: string,
  topK: number = 6,
  mode: string = 'HYBRID'
): Promise<{ chunks: RetrievedChunk[]; matchedFaqs: Array<{ question: string; answer: string; score: number }> }> {
  const expandedQuery = expandAbbreviations(query);
  const queryVec = computeLocalEmbedding(query);

  const rows = db
    .prepare(`
      SELECT kc.id, kc.doc_id, kd.title as doc_title, kd.is_primary, kc.section_title, kc.content, kc.embedding
      FROM knowledge_chunks kc
      JOIN knowledge_docs kd ON kd.id = kc.doc_id
    `)
    .all() as Array<{
      id: number;
      doc_id: string;
      doc_title: string;
      is_primary: number;
      section_title: string;
      content: string;
      embedding: string | null;
    }>;

  const scored: RetrievedChunk[] = rows.map((row) => {
    const lex = lexicalFuzzyScore(expandedQuery, `${row.section_title} ${row.content}`);
    const titleBoost = lexicalFuzzyScore(expandedQuery, row.section_title) * 0.45;
    let sem = 0;

    if (row.embedding) {
      try {
        const vec = JSON.parse(row.embedding) as number[];
        sem = Math.max(0, cosineSimilarity(queryVec, vec));
      } catch {
        sem = 0;
      }
    }

    const finalScore =
      mode === 'STRICT'
        ? lex * 0.72 + titleBoost + sem * 0.28
        : sem * 0.52 + lex * 0.48 + titleBoost;

    return {
      id: row.id,
      docId: row.doc_id,
      docTitle: row.doc_title,
      isPrimary: row.is_primary,
      sectionTitle: row.section_title,
      content: row.content,
      score: finalScore,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, Math.max(1, topK));

  const faqs = db.prepare('SELECT question, answer FROM faqs ORDER BY sort_order ASC').all() as Array<{
    question: string;
    answer: string;
  }>;
  const matchedFaqs = faqs
    .map((f) => ({
      ...f,
      score: lexicalFuzzyScore(expandedQuery, `${f.question} ${f.answer}`),
    }))
    .filter((f) => f.score >= 0.42)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return { chunks: topChunks, matchedFaqs };
}
