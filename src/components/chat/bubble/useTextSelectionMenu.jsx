// useTextSelectionMenu.js — Selection menu state + effects extracted from ChatBubble.jsx
// PR2-A, Mar 7, 2026. Pure logic extraction — no DOM, no JSX.

import { useState, useRef, useEffect } from 'react';

export function useTextSelectionMenu(closeMenuTrigger) {
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const justSelectedRef = useRef(false);

  // Close on external trigger (e.g. user starts typing)
  useEffect(() => {
    if (closeMenuTrigger > 0) {
      setShowSelectionMenu(false);
    }
  }, [closeMenuTrigger]);

  // Close on click outside the menu or bubble
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      if (showSelectionMenu) {
        const menu = document.querySelector('[data-selection-menu]');
        const bubble = e.target.closest('[data-message-bubble]');
        if (!menu?.contains(e.target) && !bubble) {
          setShowSelectionMenu(false);
          window.getSelection().removeAllRanges();
        }
      }
    };

    if (showSelectionMenu) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 200);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showSelectionMenu]);

  const handleTextSelection = (e) => {
    if (e.type !== 'contextmenu') return;
    e.preventDefault();
    e.stopPropagation();

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && text.length > 0) {
      justSelectedRef.current = true;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);

      const spaceBelow = window.innerHeight - rect.bottom - 100;
      const menuHeight = 200;

      setMenuPosition({
        top: spaceBelow < menuHeight
          ? Math.max(20, rect.top + window.scrollY - menuHeight - 8)
          : rect.bottom + window.scrollY + 8,
        left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
      });
      setShowSelectionMenu(true);

      setTimeout(() => { justSelectedRef.current = false; }, 300);
    }
  };

  const closeMenu = () => {
    setShowSelectionMenu(false);
    window.getSelection().removeAllRanges();
  };

  return {
    showSelectionMenu,
    menuPosition,
    selectedText,
    handleTextSelection,
    closeMenu,
  };
}