import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageSquare, Newspaper, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNavBar({ currentPage, user }) {
  const navItems = [
    { id: 'Chat', label: 'Chat', icon: MessageSquare, page: 'Chat' },
    { id: 'News', label: 'News', icon: Newspaper, page: 'News' },
    { id: 'Profile', label: 'Profile', icon: User, page: 'Profile' },
  ];

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-slate-900 dark:border-slate-800 z-40 md:hidden">
      <div className="flex justify-around items-center h-16 px-2 pb-[max(0px,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              className={cn(
                'flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors select-none',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
              title={item.label}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}