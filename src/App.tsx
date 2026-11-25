import { useCallback, useEffect, useState } from 'react';
import { AboutPage } from './components/AboutPage';
import { AdminPage } from './components/AdminPage';
import { ChatWidget } from './components/ChatWidget';
import { ExplorePage } from './components/ExplorePage';
import { Footer } from './components/Footer';
import { GalleryPage } from './components/GalleryPage';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { MapPage } from './components/MapPage';
import type { Article, FaqItem, GalleryItem, KnowledgeDoc, PageView } from './types';

function resolveInitialPage(): PageView {
  const hash = window.location.hash.replace('#', '');
  if (
    hash === 'about' ||
    hash === 'explore' ||
    hash === 'gallery' ||
    hash === 'map' ||
    hash === 'admin'
  ) {
    return hash;
  }
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageView>(resolveInitialPage);
  const [articles, setArticles] = useState<Article[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const loadPublicData = useCallback(async () => {
    try {
      const [contentRes, docsRes] = await Promise.all([
        fetch('/api/content'),
        fetch('/api/knowledge/overview'),
      ]);
      if (contentRes.ok) {
        const contentData = await contentRes.json();
        setArticles(contentData.articles || []);
        setGallery(contentData.gallery || []);
        setFaqs(contentData.faqs || []);
      }
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocs(docsData.docs || []);
      }
    } catch {
      // Initial data fetch error handled silently; empty states remain safe
    }
  }, []);

  useEffect(() => {
    void loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(resolveInitialPage());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleNavigate = (page: PageView, sectionId?: string) => {
    setCurrentPage(page);
    window.location.hash = page === 'home' && sectionId ? sectionId : page === 'home' ? '' : page;

    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAskAI = (prompt?: string) => {
    if (prompt) {
      setQueuedPrompt(prompt);
    }
    setIsChatOpen(true);
  };

  const handleSelectArticle = (article: Article | null) => {
    setSelectedArticle(article);
    if (article && currentPage === 'home') {
      setCurrentPage('explore');
      window.location.hash = 'explore';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE] text-[#2C1D14]">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenChat={() => handleAskAI()}
      />

      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage
            articles={articles}
            gallery={gallery}
            faqs={faqs}
            onNavigate={handleNavigate}
            onAskAI={handleAskAI}
            onSelectArticle={handleSelectArticle}
          />
        )}

        {currentPage === 'about' && <AboutPage docs={docs} onAskAI={handleAskAI} />}

        {currentPage === 'explore' && (
          <ExplorePage
            articles={articles}
            selectedArticle={selectedArticle}
            onSelectArticle={setSelectedArticle}
            onAskAI={handleAskAI}
          />
        )}

        {currentPage === 'gallery' && <GalleryPage items={gallery} />}

        {currentPage === 'map' && <MapPage />}

        {currentPage === 'admin' && (
          <AdminPage
            adminToken={adminToken}
            onSetAdminToken={setAdminToken}
            onRefreshPublicContent={loadPublicData}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} onOpenChat={() => handleAskAI()} />

      <ChatWidget
        isOpen={isChatOpen}
        onToggle={setIsChatOpen}
        queuedPrompt={queuedPrompt}
        onConsumeQueuedPrompt={() => setQueuedPrompt(null)}
      />
    </div>
  );
}
