import { X, Heart, MessageSquare, Share2, Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Journal } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';

interface MediaPreviewModalProps {
  url: string | null;
  journal?: Journal | null;
  onClose: () => void;
  onLike?: () => void;
}

export function MediaPreviewModal({ url, journal, onClose, onLike }: MediaPreviewModalProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [sentUsers, setSentUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (url) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [url, onClose]);

  useEffect(() => {
    if (showShareSheet && users.length === 0) {
      supabase.from('users').select('id, display_name, username, photo_url').then(({ data }) => {
        if (data) setUsers(data.filter(u => u.id !== profile?.id));
      });
    }
  }, [showShareSheet, profile]);

  if (!url) return null;

  const isAudio = /\.(mp3|m4a|wav|ogg)(\?.*)?$/i.test(url) || url.includes('voicenote_');
  const isVideo = /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(url) && !isAudio;

  if (isAudio) return null;

  const handleSendToUser = async (userId: string) => {
    if (!profile || !journal) return;
    try {
      await supabase.from('messages').insert([{
        text: JSON.stringify({ type: 'share', journalId: journal.id, receiverId: userId }),
        sender_id: profile.id,
        sender_name: profile.displayName,
      }]);
      setSentUsers(prev => ({ ...prev, [userId]: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = async () => {
    if (!journal) return;
    const link = `${window.location.origin}/journal/${journal.id}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLiked = profile && journal?.likes?.includes(profile.id);

  return (
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-[101] rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[95vh] flex flex-col"
          >
            <div className="relative flex-1 min-h-0 flex flex-col items-center justify-center rounded-2xl overflow-hidden shadow-2xl bg-black">
              {isVideo ? (
                <video
                  src={url}
                  className="h-full w-full object-contain"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <img
                  src={url}
                  alt="Expanded preview"
                  className="h-full w-full object-contain"
                />
              )}
              
              {/* Share Sheet Overlay */}
              <AnimatePresence>
                {showShareSheet && (
                  <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col p-6"
                  >
                    <div className="flex items-center justify-between text-white mb-6">
                      <h3 className="text-xl font-bold">Share</h3>
                      <button onClick={() => setShowShareSheet(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                      {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden shrink-0">
                              {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : null}
                            </div>
                            <div className="text-white">
                              <p className="font-semibold text-sm">{u.display_name}</p>
                              <p className="text-xs text-gray-400">@{u.username}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleSendToUser(u.id)}
                            disabled={sentUsers[u.id]}
                            className={cn(
                              "px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2",
                              sentUsers[u.id] ? "bg-gray-800 text-gray-400" : "bg-white text-black hover:bg-gray-200"
                            )}
                          >
                            {sentUsers[u.id] ? 'Sent' : 'Send'}
                          </button>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleCopyLink}
                      className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                      {copied ? 'Copied Link' : 'Copy Link'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {journal && !showShareSheet && (
              <div className="flex items-center justify-start gap-6 pt-4 px-2 shrink-0">
                <button 
                  onClick={(e) => { e.stopPropagation(); onLike?.(); }}
                  className={cn("flex items-center gap-2 group transition-colors", isLiked ? "text-red-500" : "text-white/90 hover:text-white")}
                >
                  <div className="p-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors backdrop-blur-sm">
                    <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
                  </div>
                  <span className="font-medium text-lg drop-shadow-md">{journal.likes?.length || 0}</span>
                </button>
                
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onClose();
                    navigate(`/journal/${journal.id}#comments`);
                  }}
                  className="flex items-center gap-2 group text-white/90 hover:text-white transition-colors"
                >
                  <div className="p-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors backdrop-blur-sm">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-lg drop-shadow-md">{journal.commentCount || 0}</span>
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); setShowShareSheet(true); }}
                  className="flex items-center gap-2 group text-white/90 hover:text-white transition-colors"
                >
                  <div className="p-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors backdrop-blur-sm">
                    <Send className="h-6 w-6" />
                  </div>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
