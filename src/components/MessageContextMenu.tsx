import { useEffect, useRef } from 'react';
import { Reply, CornerDownLeft, MessageSquare, Copy, Smile, Forward, Pin, Star, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  messageId: string;
  senderName: string;
  isMe: boolean;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onForward: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete?: () => void;
}

export function MessageContextMenu({ x, y, onClose, messageId, senderName, isMe, onReact, onReply, onCopy, onForward, onPin, onStar, onDelete }: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Add event listener with a small delay to avoid immediately closing 
    // from the right-click event itself if it propagated
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('scroll', handleClickOutside, { capture: true });
    }, 10);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('scroll', handleClickOutside, { capture: true });
    };
  }, [onClose]);

  const ACTIONS = [
    { icon: Reply, label: 'Reply', onClick: onReply },
    ...(isMe ? [] : [{ icon: CornerDownLeft, label: 'Reply privately', onClick: onReply }]),
    ...(isMe ? [] : [{ icon: MessageSquare, label: 'Message ' + senderName, onClick: () => {} }]),
    { icon: Copy, label: 'Copy', onClick: onCopy },
    { icon: Smile, label: 'React', onClick: () => {} },
    { icon: Forward, label: 'Forward', onClick: onForward },
    { icon: Pin, label: 'Pin', onClick: onPin },
    { icon: Star, label: 'Star', onClick: onStar },
    ...(isMe && onDelete ? [{ icon: Trash2, label: 'Delete', onClick: onDelete, destructive: true }] : []),
  ];

  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Ensure menu doesn't go off-screen
  const safeX = Math.min(x, window.innerWidth - 240);
  const safeY = Math.max(10, Math.min(y, window.innerHeight - 380));

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 flex flex-col gap-2"
      style={{ left: safeX, top: safeY }}
    >
      {/* Reactions Bar */}
      <div className="flex items-center gap-1 bg-[#202020] rounded-full p-2 shadow-xl border border-gray-800">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full transition-colors text-xl"
            onClick={() => { onReact(emoji); onClose(); }}
          >
            {emoji}
          </button>
        ))}
        <button 
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full transition-colors text-gray-400"
          onClick={() => { onClose(); }}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Action Menu */}
      <div className="w-60 bg-[#1c1c1c] text-white rounded-2xl shadow-xl border border-gray-800 py-2 max-h-[50vh] overflow-y-auto no-scrollbar">
        {ACTIONS.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              action.onClick();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-sm text-left"
          >
            <action.icon className={cn("w-4 h-4", action.destructive ? "text-red-500" : "text-gray-300")} />
            <span className={cn("font-medium", action.destructive ? "text-red-500" : "text-gray-200")}>{action.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
