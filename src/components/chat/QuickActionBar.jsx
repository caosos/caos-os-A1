import React, { useState } from 'react';
import { Newspaper, Lightbulb, ShoppingBag, Folder, Terminal, Gamepad2, Settings, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuickActionBar({
  onNewsClick,
  onBrainstormClick,
  onShoppingClick,
  onFilesClick,
  onTerminalToggle,
  onGameModeToggle,
  isDeveloperMode,
  isGameMode,
  isMultiAgentMode,
  onMultiAgentToggle,
  onDeveloperToggle
}) {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const actions = [
    {
      id: 'news',
      icon: Newspaper,
      label: 'News',
      color: 'hover:text-blue-400 hover:bg-blue-500/10',
      onClick: () => {
        onNewsClick?.();
        setActiveDropdown(null);
      }
    },
    {
      id: 'brainstorm',
      icon: Lightbulb,
      label: 'Brainstorm',
      color: 'hover:text-yellow-400 hover:bg-yellow-500/10',
      onClick: () => {
        onBrainstormClick?.();
        setActiveDropdown(null);
      }
    },
    {
      id: 'shopping',
      icon: ShoppingBag,
      label: 'Shopping',
      color: 'hover:text-green-400 hover:bg-green-500/10',
      onClick: () => {
        onShoppingClick?.();
        setActiveDropdown(null);
      }
    },
    {
      id: 'files',
      icon: Folder,
      label: 'Files',
      color: 'hover:text-purple-400 hover:bg-purple-500/10',
      onClick: onFilesClick
    }
  ];

  const modes = [
    {
      id: 'terminal',
      icon: Terminal,
      label: 'Terminal',
      active: false,
      onClick: onTerminalToggle,
      color: 'hover:text-cyan-400 hover:bg-cyan-500/10'
    },
    {
      id: 'gamemode',
      icon: Gamepad2,
      label: 'Game',
      active: isGameMode,
      onClick: onGameModeToggle,
      color: 'hover:text-pink-400 hover:bg-pink-500/10'
    },
    {
      id: 'multiagent',
      icon: Zap,
      label: 'Multi-Agent',
      active: isMultiAgentMode,
      onClick: onMultiAgentToggle,
      color: 'hover:text-orange-400 hover:bg-orange-500/10'
    },
    {
      id: 'developer',
      icon: Settings,
      label: 'Dev',
      active: isDeveloperMode,
      onClick: onDeveloperToggle,
      color: 'hover:text-red-400 hover:bg-red-500/10'
    }
  ];

  return (
    <div className="relative z-30 px-4 py-2">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5 flex-wrap">
        {/* Quick Actions */}
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 bg-white/5 border border-white/10 transition-all ${action.color}`}
              title={action.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{action.label}</span>
            </motion.button>
          );
        })}

        {/* Separator */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Mode Toggles */}
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={mode.onClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                mode.active
                  ? `${mode.color} bg-white/20 border-white/30 text-white`
                  : `text-white/70 bg-white/5 border-white/10 ${mode.color}`
              }`}
              title={mode.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}