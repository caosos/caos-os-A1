import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Calendar, Shield, Brain, Terminal, Activity, Cake, Gamepad2, Lock, Unlock, Folder, FileText, Image as ImageIcon, HardDrive, AlertTriangle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import FileManager from '../files/FileManager';
import MemoryPanel from '@/components/profile/MemoryPanel';

export default function ProfilePanel({ isOpen, onClose, user, multiAgentMode, onMultiAgentModeChange, initialView }) {
  const [rememberConversations, setRememberConversations] = useState(true);
  const [isEditingBirthday, setIsEditingBirthday] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [availableTokens, setAvailableTokens] = useState(0);
  const [gameModeEnabled, setGameModeEnabled] = useState(false);
  const [activeView, setActiveView] = useState(initialView || 'profile'); // 'profile', 'files', 'photos', 'links', 'memory'
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('caos_remember_conversations');
    if (saved !== null) {
      setRememberConversations(saved === 'true');
    }
    if (user?.date_of_birth) {
      setBirthday(user.date_of_birth);
    }
    
    // Load game mode state
    const gameMode = localStorage.getItem('caos_game_mode') === 'true';
    setGameModeEnabled(gameMode);
    
    // Load available game tokens
    if (user?.email) {
      loadGameTokens();
    }
  }, [user]);

  const loadGameTokens = async () => {
    if (!user?.email) return;
    try {
      const tokens = await base44.entities.GameToken.filter({
        user_email: user.email,
        approved: true,
        spent: false
      });
      const total = tokens.reduce((sum, token) => sum + (token.tokens_earned || 0), 0);
      setAvailableTokens(total);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const handleToggleGameMode = (checked) => {
    const isAdmin = user?.role === 'admin';
    if (checked && availableTokens <= 0 && !isAdmin) {
      alert('You need approved tokens to unlock game mode!');
      return;
    }
    setGameModeEnabled(checked);
    localStorage.setItem('caos_game_mode', checked.toString());
    window.location.reload();
  };

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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete user account through auth
      await base44.auth.deleteAccount();
      // If successful, clear storage and redirect
      localStorage.clear();
      window.location.href = createPageUrl('Welcome');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again or contact support.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  return (
   <>
     {showMemoryPanel && <MemoryPanel onClose={() => setShowMemoryPanel(false)} />}
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
              <div className="flex items-center gap-2">
                {activeView !== 'profile' && (
                  <button
                    onClick={() => setActiveView('profile')}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/70" />
                  </button>
                )}
                <h2 className="text-white font-semibold capitalize">{activeView}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {activeView === 'profile' ? (
                <div className="p-6 overflow-y-auto h-full">
              {/* Avatar */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-medium mb-3">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <h3 className="text-white font-semibold text-base">{user?.full_name || 'User'}</h3>
                <span className="text-white/50 text-xs capitalize">{user?.role || 'user'}</span>
              </div>

              {/* File Management Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                <button
                  onClick={() => setActiveView('files')}
                  className="flex items-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 rounded-lg border border-green-500/30 transition-colors"
                >
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="text-white text-xs">Files</span>
                </button>
                <button
                  onClick={() => setActiveView('photos')}
                  className="flex items-center gap-2 p-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30 transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-xs">Photos</span>
                </button>
                <button
                  onClick={() => setActiveView('links')}
                  className="flex items-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-xs">Links</span>
                </button>
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

                <button
                  onClick={() => setShowMemoryPanel(true)}
                  className="w-full flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Brain className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs">Permanent Memories</p>
                      <p className="text-white/50 text-[10px]">View & edit</p>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs flex-shrink-0 ml-2">→</span>
                </button>

                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Brain className="w-4 h-4 text-green-400 flex-shrink-0" />
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

                {/* Game Mode Section */}
                <div className="p-2.5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg border border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Gamepad2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-white text-xs font-medium">Game Mode</p>
                        <p className="text-white/50 text-[10px]">
                          {user?.role === 'admin' ? 'Admin access' : 'Earn tokens to unlock'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'admin' || availableTokens > 0 ? (
                        <Unlock className="w-4 h-4 text-green-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-red-400" />
                      )}
                      <Switch
                        checked={gameModeEnabled}
                        onCheckedChange={handleToggleGameMode}
                        disabled={availableTokens <= 0 && user?.role !== 'admin'}
                        className="flex-shrink-0"
                      />
                    </div>
                  </div>
                  {user?.role !== 'admin' && (
                    <>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-white/60">Available Tokens:</span>
                        <span className={`font-bold ${availableTokens > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {availableTokens}
                        </span>
                      </div>
                      {availableTokens <= 0 && (
                        <p className="text-[10px] text-yellow-400 mt-1.5">
                          Complete homework/chores and get parent approval to earn tokens!
                        </p>
                      )}
                    </>
                  )}
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

                  <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/30 transition-colors text-red-400 font-medium text-sm mt-6"
                  >
                  <AlertTriangle className="w-4 h-4" />
                  Delete Account
                  </button>
                  </div>
                  </div>
                  ) : (
                  <FileManager 
                  user={user} 
                  viewType={activeView}
                  />
                  )}
                  </div>
                  </motion.div>
                  </>
                  )}
                  </AnimatePresence>

                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                  This action cannot be undone. Your account, all conversations, files, and memories will be permanently deleted. Are you absolutely sure?
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-4">
                  This will immediately remove all your data from our systems.
                  </div>
                  <div className="flex gap-3 justify-end">
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                  </div>
                  </AlertDialogContent>
                  </AlertDialog>
                  </>
                  );
                  }