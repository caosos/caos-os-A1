import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MessageSquare, FolderOpen, Folder, Monitor, User, Shield, LogOut, Plus, Image, FileText, ChevronRight, Key, Code, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ChatHeader({ user, onNewThread, onShowThreads, onShowProfile, onShowFiles, currentConversation, sessionFilesCount, onBootloader, bootloaderDisabled }) {
  const navigate = useNavigate();
  const [showGuestLogoutDialog, setShowGuestLogoutDialog] = useState(false);
  const [showExecution, setShowExecution] = useState(() => {
    return localStorage.getItem('caos_show_execution') === 'true';
  });

  const toggleExecution = () => {
    const newValue = !showExecution;
    setShowExecution(newValue);
    localStorage.setItem('caos_show_execution', String(newValue));
    window.dispatchEvent(new Event('caos-execution-toggle'));
  };
  
  const handleLogout = async () => {
    const isGuest = !!localStorage.getItem('caos_guest_user');
    if (isGuest) {
      setShowGuestLogoutDialog(true);
    } else {
      // Clear all CAOS data
      localStorage.clear();
      sessionStorage.clear();
      
      // Logout with explicit redirect to Welcome page
      base44.auth.logout(createPageUrl('Welcome'));
    }
  };

  const handleGuestLogoutConfirm = () => {
    localStorage.removeItem('caos_guest_user');
    localStorage.removeItem('caos_guest_conversations');
    localStorage.removeItem('caos_guest_messages');
    setShowGuestLogoutDialog(false);
    navigate(createPageUrl('Welcome'));
  };

  const handleCreateAccount = () => {
    setShowGuestLogoutDialog(false);
    navigate(createPageUrl('Chat'));
    // This will trigger Base44 OAuth
  };

  return (
    <div className="px-2 sm:px-4 py-1.5 sm:py-3 w-full relative">
      {/* Mobile: Compact single row, Desktop: Horizontal layout */}
      <div className="flex items-center justify-between gap-2">
        {/* Left side - User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 focus:outline-none group py-2 px-1 -ml-1 touch-manipulation">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-xs">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:inline text-white font-medium text-sm truncate max-w-[80px]">
                {user?.full_name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className="w-3 h-3 text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-48 bg-[#1a2744] backdrop-blur-xl border-white/10 text-white"
          align="start"
          sideOffset={8}
          style={{ zIndex: 9999 }}
        >
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 data-[state=open]:bg-white/10 text-sm">
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
              <span>Desktop</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-[#1a2744]/95 backdrop-blur-xl border-white/10 text-white min-w-[140px]" sideOffset={4}>
                <DropdownMenuItem onClick={() => onShowFiles('files')} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Files</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShowFiles('photos')} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
                  <Image className="w-3.5 h-3.5 text-blue-400" />
                  <span>Photos</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShowFiles('links')} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>Links</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem 
            onClick={onNewThread}
            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>New Thread</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onShowThreads}
            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Previous Threads</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={onShowProfile}
            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm"
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              const event = new CustomEvent('show-continuity-token');
              window.dispatchEvent(event);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            <span>Session Token</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-blue-400" />
            <span>Log Out</span>
          </DropdownMenuItem>

        </DropdownMenuContent>
        </DropdownMenu>

        {/* Center - CAOS branding - Mobile: compact, Desktop: full */}
        <div className="text-center absolute left-1/2 transform -translate-x-1/2 pointer-events-none">
          <h1 className="text-white font-bold text-base sm:text-xl">CAOS</h1>
          <p className="hidden sm:block text-white/60 text-xs">Cognitive Adaptive Operating Space</p>
        </div>

        {/* Right - Thread Title and Files */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {sessionFilesCount > 0 && (
            <button
              onClick={() => onShowFiles('files')}
              className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded text-[10px] sm:text-xs text-blue-300 transition-colors flex items-center gap-1"
            >
              📁 {sessionFilesCount}
            </button>
          )}
          {currentConversation && (
            <div className="text-right max-w-[80px] sm:max-w-[200px] pointer-events-none">
              <p className="text-white/90 text-[10px] sm:text-xs font-medium truncate">
                {currentConversation.title.split(' ').slice(0, 2).join(' ') + (currentConversation.title.split(' ').length > 2 ? '...' : '')}
              </p>
            </div>
          )}
        </div>
      </div>

        <AlertDialog open={showGuestLogoutDialog} onOpenChange={setShowGuestLogoutDialog}>
          <AlertDialogContent className="bg-[#0f1f3d]/95 backdrop-blur-xl border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Create an Account?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                You're currently using CAOS as a guest. Would you like to create an account to save your conversations and access them from anywhere?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                onClick={handleGuestLogoutConfirm}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
              >
                No, Log Out
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCreateAccount}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Yes, Create Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        );
        }