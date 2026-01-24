import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const COMMON_ISSUES = [
  'Healthcare', 'Education', 'Economy', 'Climate Change', 'Immigration',
  'Gun Rights', 'Abortion Rights', 'Criminal Justice', 'National Security',
  'Infrastructure', 'Social Security', 'Veterans Affairs', 'Housing',
  'Small Business', 'Agriculture', 'Energy Independence', 'Tax Policy'
];

export default function MyProfile() {
  const [userIssues, setUserIssues] = useState([]);
  const [customIssue, setCustomIssue] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('voter_profile');
    if (saved) {
      setUserIssues(JSON.parse(saved));
    }
  }, []);

  const handleAddIssue = (issue) => {
    if (userIssues.find(i => i.issue === issue)) {
      toast.error('Issue already added');
      return;
    }
    const newIssues = [...userIssues, { issue, stance: 'support', weight: 3 }];
    setUserIssues(newIssues);
    localStorage.setItem('voter_profile', JSON.stringify(newIssues));
  };

  const handleAddCustom = () => {
    if (!customIssue.trim()) return;
    handleAddIssue(customIssue.trim());
    setCustomIssue('');
  };

  const handleRemoveIssue = (issue) => {
    const newIssues = userIssues.filter(i => i.issue !== issue);
    setUserIssues(newIssues);
    localStorage.setItem('voter_profile', JSON.stringify(newIssues));
  };

  const handleUpdateStance = (issue, stance) => {
    const newIssues = userIssues.map(i => 
      i.issue === issue ? { ...i, stance } : i
    );
    setUserIssues(newIssues);
    localStorage.setItem('voter_profile', JSON.stringify(newIssues));
  };

  const handleUpdateWeight = (issue, weight) => {
    const newIssues = userIssues.map(i => 
      i.issue === issue ? { ...i, weight: parseInt(weight) } : i
    );
    setUserIssues(newIssues);
    localStorage.setItem('voter_profile', JSON.stringify(newIssues));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">My Voter Profile</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">Build Your Profile</h2>
          <p className="text-slate-600 mb-6">
            Select the issues that matter to you. When you view your district, candidates will be ranked by how well they align with your priorities.
          </p>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Quick Add Issues</h3>
            <div className="flex flex-wrap gap-2">
              {COMMON_ISSUES.map(issue => (
                <button
                  key={issue}
                  onClick={() => handleAddIssue(issue)}
                  disabled={userIssues.find(i => i.issue === issue)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 rounded-full text-sm transition-colors"
                >
                  + {issue}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-3">Add Custom Issue</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Type your issue..."
                value={customIssue}
                onChange={(e) => setCustomIssue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              />
              <Button onClick={handleAddCustom}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-xl font-semibold mb-4">Your Issues ({userIssues.length})</h3>
          
          {userIssues.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              No issues selected yet. Add some above to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {userIssues.map((item) => (
                <div key={item.issue} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-lg">{item.issue}</h4>
                    <button
                      onClick={() => handleRemoveIssue(item.issue)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-600 mb-2 block">Your Stance</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStance(item.issue, 'support')}
                          className={`flex-1 px-3 py-2 rounded border transition-colors ${
                            item.stance === 'support'
                              ? 'bg-green-100 border-green-600 text-green-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Support
                        </button>
                        <button
                          onClick={() => handleUpdateStance(item.issue, 'oppose')}
                          className={`flex-1 px-3 py-2 rounded border transition-colors ${
                            item.stance === 'oppose'
                              ? 'bg-red-100 border-red-600 text-red-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Oppose
                        </button>
                        <button
                          onClick={() => handleUpdateStance(item.issue, 'neutral')}
                          className={`flex-1 px-3 py-2 rounded border transition-colors ${
                            item.stance === 'neutral'
                              ? 'bg-blue-100 border-blue-600 text-blue-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Neutral
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-slate-600 mb-2 block">
                        Importance (1-5)
                      </label>
                      <select
                        value={item.weight}
                        onChange={(e) => handleUpdateWeight(item.issue, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded bg-white"
                      >
                        <option value="1">1 - Low</option>
                        <option value="2">2 - Below Average</option>
                        <option value="3">3 - Average</option>
                        <option value="4">4 - Important</option>
                        <option value="5">5 - Critical</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {userIssues.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              size="lg"
              onClick={() => {
                toast.success('Profile saved!');
                navigate(createPageUrl('Home'));
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}