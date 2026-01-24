import React from 'react';
import { Network } from 'lucide-react';

export default function NetworkView({ candidateId }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
      <Network className="w-16 h-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-slate-700 mb-2">Network Analysis</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        Committee memberships, bill cosponsors, and political network visualization coming soon.
      </p>
    </div>
  );
}