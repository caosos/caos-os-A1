import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MessageSquare, FolderOpen, Folder, Monitor, User, Shield, LogOut, Plus, Image, FileText, ChevronRight, Key } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
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

export default function ChatHeader({ user, onNewThread, onShowThreads, onShowProfile, onShowFiles, currentConversation, sessionFilesCount }) {
  const navigate = useNavigate();
  const [showGuestLogoutDialog, setShowGuestLogoutDialog] = useState(false);
  
  const handleLogout = async () => {
    const isGuest = !!localStorage.getItem('caos_guest_user');
    if (isGuest) {
      setShowGuestLogoutDialog(true);
    } else {
      // Clear all CAOS data
      localStorage.clear();
      sessionStorage.clear();
      
      // Call Base44 logout and manually navigate
      await base44.auth.logout();
      navigate(createPageUrl('Welcome'));
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
    <div className="px-4 py-3 w-full">
      {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left side - User menu (stays left on desktop) */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 focus:outline-none group">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-xs">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-white font-medium text-sm truncate max-w-[80px]">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown className="w-3 h-3 text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
          </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-48 bg-[#1a2744]/95 backdrop-blur-xl border-white/10 text-white"
          align="start"
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
                <DropdownMenuItem onClick={() => onShowFiles('folders')} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span>Folders</span>
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

        {/* Center - CAOS branding */}
        <div className="text-center sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2 order-first sm:order-none pointer-events-none">
          <h1 className="text-white font-bold text-xl">CAOS</h1>
          <p className="text-white/60 text-xs">Cognitive Adaptive Operating Space</p>
        </div>

        {/* Right - Thread Title */}
        {currentConversation && (
          <div className="text-right max-w-[120px] sm:max-w-[200px] ml-auto pointer-events-none">
            <p className="text-white/90 text-xs font-medium truncate">
              {currentConversation.title.split(' ').slice(0, 3).join(' ') + (currentConversation.title.split(' ').length > 3 ? '...' : '')}
            </p>
          </div>
        )}
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