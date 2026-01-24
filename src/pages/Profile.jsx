import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, Network, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import VotingRecord from '@/components/profile/VotingRecord';
import Funding from '@/components/profile/Funding';
import NetworkView from '@/components/profile/NetworkView';

export default function Profile() {
  const [candidate, setCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCandidate = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      
      if (!id) {
        navigate(createPageUrl('Home'));
        return;
      }

      try {
        const data = await base44.entities.Candidate.filter({ id }, null, 1);
        if (data.length > 0) {
          setCandidate(data[0]);
        }
      } catch (error) {
        console.error('Error loading candidate:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCandidate();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-xl text-slate-600">Candidate not found</p>
          <Button onClick={() => navigate(createPageUrl('Home'))} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Profile Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt={candidate.full_name} className="w-32 h-32 rounded-full object-cover" />
              ) : (
                <Users className="w-16 h-16 text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                {candidate.full_name}
              </h1>
              <p className="text-xl text-slate-600 mb-4">{candidate.office}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-base px-3 py-1">{candidate.party}</Badge>
                <Badge variant="outline" className="text-base px-3 py-1">{candidate.state}</Badge>
                <Badge className="text-base px-3 py-1">{candidate.level}</Badge>
                {candidate.in_office && <Badge className="bg-green-600 text-base px-3 py-1">In Office</Badge>}
              </div>
              {candidate.website && (
                <a 
                  href={candidate.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Official Website →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="voting">Voting Record</TabsTrigger>
            <TabsTrigger value="money">Money</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">Biography</h2>
              {candidate.bio ? (
                <p className="text-slate-700 leading-relaxed">{candidate.bio}</p>
              ) : (
                <p className="text-slate-500 italic">No biography available</p>
              )}
            </div>

            {candidate.term_start && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-2xl font-semibold mb-4">Current Term</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Term Start</p>
                    <p className="text-lg font-medium">{new Date(candidate.term_start).toLocaleDateString()}</p>
                  </div>
                  {candidate.term_end && (
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Term End</p>
                      <p className="text-lg font-medium">{new Date(candidate.term_end).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="voting">
            <VotingRecord candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="money">
            <Funding candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="network">
            <NetworkView candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="summary">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">AI-Generated Summary</h2>
              <p className="text-slate-500 italic">
                Summary generation coming soon. All claims will be citation-locked to source data.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}