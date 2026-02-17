import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ExternalLink, RefreshCw, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import StarfieldBackground from '@/components/chat/StarfieldBackground';

export default function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTopic, setSearchTopic] = useState('latest news');
  const [error, setError] = useState(null);

  const fetchNews = async (topic = 'latest news') => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Find and summarize the top 5-10 current news stories about "${topic}". For each story, provide:
        - Title (catchy headline)
        - Summary (2-3 sentences)
        - Category (tech, world, business, entertainment, science, etc)
        - Relevance score (1-10)
        
        Format as JSON array of objects with these fields: title, summary, category, relevance`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            articles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  category: { type: 'string' },
                  relevance: { type: 'number' }
                }
              }
            }
          }
        }
      });

      setArticles(response.articles || []);
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Failed to fetch news. Try again.');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTopic.trim()) {
      fetchNews(searchTopic);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      tech: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
      world: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
      business: 'bg-green-500/20 border-green-500/30 text-green-300',
      entertainment: 'bg-pink-500/20 border-pink-500/30 text-pink-300',
      science: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300',
      politics: 'bg-red-500/20 border-red-500/30 text-red-300'
    };
    return colors[category?.toLowerCase()] || 'bg-white/10 border-white/20 text-white/70';
  };

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col" style={{ height: '100vh', height: '100dvh' }}>
      <div className="fixed inset-0 z-0">
        <StarfieldBackground />
      </div>

      {/* Header */}
      <div className="relative z-30 bg-gradient-to-b from-[#0a1628] to-transparent pt-6 pb-4 px-4 border-b border-white/10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-4">📰 News Feed</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
              placeholder="Search news topic..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              type="button"
              onClick={() => fetchNews(searchTopic)}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 mb-6">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-white/60 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p>Fetching latest news...</p>
              </div>
            </div>
          )}

          {!loading && articles.length === 0 && (
            <div className="text-center py-12 text-white/50">
              No articles found. Try a different search.
            </div>
          )}

          <div className="grid gap-4">
            {articles.map((article, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                      {article.title}
                    </h2>
                  </div>
                  {article.relevance && (
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-white/50">Relevance</div>
                      <div className="text-lg font-bold text-blue-400">{article.relevance}/10</div>
                    </div>
                  )}
                </div>

                <p className="text-white/70 text-sm mb-4 leading-relaxed">
                  {article.summary}
                </p>

                <div className="flex items-center gap-2">
                  {article.category && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(article.category)}`}>
                      {article.category}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}