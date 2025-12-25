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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email) {
        toast.error('Please enter your email');
        setLoading(false);
        return;
      }
      
      await base44.users.inviteUser(email, 'user');
      toast.success('Success! Check your email for a login link to access your account.');
      setEmail('');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send invitation. You may already have an account.');
    } finally {
      setLoading(false);
    }
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
            Get your account access
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-medium"
            >
              {loading ? 'Sending...' : 'Send Login Link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/50 text-xs">
              We'll send you a secure login link via email
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate(createPageUrl('Chat'))}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Continue as guest
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}