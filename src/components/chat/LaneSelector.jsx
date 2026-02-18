import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function LaneSelector({ currentLane, onLaneChange }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const lanes = [
    { id: 'general', name: '💬 General', color: 'bg-white/10' },
    { id: 'ui', name: '🎨 UI/Design', color: 'bg-blue-500/20' },
    { id: 'backend', name: '⚙️ Backend', color: 'bg-green-500/20' },
    { id: 'tokens', name: '🧠 Memory/Tokens', color: 'bg-purple-500/20' },
    { id: 'immigration', name: '🗽 Immigration', color: 'bg-yellow-500/20' },
    { id: 'news', name: '📰 News', color: 'bg-red-500/20' }
  ];

  const activeLaneData = lanes.find(l => l.id === currentLane) || lanes[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition-colors text-white text-sm"
      >
        <span className={`px-2 py-0.5 rounded ${activeLaneData.color}`}>
          {activeLaneData.name}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 bg-[#0f1f3d] border border-white/20 rounded-lg shadow-xl overflow-hidden z-50 min-w-[200px]">
            {lanes.map(lane => (
              <button
                key={lane.id}
                onClick={() => {
                  onLaneChange(lane.id);
                  localStorage.setItem('caos_current_lane', lane.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-white/10 transition-colors ${
                  lane.id === currentLane ? 'bg-white/5' : ''
                }`}
              >
                <span className={`flex-1 text-white text-sm ${lane.color} px-2 py-1 rounded`}>
                  {lane.name}
                </span>
                {lane.id === currentLane && (
                  <span className="text-blue-400 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}