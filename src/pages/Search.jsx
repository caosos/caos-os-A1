import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ArrowLeft, MapPin, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, []);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      // Search candidates by name or office
      const candidates = await base44.entities.Candidate.list();
      const filtered = candidates.filter(c => 
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.office?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.state?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(query);
    const newUrl = createPageUrl('Search') + `?q=${encodeURIComponent(query)}`;
    window.history.pushState({}, '', newUrl);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Home'))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Search candidates..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">
                  <SearchIcon className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="text-slate-600 mt-4">Searching...</p>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="mb-4 text-slate-600">
              {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
            </div>
            <div className="space-y-4">
              {results.map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => navigate(createPageUrl('Profile') + `?id=${candidate.id}`)}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {candidate.photo_url ? (
                        <img src={candidate.photo_url} alt={candidate.full_name} className="w-16 h-16 rounded-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-slate-900 mb-1">
                        {candidate.full_name}
                      </h3>
                      <p className="text-slate-600 mb-2">{candidate.office}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{candidate.party}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {candidate.state}
                          {candidate.district && ` - District ${candidate.district}`}
                        </Badge>
                        <Badge>{candidate.level}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : query && !isLoading ? (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-xl text-slate-600">No candidates found for "{query}"</p>
            <p className="text-slate-500 mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <SearchIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-xl text-slate-600">Enter a search query to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}