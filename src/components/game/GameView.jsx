import React, { useState, useEffect } from 'react';
import { ExternalLink, Gamepad2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function GameView({ availableTokens }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdmin();
  }, []);
  const [gameUrl, setGameUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const presetGames = [
    { name: 'Cool Math Games', url: 'https://www.coolmathgames.com/', icon: '🎲' },
    { name: 'Poki Games', url: 'https://poki.com/', icon: '🕹️' },
    { name: 'Pac-Man', url: 'https://www.pacman.com/', icon: '👾' },
    { name: 'CrazyGames', url: 'https://www.crazygames.com/', icon: '🎮' },
    { name: 'Minecraft Classic', url: 'https://classic.minecraft.net/', icon: '⛏️' },
    { name: 'Y8 Games', url: 'https://www.y8.com/', icon: '🕹️' },
  ];

  const handleLoadGame = (url) => {
    setGameUrl(url);
    setShowCustomInput(false);
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      let url = customUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setGameUrl(url);
      setShowCustomInput(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a1628]">
      {/* Game Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border-b border-white/10 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-white font-semibold text-sm">Game Mode Active</h3>
              <p className="text-white/60 text-xs">
                {isAdmin ? '∞ Admin Access' : `${availableTokens} tokens remaining`}
              </p>
            </div>
          </div>
          {gameUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setGameUrl('')}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Change Game
            </Button>
          )}
        </div>
      </div>

      {/* Game Content */}
      {!gameUrl ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-4">
            <div className="text-center mb-6">
              <Gamepad2 className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-white text-xl font-bold mb-2">Choose Your Game</h2>
              <p className="text-white/60 text-sm">Select a game or enter a custom URL</p>
            </div>

            {/* Preset Games */}
            <div className="grid grid-cols-2 gap-3">
              {presetGames.map((game) => (
                <button
                  key={game.name}
                  onClick={() => handleLoadGame(game.url)}
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg transition-all group"
                >
                  <div className="text-3xl mb-2">{game.icon}</div>
                  <div className="text-white text-sm font-medium">{game.name}</div>
                </button>
              ))}
            </div>

            {/* Custom URL */}
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-all text-white text-sm flex items-center justify-center gap-2"
              >
                <Globe className="w-4 h-4" />
                Enter Custom URL
              </button>
            ) : (
              <div className="space-y-2">
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomUrl()}
                  placeholder="Enter game URL..."
                  className="bg-white/10 border-white/20 text-white placeholder-white/40"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleCustomUrl}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Load Game
                  </Button>
                  <Button
                    onClick={() => setShowCustomInput(false)}
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <p className="text-white/40 text-xs text-center mt-4">
              Note: Some sites block embedding. Use "Open in new tab" button if game doesn't load.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <iframe
            src={gameUrl}
            className="w-full h-full border-0"
            title="Game"
            allow="fullscreen; gamepad; microphone; camera"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
          />
          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white/70 hover:text-white transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}