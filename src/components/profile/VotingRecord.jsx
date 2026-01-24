import React, { useState, useEffect } from 'react';
import { ExternalLink, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

export default function VotingRecord({ candidateId }) {
  const [votes, setVotes] = useState([]);
  const [bills, setBills] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [issueFilter, setIssueFilter] = useState('all');
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    const loadVotes = async () => {
      try {
        const voteData = await base44.entities.Vote.filter({ candidate_id: candidateId }, '-vote_date', 100);
        setVotes(voteData);

        // Calculate attendance (mock calculation)
        const totalVotes = voteData.length;
        const missedVotes = voteData.filter(v => v.position === 'Not Voting').length;
        const attendanceRate = totalVotes > 0 ? ((totalVotes - missedVotes) / totalVotes * 100).toFixed(1) : 0;
        setAttendance({
          total: totalVotes,
          attended: totalVotes - missedVotes,
          missed: missedVotes,
          rate: attendanceRate
        });

        // Load bill details for each vote
        const billIds = [...new Set(voteData.map(v => v.bill_id).filter(Boolean))];
        const billMap = {};
        for (const billId of billIds) {
          const billData = await base44.entities.Bill.filter({ id: billId }, null, 1);
          if (billData.length > 0) {
            billMap[billId] = billData[0];
          }
        }
        setBills(billMap);
      } catch (error) {
        console.error('Error loading votes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVotes();
  }, [candidateId]);

  const getPositionColor = (position) => {
    switch (position) {
      case 'Yes': return 'bg-green-100 text-green-800';
      case 'No': return 'bg-red-100 text-red-800';
      case 'Present': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const filteredVotes = issueFilter === 'all' 
    ? votes 
    : votes.filter(v => {
        const bill = bills[v.bill_id];
        return bill?.issue_tags?.includes(issueFilter);
      });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-20 bg-slate-200 rounded" />
          <div className="h-20 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  const allIssues = [...new Set(Object.values(bills).flatMap(b => b.issue_tags || []))];

  return (
    <div className="space-y-4">
      {/* Attendance Stats */}
      {attendance && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Voting Attendance</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-600">{attendance.rate}%</p>
              <p className="text-sm text-slate-600">Attendance Rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{attendance.attended}</p>
              <p className="text-sm text-slate-600">Votes Cast</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{attendance.missed}</p>
              <p className="text-sm text-slate-600">Votes Missed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{attendance.total}</p>
              <p className="text-sm text-slate-600">Total Votes</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <Select value={issueFilter} onValueChange={setIssueFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by issue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              {allIssues.map(issue => (
                <SelectItem key={issue} value={issue}>{issue}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-600">
            {filteredVotes.length} {filteredVotes.length === 1 ? 'vote' : 'votes'}
          </span>
        </div>
      </div>

      {/* Votes List */}
      {filteredVotes.length > 0 ? (
        <div className="space-y-4">
          {filteredVotes.map((vote) => {
            const bill = bills[vote.bill_id];
            return (
              <div key={vote.id} className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">
                      {bill?.external_id || vote.roll_call_id}
                    </h3>
                    <p className="text-slate-700">{bill?.title || 'Bill details pending sync'}</p>
                  </div>
                  <Badge className={getPositionColor(vote.position)}>
                    {vote.position}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline">{vote.chamber}</Badge>
                  <Badge variant="outline">
                    {new Date(vote.vote_date).toLocaleDateString()}
                  </Badge>
                  {bill?.issue_tags?.map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>

                {bill?.summary && (
                  <p className="text-sm text-slate-600 mb-3">{bill.summary}</p>
                )}

                <a
                  href={vote.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Official Record
                </a>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No voting records found{issueFilter !== 'all' ? ' for this issue' : ''}</p>
        </div>
      )}
    </div>
  );
}