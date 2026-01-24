import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function Ballot() {
  const [zipCode, setZipCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zip = params.get('zip');
    if (zip) {
      setZipCode(zip);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Ballot</h1>
          <p className="text-lg text-slate-600 mb-6">ZIP Code: {zipCode}</p>
          <p className="text-slate-500 max-w-md mx-auto">
            Ballot lookup integration with U.S. Vote Foundation API coming soon.
            Will show all candidates and measures on your specific ballot.
          </p>
        </div>
      </div>
    </div>
  );
}