import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { Loader2 } from 'lucide-react';

export default function GetStarted() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsLoading(true);
    
    // Store user info locally
    const userData = {
      full_name: name.trim(),
      email: email.trim(),
      created_at: new Date().toISOString()
    };
    
    localStorage.setItem('caos_user', JSON.stringify(userData));
    
    // Navigate to chat
    navigate(createPageUrl('Chat'));
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative">
      <StarfieldBackground />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-light text-white tracking-[0.3em] mb-2">
            CAOS
          </h1>
          <p className="text-white/70 text-sm tracking-wider">
            Create Your Account
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-white/80 text-sm mb-2">
                Your Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-white/80 text-sm mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-blue-500"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl text-base font-medium shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Get Started'
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>

      {/* Subtle glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}