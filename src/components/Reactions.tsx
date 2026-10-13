import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SmilePlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Journal } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const AVAILABLE_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '👏', '🤝', '✨', '🔥'];

interface ReactionsProps {
  journal: Journal;
  onUpdate: (journalId: string, updates: Partial<Journal>) => void;
}

export function Reactions({ journal, onUpdate }: ReactionsProps) {
  const { profile } = useAuth();
  const [showPopover, setShowPopover] = useState(false);

  // Parse all reactions
  const reactions: { emoji: string; userId: string }[] = [];
  
  (journal.likes || []).forEach(like => {
    const colonIndex = like.indexOf(':');
    if (colonIndex !== -1 && colonIndex < 10) {
      reactions.push({ emoji: like.substring(0, colonIndex), userId: like.substring(colonIndex + 1) });
    } else {
      reactions.push({ emoji: '❤️', userId: like });
    }
  });
  
  (journal.understands || []).forEach(uid => reactions.push({ emoji: '🤝', userId: uid }));
  (journal.inspired || []).forEach(uid => reactions.push({ emoji: '✨', userId: uid }));

  // Group by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = new Set();
    acc[r.emoji].add(r.userId);
    return acc;
  }, {} as Record<string, Set<string>>);

  const handleReact = async (emoji: string) => {
    if (!profile) return;
    
    setShowPopover(false);

    const isLegacyHeart = emoji === '❤️' && journal.likes?.includes(profile.id);
    const isLegacyUnderstand = emoji === '🤝' && journal.understands?.includes(profile.id);
    const isLegacyInspired = emoji === '✨' && journal.inspired?.includes(profile.id);
    
    const formattedLike = `${emoji}:${profile.id}`;
    const isNewLiked = journal.likes?.includes(formattedLike);

    const isReacted = isLegacyHeart || isLegacyUnderstand || isLegacyInspired || isNewLiked;

    let newLikes = [...(journal.likes || [])];
    let newUnderstands = [...(journal.understands || [])];
    let newInspired = [...(journal.inspired || [])];

    if (isReacted) {
      if (isLegacyHeart) newLikes = newLikes.filter(id => id !== profile.id);
      if (isLegacyUnderstand) newUnderstands = newUnderstands.filter(id => id !== profile.id);
      if (isLegacyInspired) newInspired = newInspired.filter(id => id !== profile.id);
      if (isNewLiked) newLikes = newLikes.filter(id => id !== formattedLike);
    } else {
      newLikes.push(formattedLike);
    }

    onUpdate(journal.id, { likes: newLikes, understands: newUnderstands, inspired: newInspired });

    try {
      await supabase
        .from('journals')
        .update({ likes: newLikes, understands: newUnderstands, inspired: newInspired })
        .eq('id', journal.id);
    } catch (error) {
      console.error("Error updating reaction:", error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 relative">
      {Object.entries(grouped).map(([emoji, userIds]) => {
        const count = userIds.size;
        const hasReacted = profile ? userIds.has(profile.id) : false;
        
        return (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200",
              hasReacted 
                ? "border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs font-semibold">{count}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
          title="Add Reaction"
        >
          <SmilePlus className="h-4 w-4" />
        </button>

        <AnimatePresence>
          {showPopover && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 bottom-full mb-2 z-50 flex gap-1 rounded-full bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-white dark:ring-opacity-10"
              >
                {AVAILABLE_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
