import React, { useState } from 'react';
import { ChevronDown, Settings, MoreHorizontal, MessageSquare, FolderOpen, Monitor, User, Shield, LogOut, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function ChatHeader({ user, onNewThread, onShowThreads, onShowProfile }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3">
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
          <DropdownMenuItem 
            onClick={onNewThread}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>New Thread</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onShowThreads}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span>Previous Threads</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={onShowProfile}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/10 focus:bg-white/10"
          >
            <LogOut className="w-4 h-4 text-blue-400" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <Settings className="w-5 h-5 text-white/70 hover:text-white" />
        </button>
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
          <MoreHorizontal className="w-5 h-5 text-white/70 hover:text-white" />
        </button>
      </div>
    </div>
  );
}