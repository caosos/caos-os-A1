import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, Shield, Brain, Terminal } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import moment from 'moment';

export default function ProfilePanel({ isOpen, onClose, user }) {
  const [rememberConversations, setRememberConversations] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('caos_remember_conversations');
    if (saved !== null) {
      setRememberConversations(saved === 'true');
    }
  }, []);

  const handleToggleMemory = (checked) => {
    setRememberConversations(checked);
    localStorage.setItem('caos_remember_conversations', checked.toString());
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-[#0f1f3d]/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-white font-semibold">Profile</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="flex-1 p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-medium mb-4">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h3 className="text-white font-semibold text-lg">{user?.full_name || 'User'}</h3>
                <span className="text-white/50 text-sm capitalize">{user?.role || 'user'}</span>
              </div>

              {/* User Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white/50 text-xs">Email</p>
                    <p className="text-white text-sm">{user?.email || 'No email'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white/50 text-xs">Member since</p>
                    <p className="text-white text-sm">
                      {user?.created_date ? moment(user.created_date).format('MMMM D, YYYY') : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white/50 text-xs">Role</p>
                    <p className="text-white text-sm capitalize">{user?.role || 'User'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white text-sm">Remember Conversations</p>
                      <p className="text-white/50 text-xs">Enable conversation memory</p>
                    </div>
                  </div>
                  <Switch
                    checked={rememberConversations}
                    onCheckedChange={handleToggleMemory}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white text-sm">Developer Mode</p>
                      <p className="text-white/50 text-xs">Split-screen terminal</p>
                    </div>
                  </div>
                  <Switch
                    checked={localStorage.getItem('caos_developer_mode') === 'true'}
                    onCheckedChange={(checked) => {
                      localStorage.setItem('caos_developer_mode', checked.toString());
                      window.location.reload();
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}