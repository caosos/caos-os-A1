import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import WelcomeTour from '@/components/welcome/WelcomeTour';
import { LogIn, Sparkles, Brain, Search, FileText, Mic } from 'lucide-react';

const FEATURES = [
  { icon: Brain, label: 'Persistent Memory', desc: 'Aria remembers what matters across every session.' },
  { icon: Search, label: 'Web Search', desc: 'Real-time knowledge from the internet, built in.' },
  { icon: FileText, label: 'File Intelligence', desc: 'Upload files, images, docs — Aria reads them all.' },
  { icon: Mic, label: 'Voice Ready', desc: 'Speak to Aria or have her read responses aloud.' },
];

export default function Welcome() {
  const navigate = useNavigate();
  const [checking, setChecking] = React.useState(true);
  const [showTour, setShowTour] = useState(false);
  const authCheckRef = React.useRef(false);

  // ─── AUTH CHECK — LOCKED v2 2026-03-02 ───────────────────────────────────────
  // DO NOT ADD sessionStorage/localStorage locks here. OAuth redirects back to this
  // page on every login — any persistent flag will block the post-OAuth auth check
  // and cause a 404/broken state. The useRef guard is sufficient.
  // ─────────────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (authCheckRef.current) { setChecking(false); return; }
    authCheckRef.current = true;
    let mounted = true;
    const checkAuth = async () => {
      if (!mounted) return;
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth && mounted) { navigate(createPageUrl('Chat'), { replace: true }); return; }
      } catch {}
      if (mounted) setChecking(false);
    };
    checkAuth();
    const safetyTimer = setTimeout(() => { if (mounted) setChecking(false); }, 1500);
    return () => { mounted = false; clearTimeout(safetyTimer); };
  }, []);

  const handleSignIn = () => base44.auth.redirectToLogin(createPageUrl('Chat'));

  const handleTourFinish = () => {
    setShowTour(false);
    handleSignIn();
  };

  const handleTourSkip = () => {
    setShowTour(false);
    handleSignIn();
  };

  const handleGuestContinue = () => {
    const user = { full_name: 'Guest User', email: `guest_${Date.now()}@caos.local`, isGuest: true };
    localStorage.setItem('caos_guest_user', JSON.stringify(user));
    navigate(createPageUrl('Chat'));
  };

  if (checking) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center overflow-hidden">
        <StarfieldBackground />
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a1628] overflow-hidden">
      <StarfieldBackground />

      {/* Tour overlay */}
      <AnimatePresence>
        {showTour && (
          <WelcomeTour onFinish={handleTourFinish} onSkip={handleTourSkip} />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-12">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          {/* Glow orb */}
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-400/40 to-purple-500/40 border border-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-10 h-10 text-blue-300" />
            </div>
          </div>

          <h1 className="text-6xl sm:text-7xl font-bold text-white mb-3 tracking-tight">CAOS</h1>
          <p className="text-xl text-blue-300 font-light mb-2">Cognitive Adaptive Operating System</p>
          <p className="text-white/50 text-sm max-w-sm mx-auto">
            A personal AI platform that thinks, remembers, and works alongside you — not just answers questions.
          </p>
        </motion.div>

        {/* Feature tiles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10"
        >
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm"
            >
              <Icon className="w-5 h-5 text-blue-400 mb-1.5" />
              <p className="text-white text-xs font-semibold mb-0.5">{label}</p>
              <p className="text-white/40 text-[10px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="w-full max-w-sm space-y-3"
        >
          {/* Tour button — primary */}
          <motion.button
            onClick={() => setShowTour(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl text-base font-semibold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            Take the Tour
          </motion.button>

          {/* Sign in — secondary */}
          <motion.button
            onClick={handleSignIn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all backdrop-blur-sm flex items-center justify-center gap-3"
          >
            <LogIn className="w-5 h-5" />
            Sign In
          </motion.button>

          {/* Guest */}
          <button
            onClick={handleGuestContinue}
            className="w-full text-white/40 text-sm hover:text-white/70 transition-colors py-2"
          >
            Continue as Guest
          </button>
        </motion.div>

        {/* AI-readable structured metadata (visually subtle) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-10 text-center"
        >
          <p className="text-white/20 text-[10px] max-w-xs mx-auto leading-relaxed">
            CAOS · AI assistant platform · Aria AI persona · Memory system · Multi-provider inference (OpenAI, Gemini) · Web search · File intelligence · Voice I/O · Base44 platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}