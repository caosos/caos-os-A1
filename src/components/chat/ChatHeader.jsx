import React, { useState } from 'react';
import { ChevronDown, MessageSquare, FolderOpen, Folder, Monitor, User, Shield, LogOut, Plus, Image, FileText, ChevronRight } from 'lucide-react';
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

export default function ChatHeader({ user, onNewThread, onShowThreads, onShowProfile }) {
  const handleLogout = () => {
    localStorage.removeItem('caos_user');
    window.location.href = '/';
  };

  return (
    <div className="flex items-center justify-between px-4 py-4">
      {/* Left side - User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <span className="text-white font-medium">{user?.full_name || 'User'}</span>
          <ChevronDown className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56 bg-[#1a2744]/95 backdrop-blur-xl border-white/10 text-white"
          align="start"
        >
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 data-[state=open]:bg-white/10">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span>Desktop</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-[#1a2744]/95 backdrop-blur-xl border-white/10 text-white min-w-[180px]" sideOffset={8}>
                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Files</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                  <Image className="w-4 h-4 text-blue-400" />
                  <span>Photos</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white">
                  <Folder className="w-4 h-4 text-blue-400" />
                  <span>Folders</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem 
            onClick={onNewThread}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>New Thread</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onShowThreads}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
          >
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span>Previous Threads</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={onShowProfile}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer text-white hover:bg-white/10 focus:bg-white/10 focus:text-white"
          >
            <LogOut className="w-4 h-4 text-blue-400" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>

        {/* Center - CAOS branding */}
        <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-white font-bold text-xl">CAOS</h1>
        <p className="text-white/60 text-xs">Cognitive Adaptive Operating Space</p>
        </div>

        </div>
        );
        }