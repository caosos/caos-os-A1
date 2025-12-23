import React from 'react';
import { motion } from 'framer-motion';

export default function WelcomeGreeting() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex justify-center mb-6"
    >
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 max-w-sm">
        <p className="text-white text-center text-sm leading-relaxed">
          Hello! How can I assist you today?
        </p>
      </div>
    </motion.div>
  );
}