import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { LogIn, UserPlus, Mail } from 'lucide-react';
import { Input } from "@/components/ui/input";

export default function Welcome() {
  const navigate = useNavigate();
  const [showEmailSignIn, setShowEmailSignIn] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Clear the logout flag on mount
  React.useEffect(() => {
    sessionStorage.removeItem('just_logged_out');
  }, []);

  const handleGuestContinue = () => {
    const user = {
      full_name: 'Guest User',
      email: `guest_${Date.now()}@caos.local`,
      isGuest: true
    };
    localStorage.setItem('caos_guest_user', JSON.stringify(user));
    navigate(createPageUrl('Chat'));
  };

  const handleGoogleSignIn = () => {
    navigate(createPageUrl('Chat'));
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // Create user with email sign-in
    const user = {
      full_name: email.split('@')[0],
      email: email,
      isGuest: true
    };
    localStorage.setItem('caos_guest_user', JSON.stringify(user));
    navigate(createPageUrl('Chat'));
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    
    // Create user with provided info
    const user = {
      full_name: name,
      email: email,
      isGuest: true
    };
    localStorage.setItem('caos_guest_user', JSON.stringify(user));
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

          {!showEmailSignIn && !showCreateAccount ? (
            <>
              <motion.button
                onClick={handleGoogleSignIn}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mb-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogIn className="w-5 h-5" />
                Sign In with Google
              </motion.button>

              <motion.button
                onClick={() => setShowEmailSignIn(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mb-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Mail className="w-5 h-5" />
                Sign In with Email
              </motion.button>

              <motion.button
                onClick={() => setShowCreateAccount(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserPlus className="w-5 h-5" />
                Create Account
              </motion.button>

              <p className="text-white/60 text-sm text-center my-4">or</p>

              <motion.button
                onClick={handleGuestContinue}
                className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue as Guest
              </motion.button>

              <p className="text-white/40 text-sm mt-6">
                Guest mode - data stored locally only
              </p>
            </>
          ) : showEmailSignIn ? (
            <motion.form
              onSubmit={handleEmailSignIn}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
              <motion.button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Sign In
              </motion.button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailSignIn(false);
                  setEmail('');
                }}
                className="w-full text-white/60 text-sm hover:text-white transition-colors"
              >
                Back
              </button>
            </motion.form>
          ) : (
            <motion.form
              onSubmit={handleCreateAccount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
              <motion.button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Account
              </motion.button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateAccount(false);
                  setName('');
                  setEmail('');
                }}
                className="w-full text-white/60 text-sm hover:text-white transition-colors"
              >
                Back
              </button>
            </motion.form>
          )}
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