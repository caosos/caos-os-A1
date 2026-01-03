import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { LogIn, UserPlus } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();

  const handleGuestLogin = () => {
    const guestUser = {
      full_name: 'Guest User',
      email: 'guest@caos.app',
      isGuest: true
    };
    localStorage.setItem('caos_guest_user', JSON.stringify(guestUser));
    navigate(createPageUrl('Chat'));
  };

  const handleGoogleLogin = () => {
    // Clear any guest data first
    localStorage.removeItem('caos_guest_user');
    localStorage.removeItem('caos_guest_conversations');
    localStorage.removeItem('caos_guest_messages');
    
    // Just navigate to Chat - base44 will auto-redirect to Google OAuth if not authenticated
    navigate(createPageUrl('Chat'));
  };

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center overflow-hidden">
      <StarfieldBackground />
      
      <div className="relative z-10 text-center px-6 max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-6xl font-bold text-white mb-3">
            CAOS
          </h1>
          <p className="text-lg text-white/70 mb-12">
            Cognitive Adaptive Operating Space
          </p>
          
          <div className="space-y-4">
            <motion.button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </motion.button>

            <motion.button
              onClick={handleGuestLogin}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-sm border border-blue-500/30 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus className="w-5 h-5" />
              Continue as Guest
            </motion.button>
          </div>

          <p className="text-white/40 text-sm mt-6">
            Guest mode stores your conversations locally
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10"
        >
          <div className="w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        </motion.div>
      </div>
    </div>
  );
}