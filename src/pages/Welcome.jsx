import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StarfieldBackground from '@/components/chat/StarfieldBackground';

export default function Welcome() {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        navigate(createPageUrl('Chat'));
      } else {
        setChecking(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl('Chat'));
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <StarfieldBackground />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <StarfieldBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md w-full"
      >
        <motion.h1 
          className="text-5xl md:text-6xl font-light text-white tracking-[0.3em] mb-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          CAOS
        </motion.h1>
        
        <motion.p 
          className="text-white/70 text-sm md:text-base tracking-wider mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          Cognitive Adaptive Operating Space
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-3"
        >
          <Button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl text-lg font-medium shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:scale-105"
          >
            Sign In / Create Account
          </Button>
          <p className="text-white/50 text-xs text-center">
            New users will be prompted to create an account
          </p>
        </motion.div>
      </motion.div>
      
      {/* Subtle glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}