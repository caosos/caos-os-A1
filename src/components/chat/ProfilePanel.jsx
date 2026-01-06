import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, Shield, Brain, Terminal, Activity, Cake } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function ProfilePanel({ isOpen, onClose, user, multiAgentMode, onMultiAgentModeChange }) {
  const [rememberConversations, setRememberConversations] = useState(true);
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [birthday, setBirthday] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('caos_remember_conversations');
    if (saved !== null) {
      setRememberConversations(saved === 'true');
    }
    if (user?.date_of_birth) {
      setBirthday(user.date_of_birth);
    }
  }, [user]);

  const handleToggleMemory = (checked) => {
    setRememberConversations(checked);
    localStorage.setItem('caos_remember_conversations', checked.toString());
  };

  const handleSaveBirthday = async () => {
    if (!birthday) return;
    try {
      await base44.auth.updateMe({ date_of_birth: birthday });
      setIsEditingBirthday(false);
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Error saving birthday:', error);
      alert('Failed to save birthday');
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    return moment().diff(moment(dob), 'years');
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
            className="fixed right-0 top-0 bottom-0 w-80 bg-[#0f1f3d]/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
              <h2 className="text-white font-semibold">Profile</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-medium mb-3">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h3 className="text-white font-semibold text-base">{user?.full_name || 'User'}</h3>
                <span className="text-white/50 text-xs capitalize">{user?.role || 'user'}</span>
              </div>

              {/* User Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white/50 text-[10px]">Email</p>
                    <p className="text-white text-xs truncate">{user?.email || 'No email'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <Calendar className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white/50 text-[10px]">Member since</p>
                    <p className="text-white text-xs">
                      {user?.created_date ? moment(user.created_date).format('MMM D, YYYY') : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-white/50 text-[10px]">Role</p>
                    <p className="text-white text-xs capitalize">{user?.role || 'User'}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/50 text-[10px]">Birthday</p>
                      {!isEditingBirthday ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white text-xs truncate">
                            {user?.date_of_birth 
                              ? `${moment(user.date_of_birth).format('MMM D, YYYY')} (${calculateAge(user.date_of_birth)})`
                              : 'Not set'}
                          </p>
                          <button
                            onClick={() => setIsEditingBirthday(true)}
                            className="text-blue-400 text-[10px] hover:text-blue-300 transition-colors flex-shrink-0"
                          >
                            {user?.date_of_birth ? 'Edit' : 'Add'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 mt-1.5">
                          <input
                            type="date"
                            value={birthday}
                            onChange={(e) => setBirthday(e.target.value)}
                            max="2026-01-06"
                            className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleSaveBirthday}
                              className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingBirthday(false);
                                setBirthday(user?.date_of_birth || '');
                              }}
                              className="flex-1 px-2 py-1 bg-white/10 hover:bg-white/20 text-white text-[10px] rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Brain className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs">Remember Conversations</p>
                      <p className="text-white/50 text-[10px]">Enable memory</p>
                    </div>
                  </div>
                  <Switch
                    checked={rememberConversations}
                    onCheckedChange={handleToggleMemory}
                    className="flex-shrink-0"
                  />
                </div>

                {user?.role === 'admin' && (
                  <>
                    <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Terminal className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs">Developer Mode</p>
                          <p className="text-white/50 text-[10px]">Split-screen</p>
                        </div>
                      </div>
                      <Switch
                        checked={localStorage.getItem('caos_developer_mode') === 'true'}
                        onCheckedChange={(checked) => {
                          localStorage.setItem('caos_developer_mode', checked.toString());
                          window.location.reload();
                        }}
                        className="flex-shrink-0"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs">Multi-Agent Mode</p>
                          <p className="text-white/50 text-[10px]">Collaboration</p>
                        </div>
                      </div>
                      <Switch
                        checked={multiAgentMode}
                        onCheckedChange={onMultiAgentModeChange}
                        className="flex-shrink-0"
                      />
                    </div>

                    <Link 
                      to={createPageUrl('Console')}
                      className="flex items-center gap-2 p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg border border-cyan-500/30 transition-colors"
                    >
                      <Activity className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-medium">System Console</p>
                        <p className="text-white/50 text-[10px]">Monitor metrics</p>
                      </div>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}