import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StarfieldBackground from '@/components/chat/StarfieldBackground';

export default function Welcome() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('caos_user');
    if (storedUser) {
      navigate(createPageUrl('Chat'));
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const user = {
      id: Math.random().toString(36).substring(7),
      full_name: name,
      email: email,
      created_date: new Date().toISOString(),
    };
    
    localStorage.setItem('caos_user', JSON.stringify(user));
    navigate(createPageUrl('Chat'));
  };

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
        
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="space-y-4"
        >
          <Input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
          />
          <Input
            type="email"
            placeholder="Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-blue-400"
          />
          <Button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl text-lg font-medium shadow-lg shadow-blue-600/25 transition-all hover:shadow-blue-600/40 hover:scale-105 disabled:opacity-50"
          >
            {isLoading ? 'Starting...' : 'Get Started'}
          </Button>
        </motion.form>
      </motion.div>
      
      {/* Subtle glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}