import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Settings, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function District() {
  const [zipCode, setZipCode] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [userProfile, setUserProfile] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zip = params.get('zip');
    if (zip) {
      setZipCode(zip);
      loadDistrictData(zip);
    }

    const saved = localStorage.getItem('voter_profile');
    if (saved) {
      setUserProfile(JSON.parse(saved));
    }
  }, []);

  const loadDistrictData = async (zip) => {
    setIsLoading(true);
    try {
      const allCandidates = await base44.entities.Candidate.list();
      
      // Mock: Filter by state derived from ZIP (simplified - in production use ZIP lookup API)
      const filtered = allCandidates.filter(c => c.in_office || c.state);
      
      // Calculate alignment scores
      const scored = filtered.map(candidate => ({
        ...candidate,
        alignmentScore: calculateAlignment(candidate),
        votingAttendance: Math.floor(Math.random() * 15) + 85 // Mock: 85-100%
      }));

      // Sort by alignment score descending
      scored.sort((a, b) => b.alignmentScore - a.alignmentScore);
      
      setCandidates(scored);
    } catch (error) {
      console.error('Error loading district:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAlignment = (candidate) => {
    if (userProfile.length === 0) return 0;
    
    // Mock alignment calculation
    // In production: fetch candidate's actual votes and compare to user profile
    const baseScore = Math.floor(Math.random() * 60) + 20;
    const profileBonus = Math.min(userProfile.length * 5, 20);
    return Math.min(baseScore + profileBonus, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your district...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('MyProfile'))}
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit My Profile
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Your District</h1>
          </div>
          <p className="text-lg text-slate-600">ZIP Code: {zipCode}</p>
          
          {userProfile.length === 0 ? (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-900">
                <strong>Create your profile</strong> to see candidates ranked by alignment with your priorities.
              </p>
              <Button
                className="mt-2"
                onClick={() => navigate(createPageUrl('MyProfile'))}
              >
                Build My Profile
              </Button>
            </div>
          ) : (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900">
                Showing {candidates.length} candidates ranked by alignment with your {userProfile.length} selected issues
              </p>
            </div>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-xl text-slate-600">No candidates found in this district</p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate, index) => (
              <div
                key={candidate.id}
                onClick={() => navigate(createPageUrl('Profile') + `?id=${candidate.id}`)}
                className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                  index === 0 && userProfile.length > 0
                    ? 'border-green-500 bg-green-50/30'
                    : index === 1 && userProfile.length > 0
                    ? 'border-blue-500'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {candidate.photo_url ? (
                      <img src={candidate.photo_url} alt={candidate.full_name} className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <Users className="w-10 h-10 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-slate-900">
                            {candidate.full_name}
                          </h3>
                          {index === 0 && userProfile.length > 0 && (
                            <Badge className="bg-green-600">
                              <Award className="w-3 h-3 mr-1" />
                              Top Match
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-600">{candidate.office}</p>
                      </div>

                      {userProfile.length > 0 && (
                        <div className="text-right">
                          <div className="text-3xl font-bold text-blue-600">
                            {candidate.alignmentScore}%
                          </div>
                          <div className="text-xs text-slate-600">Match</div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline">{candidate.state}</Badge>
                      {candidate.in_office && <Badge className="bg-green-600">In Office</Badge>}
                      <Badge variant="outline">
                        {candidate.votingAttendance}% Attendance
                      </Badge>
                    </div>

                    {candidate.bio && (
                      <p className="text-sm text-slate-600 line-clamp-2">{candidate.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}