import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        navigate(createPageUrl('Chat'));
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSignIn = () => {
    base44.auth.redirectToLogin(createPageUrl('Chat'));
  };

  const handleGuest = () => {
    navigate(createPageUrl('Chat'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <StarfieldBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <h1 className="text-3xl font-light text-white tracking-wider text-center mb-2">
            CAOS
          </h1>
          <p className="text-white/60 text-sm text-center mb-8">
            Cognitive Adaptive Operating Space
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleSignIn}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-medium"
            >
              Sign In
            </Button>

            <Button
              onClick={handleGuest}
              variant="outline"
              className="w-full bg-white/5 hover:bg-white/10 text-white border-white/20 py-6 rounded-xl font-medium"
            >
              Continue as Guest
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}