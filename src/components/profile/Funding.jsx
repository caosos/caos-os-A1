import React, { useState, useEffect } from 'react';
import { DollarSign, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function Funding({ candidateId }) {
  const [donations, setDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDonations = async () => {
      try {
        const data = await base44.entities.Donation.filter({ candidate_id: candidateId }, '-amount', 100);
        setDonations(data);
      } catch (error) {
        console.error('Error loading donations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDonations();
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

  const totalFunding = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
  const byCycle = {};
  const byIndustry = {};

  donations.forEach(d => {
    if (d.cycle) {
      byCycle[d.cycle] = (byCycle[d.cycle] || 0) + d.amount;
    }
    if (d.industry) {
      byIndustry[d.industry] = (byIndustry[d.industry] || 0) + d.amount;
    }
  });

  const topIndustries = Object.entries(byIndustry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold mb-4">Funding Overview</h2>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-600 mb-1">Total Raised</p>
            <p className="text-3xl font-bold text-slate-900">
              ${totalFunding.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Total Donors</p>
            <p className="text-3xl font-bold text-slate-900">
              {donations.length.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Election Cycles</p>
            <p className="text-3xl font-bold text-slate-900">
              {Object.keys(byCycle).length}
            </p>
          </div>
        </div>
      </div>

      {/* Top Industries */}
      {topIndustries.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-2xl font-semibold mb-4">Top Contributing Industries</h2>
          <div className="space-y-3">
            {topIndustries.map(([industry, amount]) => (
              <div key={industry} className="flex items-center justify-between">
                <span className="text-slate-700">{industry}</span>
                <span className="font-semibold text-slate-900">
                  ${amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Donations */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-2xl font-semibold mb-4">Recent Donations</h2>
        {donations.length > 0 ? (
          <div className="space-y-4">
            {donations.slice(0, 20).map((donation) => (
              <div key={donation.id} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{donation.donor_name}</p>
                    {donation.pac_name && (
                      <p className="text-sm text-slate-600">via {donation.pac_name}</p>
                    )}
                  </div>
                  <p className="font-semibold text-lg text-slate-900">
                    ${donation.amount.toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {donation.industry && <Badge variant="secondary">{donation.industry}</Badge>}
                  {donation.cycle && <Badge variant="outline">{donation.cycle}</Badge>}
                  <Badge variant="outline">
                    {new Date(donation.date).toLocaleDateString()}
                  </Badge>
                </div>
                {donation.source_url && (
                  <a
                    href={donation.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    FEC Record
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No donation records available</p>
        )}
      </div>
    </div>
  );
}