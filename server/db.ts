import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'hoa_lu.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export const PRIMARY_KNOWLEDGE_PATH = path.resolve(
  process.cwd(),
  'public',
  'assets',
  'aistudio',
  'Kien_thuc_Pho_co_Hoa_Lu_3ff8f08d.md'
);

export const DEFAULT_SYSTEM_INSTRUCTION = `Bạn là HOA LƯ AI – TRỢ LÝ DU LỊCH chuyên biệt về Phố cổ Hoa Lư, Ninh Bình.

Nguyên tắc bắt buộc:
1. Sử dụng tài liệu kiến thức được cung cấp trong ngữ cảnh làm nguồn thông tin chính.
2. Luôn phân biệt rõ Phố cổ Hoa Lư (tổ hợp du lịch, văn hóa, ẩm thực xây dựng mới quanh hồ Kỳ Lân tại trung tâm Ninh Bình) với Khu di tích lịch sử Cố đô Hoa Lư (quần thể di tích lịch sử tại khu vực Trường Yên gắn với kinh đô xưa). Không mô tả Phố cổ Hoa Lư là khu phố cổ nguyên bản còn tồn tại liên tục từ thế kỷ X.
3. Không tự bịa thông tin, không tự tạo giá vé, giờ mở cửa chính thức, số điện thoại, địa chỉ chi tiết hoặc lịch biểu diễn.
4. Nếu tài liệu không đề cập hoặc thông tin vận hành hiện tại (giá vé, giờ mở cửa, lịch diễn Anh hùng Cờ Lau, tình trạng hoạt động từng gian hàng/chèo thuyền/hoa đăng) chưa có dữ liệu xác thực, hãy nói rõ là hiện chưa có dữ liệu xác thực và hướng dẫn người dùng kiểm tra kênh chính thức (Sở Du lịch tỉnh Ninh Bình, Cổng thông tin điện tử tỉnh Ninh Bình, đơn vị vận hành Phố cổ Hoa Lư, kênh bán vé chính thức hoặc bản đồ số hiện hành).
5. Các khoảng cách đến Tràng An, Hang Múa, Tam Cốc – Bích Động, Cố đô Hoa Lư, Ga Ninh Bình chỉ nêu mang tính ước lượng.
6. Khi người dùng hỏi về lịch trình, có thể gợi ý lịch trình buổi chiều – tối tham khảo và hỏi thêm ngày đi, số người hoặc phương tiện nếu cần thiết.
7. Trả lời tự nhiên, lịch sự, chuẩn xác, ưu tiên tiếng Việt có dấu, trình bày mạch lạc bằng đoạn văn, danh sách hoặc bảng Markdown khi phù hợp. Hiểu được câu hỏi viết tắt hoặc sai chính tả nhẹ.`;

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL DEFAULT 'admin',
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_docs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      content TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT NOT NULL,
      section_title TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding TEXT,
      FOREIGN KEY (doc_id) REFERENCES knowledge_docs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NOT NULL,
      section_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gallery_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      caption TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ai_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      model TEXT NOT NULL DEFAULT 'hoalu-rag-hybrid',
      system_instruction TEXT NOT NULL,
      thinking_level TEXT NOT NULL DEFAULT 'HYBRID',
      max_context_chunks INTEGER NOT NULL DEFAULT 6,
      log_conversations INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_message TEXT NOT NULL,
      assistant_reply TEXT NOT NULL,
      sources_used TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();

  // Seed AI config if missing
  const configExists = db.prepare('SELECT id FROM ai_config WHERE id = 1').get();
  if (!configExists) {
    db.prepare(`
      INSERT INTO ai_config (id, model, system_instruction, thinking_level, max_context_chunks, log_conversations, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).run('hoalu-rag-hybrid', DEFAULT_SYSTEM_INSTRUCTION, 'HYBRID', 6, 1, now);
  } else {
    // Migrate existing Gemini model IDs to standalone local engine if present
    db.prepare(`
      UPDATE ai_config
      SET model = 'hoalu-rag-hybrid'
      WHERE id = 1 AND (model LIKE 'gemini-%')
    `).run();
  }

  // Seed initial articles strictly grounded in Kien_thuc_Pho_co_Hoa_Lu_3ff8f08d.md
  const articleCount = (db.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number }).cnt;
  if (articleCount === 0) {
    const insertArticle = db.prepare(`
      INSERT INTO articles (id, title, slug, category, summary, content, image_url, section_order, is_featured, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedArticles = [
      {
        id: 'art-ho-ky-lan-thap-tu-an',
        title: 'Hồ Kỳ Lân & Tháp Tứ Ân',
        slug: 'ho-ky-lan-thap-tu-an',
        category: 'Kiến trúc',
        summary: 'Không gian mặt nước trung tâm dưới chân núi Kỳ Lân cùng tòa tháp nhiều tầng mái là điểm nhấn thị giác đặc trưng của khu phố.',
        content: `Phố cổ Hoa Lư nằm tại khu vực hồ Kỳ Lân, dưới chân núi Kỳ Lân, thuộc khu vực trung tâm Ninh Bình.

### Hồ Kỳ Lân
Là không gian mặt nước trung tâm, tạo cảnh quan điều hòa cho toàn khu phố và là điểm dừng chân lý tưởng để du khách dạo bộ, ngắm cảnh và chụp ảnh.

### Tháp Tứ Ân
Công trình nhiều tầng mái, tạo điểm nhấn thị giác nổi bật giữa khu vực hồ, đặc biệt ấn tượng khi khu phố bắt đầu lên đèn vào buổi chiều tối.

### Núi Kỳ Lân và khu vực chùa
Cảnh quan núi đá tự nhiên kết hợp cùng công trình tín ngưỡng góp phần tạo nên tổng thể hài hòa giữa văn hóa, cảnh sắc và chiều sâu tâm linh.`,
        image_url: '/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg',
        section_order: 1,
        is_featured: 1,
      },
      {
        id: 'art-day-nha-go-den-long',
        title: 'Dãy nhà gỗ, mái ngói & không gian đèn lồng',
        slug: 'day-nha-go-mai-ngoi-den-long',
        category: 'Kiến trúc',
        summary: 'Các chi tiết kiến trúc truyền thống lấy cảm hứng từ văn hóa Đại Việt kết hợp lối dạo ven hồ và cầu ngắm cảnh.',
        content: `Phố cổ Hoa Lư được xây dựng theo định hướng tái hiện một phần không gian kiến trúc và đời sống Đại Việt xưa, gợi nhắc thời kỳ Hoa Lư giữ vai trò kinh đô của nhà nước Đại Cồ Việt dưới các triều Đinh và Tiền Lê.

### Dãy nhà gỗ, mái ngói và đèn lồng
Các chi tiết kiến trúc truyền thống như khung nhà gỗ, mái ngói cổ và hệ thống đèn lồng được sử dụng xuyên suốt dọc tuyến phố để gợi mở không gian phố xưa.

### Cầu và lối dạo ven hồ
Các cây cầu và lối dạo bộ quanh hồ Kỳ Lân là vị trí thuận tiện để du khách tản bộ, hóng gió và lưu giữ những khung hình đẹp, đặc biệt vào thời điểm hoàng hôn và buổi tối.

*Lưu ý quan trọng: Phố cổ Hoa Lư là công trình du lịch được xây dựng mới (được giới thiệu triển khai từ cuối thập niên 2010 và mở cửa đón khách vào đầu năm 2022), không phải khu phố cổ nguyên bản tồn tại liên tục từ thế kỷ X.*`,
        image_url: '/src/assets/images/pho_co_wooden_houses_1795618580199.jpg',
        section_order: 2,
        is_featured: 1,
      },
      {
        id: 'art-thuy-dinh-anh-hung-co-lau',
        title: 'Thủy đình & Chương trình thực cảnh Anh hùng Cờ Lau',
        slug: 'thuy-dinh-anh-hung-co-lau',
        category: 'Trải nghiệm',
        summary: 'Không gian thủy đình ven hồ và chương trình nghệ thuật tái hiện câu chuyện lịch sử về Đinh Bộ Lĩnh lập nên nhà Đinh.',
        content: `Khu vực thủy đình và không gian biểu diễn là nơi có thể tổ chức các chương trình nghệ thuật truyền thống và sự kiện văn hóa theo lịch từng thời điểm.

### Chương trình thực cảnh Anh hùng Cờ Lau
Được giới thiệu là chương trình nghệ thuật khai thác câu chuyện về Đinh Bộ Lĩnh – người dẹp loạn 12 sứ quân, thống nhất đất nước và lập nên nhà nước Đại Cồ Việt dưới triều Đinh. Tên gọi gợi nhắc hình ảnh thuở nhỏ Đinh Bộ Lĩnh cùng bạn bè dùng cờ lau tập trận.

Các chủ đề lịch sử có thể được thể hiện gồm:
- Tuổi thơ và giai thoại cờ lau tập trận.
- Quá trình trưởng thành, tập hợp lực lượng.
- Bối cảnh loạn 12 sứ quân và quá trình thống nhất đất nước.
- Sự ra đời của nhà nước Đại Cồ Việt.

*Lưu ý: Lịch diễn, giờ diễn, sơ đồ chỗ ngồi, giá vé và kênh bán vé có thể thay đổi theo từng giai đoạn. Du khách nên kiểm tra trực tiếp trên kênh chính thức của đơn vị tổ chức trước khi tham dự.*`,
        image_url: '/src/assets/images/thuy_dinh_performance_1795618580818.jpg',
        section_order: 3,
        is_featured: 1,
      },
      {
        id: 'art-trai-nghiem-co-phuc-hoa-dang',
        title: 'Trải nghiệm cổ phục, chèo thuyền & thả hoa đăng',
        slug: 'trai-nghiem-co-phuc-hoa-dang',
        category: 'Trải nghiệm',
        summary: 'Các hoạt động văn hóa, chụp ảnh cổ phục, dạo hồ và tham gia trò chơi dân gian tùy theo lịch vận hành thực tế.',
        content: `Tại Phố cổ Hoa Lư, du khách có thể tìm thấy nhiều hoạt động trải nghiệm văn hóa phù hợp cho cá nhân và gia đình:

- Đi bộ tham quan các dãy nhà, lối đi và cảnh quan quanh hồ Kỳ Lân.
- Chụp ảnh cùng kiến trúc nhà gỗ, mái ngói, cầu, mặt nước và đèn lồng.
- Thuê trang phục truyền thống hoặc cổ phục tại các cửa hàng có cung cấp dịch vụ.
- Trải nghiệm chèo thuyền trên hồ nếu dịch vụ đang hoạt động và điều kiện thời tiết cho phép.
- Thả hoa đăng khi có chương trình tổ chức (cần tuân thủ hướng dẫn an toàn và giữ gìn vệ sinh môi trường).
- Tham gia trò chơi dân gian hoặc xem biểu diễn nghệ thuật truyền thống nếu có lịch.

*Lưu ý: Dịch vụ và hoạt động có thể thay đổi theo mùa, ngày trong tuần, thời tiết, lượng khách và kế hoạch tổ chức của ban quản lý.*`,
        image_url: '/src/assets/images/lang_nghe_co_phuc_1795618583047.jpg',
        section_order: 4,
        is_featured: 1,
      },
      {
        id: 'art-am-thuc-dac-san',
        title: 'Ẩm thực đặc sản Ninh Bình & Quà quê',
        slug: 'am-thuc-dac-san-ninh-binh',
        category: 'Ẩm thực',
        summary: 'Thưởng thức cơm cháy Ninh Bình, thịt dê núi, bánh khoái tép, các món ăn vặt và trà chiều trong không gian phố cổ.',
        content: `Ẩm thực là một phần quan trọng trong hành trình khám phá Phố cổ Hoa Lư và khu vực trung tâm Ninh Bình. Du khách có thể tìm thưởng thức:

- **Cơm cháy Ninh Bình**: Món đặc sản trứ danh thường ăn kèm nước sốt đậm đà.
- **Thịt dê núi**: Các món chế biến từ dê núi đặc trưng của vùng núi đá vôi Ninh Bình.
- **Bánh khoái tép** cùng bánh đa, bánh mật và nhiều món quà quê dân dã.
- **Đồ ăn vặt, món nướng, đồ uống, trà và cà phê** tại các hàng quán dọc khu phố.

*Kinh nghiệm dành cho du khách: Giá bán và chất lượng phụ thuộc vào từng cửa hàng. Du khách nên xem kỹ thực đơn, hỏi rõ giá theo suất hoặc đĩa, các khoản phụ thu nếu có và kiểm tra hóa đơn trước khi thanh toán.*`,
        image_url: '/src/assets/images/am_thuc_ninh_binh_1795618581115.jpg',
        section_order: 5,
        is_featured: 1,
      },
      {
        id: 'art-lang-nghe-va-ket-hop',
        title: 'Làng nghề thủ công & Hành trình kết hợp Ninh Bình',
        slug: 'lang-nghe-va-ket-hop-ninh-binh',
        category: 'Làng nghề & Kết hợp',
        summary: 'Tìm hiểu gốm Bồ Bát, đá Ninh Vân, thêu Văn Lâm, tranh Đông Hồ và các danh thắng Tràng An, Hang Múa, Cố đô Hoa Lư.',
        content: `### Làng nghề và sản phẩm thủ công
Không gian trưng bày hoặc bán hàng có thể giới thiệu tinh hoa từ nhiều làng nghề truyền thống (tuy nhiên không phải tất cả đều có gian hàng thường trực mọi lúc):
- **Ninh Vân (Ninh Bình)**: Đá mỹ nghệ, sản phẩm chạm khắc đá.
- **Bồ Bát (Ninh Bình)**: Gốm truyền thống.
- **Văn Lâm (Ninh Bình)**: Thêu ren thủ công.
- **Ý Yên (Nam Định cũ)**: Nghề đúc đồng, sơn mài và mỹ nghệ.
- **Đông Hồ (Bắc Ninh)**: Tranh dân gian.
- **Các làng nghề mộc**: Đồ gỗ và sản phẩm thủ công mỹ nghệ.

### Địa điểm thường kết hợp trong hành trình Ninh Bình
Từ Phố cổ Hoa Lư, du khách thường kết hợp tham quan **Quần thể danh thắng Tràng An**, **Hang Múa**, **Tam Cốc – Bích Động**, **Khu di tích lịch sử Cố đô Hoa Lư** (tại Trường Yên) và di chuyển qua **Ga Ninh Bình**. Mọi khoảng cách chỉ mang tính ước lượng tùy tuyến đường thực tế.`,
        image_url: '/src/assets/images/trang_an_co_do_1795618582029.jpg',
        section_order: 6,
        is_featured: 1,
      },
    ];

    for (const a of seedArticles) {
      insertArticle.run(
        a.id,
        a.title,
        a.slug,
        a.category,
        a.summary,
        a.content,
        a.image_url,
        a.section_order,
        a.is_featured,
        now,
        now
      );
    }
  }

  // Seed initial gallery items using verified generated images
  const galleryCount = (db.prepare('SELECT COUNT(*) as cnt FROM gallery_items').get() as { cnt: number }).cnt;
  if (galleryCount === 0) {
    const insertGallery = db.prepare(`
      INSERT INTO gallery_items (id, title, category, caption, image_url, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const seedGallery = [
      {
        id: 'gal-1',
        title: 'Toàn cảnh Hồ Kỳ Lân và Tháp Tứ Ân lúc chạng vạng',
        category: 'Không gian hồ',
        caption: 'Hồ Kỳ Lân là không gian mặt nước trung tâm dưới chân núi Kỳ Lân, nổi bật với Tháp Tứ Ân nhiều tầng mái phản chiếu ánh đèn.',
        image_url: '/src/assets/images/ho_ky_lan_twilight_1795618579808.jpg',
        sort_order: 1,
      },
      {
        id: 'gal-2',
        title: 'Dãy nhà gỗ, mái ngói và đèn lồng ven hồ',
        category: 'Kiến trúc',
        caption: 'Kiến trúc nhà gỗ, mái ngói truyền thống kết hợp cùng hệ thống đèn lồng mang lại cảm giác không gian phố xưa dọc lối dạo bộ.',
        image_url: '/src/assets/images/pho_co_wooden_houses_1795618580199.jpg',
        sort_order: 2,
      },
      {
        id: 'gal-3',
        title: 'Thủy đình, cầu đá và ánh hoa đăng buổi tối',
        category: 'Trải nghiệm',
        caption: 'Khu vực cầu và thủy đình là nơi ngắm cảnh, chụp ảnh ban đêm và tổ chức các hoạt động nghệ thuật theo lịch.',
        image_url: '/src/assets/images/thuy_dinh_performance_1795618580818.jpg',
        sort_order: 3,
      },
      {
        id: 'gal-4',
        title: 'Tinh hoa ẩm thực đặc sản Ninh Bình',
        category: 'Ẩm thực',
        caption: 'Cơm cháy Ninh Bình, thịt dê núi cùng trà nóng và nhiều món đặc sản địa phương phục vụ du khách tham quan.',
        image_url: '/src/assets/images/am_thuc_ninh_binh_1795618581115.jpg',
        sort_order: 4,
      },
      {
        id: 'gal-5',
        title: 'Không gian làng nghề truyền thống và cổ phục',
        category: 'Làng nghề',
        caption: 'Gốm Bồ Bát, đá mỹ nghệ Ninh Vân, tranh dân gian Đông Hồ và dịch vụ cổ phục gợi nhắc nét văn hóa Đại Việt.',
        image_url: '/src/assets/images/lang_nghe_co_phuc_1795618583047.jpg',
        sort_order: 5,
      },
      {
        id: 'gal-6',
        title: 'Cảnh sắc non nước vùng phụ cận Ninh Bình',
        category: 'Vùng phụ cận',
        caption: 'Từ khu vực trung tâm, du khách dễ dàng kết hợp hành trình tới Tràng An, Hang Múa, Tam Cốc – Bích Động và Cố đô Hoa Lư.',
        image_url: '/src/assets/images/trang_an_co_do_1795618582029.jpg',
        sort_order: 6,
      },
    ];

    for (const g of seedGallery) {
      insertGallery.run(g.id, g.title, g.category, g.caption, g.image_url, g.sort_order, now);
    }
  }

  // Seed FAQs strictly grounded in the knowledge document
  const faqCount = (db.prepare('SELECT COUNT(*) as cnt FROM faqs').get() as { cnt: number }).cnt;
  if (faqCount === 0) {
    const insertFaq = db.prepare(`
      INSERT INTO faqs (id, question, answer, category, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);

    const seedFaqs = [
      {
        id: 'faq-1',
        question: 'Phố cổ Hoa Lư có phải là Khu di tích Cố đô Hoa Lư không?',
        answer: 'Không. Phố cổ Hoa Lư là tổ hợp du lịch, tham quan, ẩm thực và trải nghiệm văn hóa được xây dựng mới quanh hồ Kỳ Lân tại khu vực trung tâm Ninh Bình (mở cửa đón khách từ đầu năm 2022). Trong khi đó, Khu di tích lịch sử Cố đô Hoa Lư là quần thể di tích lịch sử tại khu vực Trường Yên gắn với kinh đô xưa của nhà nước Đại Cồ Việt.',
        category: 'Tổng quan',
        sort_order: 1,
      },
      {
        id: 'faq-2',
        question: 'Khung giờ nào thích hợp nhất để tham quan Phố cổ Hoa Lư?',
        answer: 'Du khách có thể tham quan vào nhiều thời điểm trong ngày: buổi sáng không gian thoáng đãng để đi dạo, 14:00–17:00 dạo gian hàng thủ công, 17:00–19:00 ngắm hoàng hôn khi phố lên đèn và 19:00–21:00 ăn uống, xem biểu diễn nếu có lịch. Khoảng 17:30–21:30 là khung giờ gợi ý để trải nghiệm không khí chiều tối (đây là gợi ý trải nghiệm, cần kiểm tra giờ hoạt động thực tế trước khi đi).',
        category: 'Tham quan',
        sort_order: 2,
      },
      {
        id: 'faq-3',
        question: 'Tham quan Phố cổ Hoa Lư có mất vé vào cổng hay chi phí gì không?',
        answer: 'Hiện chưa có bảng giá thống nhất được xác minh cho toàn bộ dịch vụ. Khu vực tham quan chung từng được giới thiệu là miễn phí và việc đi bộ, ngắm cảnh tại khu vực công cộng thường không phát sinh phí riêng, nhưng du khách cần kiểm tra quy định hiện hành. Các dịch vụ như ăn uống, thuê cổ phục, chèo thuyền, thả hoa đăng, trò chơi hoặc xem show thực cảnh Anh hùng Cờ Lau sẽ tính phí riêng theo từng cửa hàng hoặc đơn vị tổ chức.',
        category: 'Chi phí',
        sort_order: 3,
      },
      {
        id: 'faq-4',
        question: 'Chương trình thực cảnh "Anh hùng Cờ Lau" có biểu diễn hằng ngày không?',
        answer: 'Không thể khẳng định chương trình diễn ra hằng ngày. Anh hùng Cờ Lau khai thác câu chuyện về Đinh Bộ Lĩnh dẹp loạn 12 sứ quân và lập nên nhà nước Đại Cồ Việt, tuy nhiên lịch diễn, giờ diễn, sơ đồ chỗ ngồi, giá vé và chính sách trẻ em có thể thay đổi. Du khách cần kiểm tra kênh bán vé hoặc thông báo chính thức của đơn vị tổ chức.',
        category: 'Trải nghiệm',
        sort_order: 4,
      },
      {
        id: 'faq-5',
        question: 'Đến Phố cổ Hoa Lư nên thưởng thức món đặc sản gì?',
        answer: 'Du khách có thể tìm thưởng thức các đặc sản nổi bật của Ninh Bình như cơm cháy Ninh Bình, thịt dê núi và các món chế biến từ dê, bánh khoái tép, bánh đa, bánh mật cùng đồ ăn vặt, món nướng, trà và cà phê. Nên xem kỹ thực đơn, hỏi rõ giá theo suất/đĩa và kiểm tra hóa đơn trước khi thanh toán.',
        category: 'Ẩm thực',
        sort_order: 5,
      },
      {
        id: 'faq-6',
        question: 'Có thể kết hợp Phố cổ Hoa Lư với những địa điểm nào tại Ninh Bình?',
        answer: 'Trong hành trình tham quan Ninh Bình, du khách thường kết hợp Phố cổ Hoa Lư với Quần thể danh thắng Tràng An, Hang Múa, Tam Cốc – Bích Động, Khu di tích Cố đô Hoa Lư và Ga Ninh Bình. Khoảng cách giữa các điểm chỉ mang tính ước lượng tùy tuyến đường và điểm xuất phát thực tế.',
        category: 'Di chuyển',
        sort_order: 6,
      },
    ];

    for (const f of seedFaqs) {
      insertFaq.run(f.id, f.question, f.answer, f.category, f.sort_order);
    }
  }
}
