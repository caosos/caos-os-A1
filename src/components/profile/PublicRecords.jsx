import React, { useState, useEffect } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const CATEGORY_LABELS = {
  legal: 'Legal',
  ethics: 'Ethics & Governance',
  performance: 'Performance',
  financial: 'Financial & Influence',
  statement_vs_action: 'Statement vs Action'
};

const STATUS_COLORS = {
  'Conviction': 'bg-red-100 text-red-900 border-red-300',
  'Pending charge': 'bg-orange-100 text-orange-900 border-orange-300',
  'Unadjudicated allegation': 'bg-amber-100 text-amber-900 border-amber-300',
  'Dismissed by court': 'bg-slate-100 text-slate-700 border-slate-300',
  'Sustained finding': 'bg-red-100 text-red-900 border-red-300',
  'Sanctioned violation': 'bg-red-100 text-red-900 border-red-300',
  'Censure': 'bg-red-100 text-red-900 border-red-300',
  'Ethics violation': 'bg-orange-100 text-orange-900 border-orange-300',
  'Documented pattern': 'bg-blue-100 text-blue-900 border-blue-300',
  'Public statement contradicted': 'bg-purple-100 text-purple-900 border-purple-300',
  'Court judgment': 'bg-red-100 text-red-900 border-red-300',
  'Plea deal': 'bg-orange-100 text-orange-900 border-orange-300'
};

export default function PublicRecords({ candidateId }) {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const data = await base44.entities.PublicRecord.filter(
          { candidate_id: candidateId },
          '-date',
          500
        );
        setRecords(data);
      } catch (error) {
        console.error('Error loading public records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [candidateId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-20 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  const filteredRecords = filterCategory === 'all'
    ? records
    : records.filter(r => r.category === filterCategory);

  const recordsByCategory = {};
  records.forEach(r => {
    if (!recordsByCategory[r.category]) {
      recordsByCategory[r.category] = [];
    }
    recordsByCategory[r.category].push(r);
  });

  return (
    <div className="space-y-6">
      {records.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No public records found</p>
        </div>
      ) : (
        <>
          {/* Filter */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({records.length})
              </button>
              {Object.keys(recordsByCategory).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]} ({recordsByCategory[cat].length})
                </button>
              ))}
            </div>
          </div>

          {/* Records */}
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-lg border-2 border-slate-300 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[record.category]}
                      </Badge>
                      <Badge className={`text-xs border ${STATUS_COLORS[record.status_label] || 'bg-slate-100 text-slate-700'}`}>
                        {record.status_label}
                      </Badge>
                    </div>
                    <p className="text-base text-slate-900 leading-relaxed font-normal">
                      {record.fact_statement}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 border-t border-slate-200 pt-3 mt-3">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Date:</span>
                    <span>{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Source:</span>
                    <span>{record.source_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Type:</span>
                    <span>{record.source_type.replace('_', ' ')}</span>
                  </div>
                </div>

                <a
                  href={record.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Primary Source
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
        <p className="text-sm text-slate-600">
          All information shown is sourced and time-stamped. Interpretation and judgment belong to the user.
        </p>
      </div>
    </div>
  );
}