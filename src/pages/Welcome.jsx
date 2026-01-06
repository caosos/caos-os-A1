import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { LogIn, UserPlus } from 'lucide-react';

export default function Welcome() {
  const navigate = useNavigate();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');

  // Check if user is already authenticated
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          navigate(createPageUrl('Chat'));
        }
      } catch (err) {
        // Not authenticated, stay on welcome page
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGuestSignup = (e) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      const user = {
        full_name: name.trim(),
        email: email.trim(),
        isGuest: true
      };
      localStorage.setItem('caos_guest_user', JSON.stringify(user));
      navigate(createPageUrl('Chat'));
    }
  };

  const handleAuthLogin = () => {
    // Navigate to Chat - Base44 will handle OAuth automatically
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

          <motion.button
              onClick={handleAuthLogin}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogIn className="w-5 h-5" />
              Sign In with Base44
            </motion.button>

          <form onSubmit={handleGuestSignup} className="space-y-4 mt-6">
            <p className="text-white/60 text-sm text-center">Or try as guest:</p>
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 px-6 py-3.5 rounded-xl text-base focus:outline-none focus:border-blue-500/50 transition-all"
              required
            />

            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 px-6 py-3.5 rounded-xl text-base focus:outline-none focus:border-blue-500/50 transition-all"
              required
            />

            <motion.button
              type="submit"
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-300 flex items-center justify-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <UserPlus className="w-5 h-5" />
              Continue as Guest
            </motion.button>
            </form>

            <p className="text-white/40 text-sm mt-6">
            Guest conversations are stored locally only
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