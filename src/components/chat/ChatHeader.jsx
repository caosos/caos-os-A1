import React, { useState } from 'react';
import { ChevronDown, MessageSquare, FolderOpen, Folder, Monitor, User, Shield, LogOut, Plus, Image, FileText, ChevronRight } from 'lucide-react';
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

export default function ChatHeader({ user, onNewThread, onShowThreads, onShowProfile, currentConversation }) {
  const handleLogout = () => {
    localStorage.removeItem('caos_user');
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-between px-4 py-4 w-full">
      {/* Left side - User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 focus:outline-none group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-white font-medium text-sm">{user?.full_name || 'User'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-white/70 group-hover:text-white transition-colors" />
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
                <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Files</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
                  <Image className="w-3.5 h-3.5 text-blue-400" />
                  <span>Photos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white text-sm">
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
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
          <h1 className="text-white font-bold text-xl">CAOS</h1>
          <p className="text-white/60 text-xs">Cognitive Adaptive Operating Space</p>
        </div>

        {/* Right - Thread Title */}
        {currentConversation && (
          <div className="text-right max-w-[120px] sm:max-w-[200px]">
            <p className="text-white/90 text-xs font-medium truncate">{currentConversation.title}</p>
            <p className="text-white/50 text-[10px] hidden sm:block">ID: {currentConversation.id.slice(0, 6)}</p>
          </div>
        )}
        </div>
        );
        }