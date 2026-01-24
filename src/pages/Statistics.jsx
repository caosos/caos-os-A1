import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Calendar, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const candidates = await base44.entities.Candidate.list();
      const votes = await base44.entities.Vote.list();
      const bills = await base44.entities.Bill.list();
      const donations = await base44.entities.Donation.list();

      // Calculate aggregate statistics
      const totalCandidates = candidates.length;
      const activeCandidates = candidates.filter(c => c.in_office).length;
      const totalVotes = votes.length;
      const totalBills = bills.length;
      const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

      // Vote participation by chamber
      const votesByChamber = {};
      votes.forEach(v => {
        votesByChamber[v.chamber] = (votesByChamber[v.chamber] || 0) + 1;
      });

      // Bills by status
      const billsByStatus = {};
      bills.forEach(b => {
        billsByStatus[b.status || 'Unknown'] = (billsByStatus[b.status || 'Unknown'] || 0) + 1;
      });

      // Attendance statistics (mock)
      const attendanceStats = {
        average: 92.5,
        highest: 98.2,
        lowest: 78.4
      };

      // Issue coverage
      const issueCount = {};
      bills.forEach(b => {
        (b.issue_tags || []).forEach(tag => {
          issueCount[tag] = (issueCount[tag] || 0) + 1;
        });
      });

      const topIssues = Object.entries(issueCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      setStats({
        totalCandidates,
        activeCandidates,
        totalVotes,
        totalBills,
        totalDonations,
        votesByChamber,
        billsByStatus,
        attendanceStats,
        topIssues
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Home'))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">System Statistics</h1>
          </div>
          <p className="text-lg text-slate-600">
            Comprehensive metrics and analytics across all political data
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="legislation">Legislation</TabsTrigger>
            <TabsTrigger value="funding">Funding</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <Users className="w-8 h-8 text-blue-600 mb-3" />
                <p className="text-3xl font-bold text-slate-900">{stats.totalCandidates}</p>
                <p className="text-sm text-slate-600">Total Candidates</p>
                <p className="text-xs text-green-600 mt-1">{stats.activeCandidates} currently in office</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <BarChart3 className="w-8 h-8 text-green-600 mb-3" />
                <p className="text-3xl font-bold text-slate-900">{stats.totalVotes.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Total Votes Recorded</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <FileText className="w-8 h-8 text-purple-600 mb-3" />
                <p className="text-3xl font-bold text-slate-900">{stats.totalBills.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Bills Tracked</p>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <Calendar className="w-8 h-8 text-amber-600 mb-3" />
                <p className="text-3xl font-bold text-slate-900">
                  ${(stats.totalDonations / 1000000).toFixed(1)}M
                </p>
                <p className="text-sm text-slate-600">Total Donations</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">Top Issues</h2>
              <div className="space-y-3">
                {stats.topIssues.map(([issue, count]) => (
                  <div key={issue} className="flex items-center justify-between">
                    <span className="text-slate-700">{issue}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-48 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / stats.topIssues[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="voting" className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">Votes by Chamber</h2>
              <div className="space-y-4">
                {Object.entries(stats.votesByChamber).map(([chamber, count]) => (
                  <div key={chamber} className="flex items-center justify-between">
                    <span className="text-lg text-slate-700">{chamber}</span>
                    <span className="text-2xl font-bold text-blue-600">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="legislation" className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">Bills by Status</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(stats.billsByStatus).map(([status, count]) => (
                  <div key={status} className="border border-slate-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-sm text-slate-600">{status}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="funding" className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">Campaign Finance Overview</h2>
              <div className="text-center py-8">
                <p className="text-5xl font-bold text-green-600 mb-2">
                  ${(stats.totalDonations / 1000000).toFixed(2)}M
                </p>
                <p className="text-lg text-slate-600">Total Campaign Contributions Tracked</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h2 className="text-2xl font-semibold mb-4">Voting Attendance Metrics</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600 mb-2">
                    {stats.attendanceStats.average}%
                  </p>
                  <p className="text-slate-600">Average Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-600 mb-2">
                    {stats.attendanceStats.highest}%
                  </p>
                  <p className="text-slate-600">Highest Attendance</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-red-600 mb-2">
                    {stats.attendanceStats.lowest}%
                  </p>
                  <p className="text-slate-600">Lowest Attendance</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}