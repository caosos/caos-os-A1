import React from 'react';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import MemoryIsolationBlueprint from '@/components/docs/MemoryIsolationBlueprint';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft } from 'lucide-react';

export default function MemoryIsolationPage() {
  return (
    <div className="min-h-screen bg-[#0a1628] relative">
      <StarfieldBackground />
      
      <div className="relative z-10">
        <div className="p-4">
          <Link 
            to={createPageUrl('Chat')}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
        </div>
        
        <MemoryIsolationBlueprint />
      </div>
    </div>
  );
}