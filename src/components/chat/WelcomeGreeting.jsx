import React from 'react';
import { motion } from 'framer-motion';
import { Image, Upload, Monitor, List, Search, Zap } from 'lucide-react';

const CAPABILITIES = [
  {
    id: 'image',
    icon: Image,
    label: 'Create Image',
    hint: 'Generate an image for me',
    color: 'hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-300',
  },
  {
    id: 'upload',
    icon: Upload,
    label: 'Upload File',
    hint: null,
    color: 'hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300',
  },
  {
    id: 'screen',
    icon: Monitor,
    label: 'Capture Screen',
    hint: null,
    color: 'hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300',
  },
  {
    id: 'thread',
    icon: List,
    label: 'Continue Thread',
    hint: null,
    color: 'hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-purple-300',
  },
  {
    id: 'search',
    icon: Search,
    label: 'Search Chats',
    hint: null,
    color: 'hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-300',
  },
  {
    id: 'multi',
    icon: Zap,
    label: 'Multi-Model',
    hint: 'Compare responses from multiple models',
    color: 'hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-300',
  },
];

export default function WelcomeGreeting({ onShowThreads, onSetMessage }) {
  const handleTile = (cap) => {
    if ((cap.id === 'thread' || cap.id === 'search') && onShowThreads) {
      onShowThreads();
    } else if (cap.hint && onSetMessage) {
      onSetMessage(cap.hint);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg px-4"
    >
      <div className="text-center">
        <h2 className="text-white text-2xl font-bold tracking-tight mb-1">CAOS</h2>
        <p className="text-white/50 text-sm">Cognitive Adaptive Operating System — ask anything, create anything.</p>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        {CAPABILITIES.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <motion.button
              key={cap.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => handleTile(cap)}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium transition-all cursor-pointer ${cap.color}`}
            >
              <Icon className="w-4 h-4" />
              <span>{cap.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}