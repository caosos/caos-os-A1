import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const greetings = [
  "Hello! How can I assist you today?",
  "Welcome back! What would you like to explore?",
  "Hi there! Ready to dive into something new?",
  "Good to see you! How can I help?",
  "Hey! What's on your mind today?",
  "Greetings! What shall we work on?",
  "Welcome! Let's create something amazing.",
  "Hello! What can I do for you?",
  "Hi! Ready when you are.",
  "Welcome to CAOS! How may I assist?"
];

export default function WelcomeGreeting() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex justify-center mb-6"
    >
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 max-w-sm">
        <p className="text-white text-center text-sm leading-relaxed">
          {greeting}
        </p>
      </div>
    </motion.div>
  );
}