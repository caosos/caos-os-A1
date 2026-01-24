import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Scale, Users, FileText, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [zipCode, setZipCode] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl('Search') + `?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleBallotLookup = (e) => {
    e.preventDefault();
    if (zipCode.trim() && /^\d{5}$/.test(zipCode.trim())) {
      navigate(createPageUrl('Ballot') + `?zip=${zipCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Voter Ledger</h1>
          </div>
          <div className="text-sm text-slate-600">
            Candidate & Issue Intelligence
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold text-slate-900 mb-4">
          Know Who You're Voting For
        </h2>
        <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto">
          SEC-filing-level transparency on political candidates and ballot measures.
          Every claim backed by authoritative sources.
        </p>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by candidate name, office, or issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-14 text-lg"
            />
            <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </div>
        </form>

        {/* Ballot Lookup */}
        <form onSubmit={handleBallotLookup} className="max-w-md mx-auto">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter ZIP code for your ballot"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              maxLength={5}
              className="flex-1"
            />
            <Button type="submit" variant="outline">
              View My Ballot
            </Button>
          </div>
        </form>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-4 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Candidate Profiles</h3>
          <p className="text-slate-600 text-sm">
            Complete voting records, funding sources, and network analysis
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Voting History</h3>
          <p className="text-slate-600 text-sm">
            Every vote on record with bill details and source citations
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Side-by-Side Compare</h3>
          <p className="text-slate-600 text-sm">
            Direct comparison of candidates' records and positions
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Issue Alignment</h3>
          <p className="text-slate-600 text-sm">
            See how candidates align with your priorities
          </p>
        </div>
      </div>

      {/* Data Sources */}
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Powered By Authoritative Sources
        </h3>
        <div className="flex flex-wrap justify-center gap-8 text-slate-400">
          <div>ProPublica Congress API</div>
          <div>OpenFEC</div>
          <div>Open States</div>
          <div>Congress.gov</div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400">
            All data sourced from public, authoritative APIs. No voter roll data. No microtargeting.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            © 2026 Voter Ledger. Built for transparency.
          </p>
        </div>
      </footer>
    </div>
  );
}