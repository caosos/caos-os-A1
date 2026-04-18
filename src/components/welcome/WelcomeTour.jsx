import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ChevronRight } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'intro',
    title: 'Welcome to CAOS',
    body: 'Your personal AI operating system. Aria is your assistant — she thinks, remembers, and works with you across every session.',
    target: null, // centered modal
    position: 'center',
  },
  {
    id: 'input',
    title: 'Start here',
    body: 'Type anything — a question, a task, code, a plan. Aria reads it and responds with real intelligence, not canned replies.',
    target: 'tour-input',
    position: 'top',
  },
  {
    id: 'threads',
    title: 'Your threads',
    body: 'Every conversation is saved automatically. Switch between threads, search your history, and pick up exactly where you left off.',
    target: 'tour-threads',
    position: 'bottom',
  },
  {
    id: 'memory',
    title: 'Aria remembers',
    body: 'Tell Aria to remember something and she will — across every future session. Your preferences, your projects, your context.',
    target: 'tour-memory',
    position: 'bottom',
  },
  {
    id: 'files',
    title: 'Attach anything',
    body: 'Drop in files, images, screenshots, or take a photo. Aria can see, read, and reason about everything you share.',
    target: 'tour-files',
    position: 'top',
  },
];

export default function WelcomeTour({ onFinish, onSkip }) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isCenter = current.position === 'center';

  const next = () => {
    if (isLast) {
      onFinish();
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Simulated app preview behind the tooltip */}
      <div className="absolute inset-0 flex items-end justify-center pb-32 px-4 pointer-events-none select-none">
        <div className="w-full max-w-xl">
          {/* Fake chat bubbles */}
          <div className="space-y-3 mb-4 opacity-30">
            <div className="flex justify-end">
              <div className="bg-white/20 rounded-2xl rounded-br-md px-4 py-2.5 text-white/80 text-sm max-w-xs">
                What can you help me with today?
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-2xl rounded-bl-md px-4 py-2.5 text-white/80 text-sm max-w-xs">
                Almost anything — let's start with what's on your mind.
              </div>
            </div>
          </div>

          {/* Fake input bar */}
          <div
            data-tour="tour-input"
            className={`relative bg-white/10 border rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
              current.target === 'tour-input'
                ? 'border-blue-400/80 ring-2 ring-blue-400/40 bg-white/15 opacity-100'
                : 'border-white/15 opacity-40'
            }`}
          >
            <span
              data-tour="tour-files"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                current.target === 'tour-files'
                  ? 'bg-blue-500/50 ring-2 ring-blue-400/60'
                  : 'bg-white/10'
              }`}
            >
              <span className="text-white/70 text-sm">＋</span>
            </span>
            <span className="text-white/40 text-sm flex-1">Type a message...</span>
            <span className="w-8 h-8 bg-blue-600/60 rounded-lg flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-white" />
            </span>
          </div>

          {/* Fake thread pills */}
          <div
            data-tour="tour-threads"
            className={`flex gap-2 mt-3 transition-all duration-300 ${
              current.target === 'tour-threads' ? 'opacity-100' : 'opacity-30'
            }`}
          >
            {['Project Alpha', 'Immigration plan', 'CAOS build'].map((t, i) => (
              <span
                key={i}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  current.target === 'tour-threads'
                    ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Fake memory badge */}
          <div
            data-tour="tour-memory"
            className={`mt-3 flex items-center gap-2 transition-all duration-300 ${
              current.target === 'tour-memory' ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <span
              className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                current.target === 'tour-memory'
                  ? 'bg-green-500/20 border-green-400/40 text-green-300'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              🧠 Memory: 12 facts saved
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 bg-[#0f1f3d]/98 backdrop-blur-xl border border-blue-400/40 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl shadow-black/60"
        >
          {/* Skip button */}
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step indicator */}
          <div className="flex gap-1 mb-4">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-blue-400' : i < step ? 'w-3 bg-blue-400/50' : 'w-3 bg-white/20'
                }`}
              />
            ))}
          </div>

          <h3 className="text-white font-bold text-lg mb-2">{current.title}</h3>
          <p className="text-white/70 text-sm leading-relaxed mb-5">{current.body}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={onSkip}
              className="text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              Skip tour
            </button>
            <motion.button
              onClick={next}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {isLast ? 'Get started' : 'Next'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}