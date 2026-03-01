import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MessageSquare, Newspaper, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'Chat', label: 'Chat', icon: MessageSquare, page: 'Chat' },
  { id: 'News', label: 'News', icon: Newspaper, page: 'News' },
  { id: 'Profile', label: 'Profile', icon: User, page: 'Profile' },
];

export default function BottomNavBar({ currentPage, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabPress = (item) => {
    const targetUrl = createPageUrl(item.page);
    const isAlreadyActive = currentPage === item.id;

    if (isAlreadyActive) {
      // Reset tab: clear search params and scroll to top
      navigate(targetUrl, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(targetUrl);
    }
  };

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-slate-900 dark:border-slate-800 z-40 md:hidden">
      <div className="flex h-20 pb-[max(0px,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabPress(item)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center transition-colors select-none active:opacity-70 border-none bg-transparent',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'text-gray-600 dark:text-gray-400'
              )}
              title={item.label}
            >
              <Icon className="w-7 h-7" />
              <span className="text-[11px] mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}