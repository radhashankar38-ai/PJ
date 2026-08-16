import { useEffect, useState, FormEvent } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { supabase } from '../supabase';
import { Journal } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, BookOpen, Handshake, Sparkles, Lock, Loader2, Edit2, Trash2, X, Check, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { extractTimeCapsule } from '../lib/timecapsule';

function getReadingTime(text: string) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

export function TimeCapsule() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{url: string, journalId: string} | null>(null);

  useEffect(() => {
    if (!profile) {
      navigate('/');
      return;
    }

    const fetchMyJournals = async () => {
      setLoading(true);
      let { data, error } = await supabase
        .from('journals')
        .select('*, users(photo_url)')
        .eq('author_id', profile.id)
        .gt('unlock_date', new Date().toISOString())
        .order('unlock_date', { ascending: true });

      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('journals')
          .select('*, users(photo_url)')
          .eq('author_id', profile.id)
          .order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (data) {
        const mappedJournals = data.map((item: any) => {
          const { unlockDate: embeddedUnlock, cleanContent } = extractTimeCapsule(item.content);
          return {
            id: item.id,
            title: item.title,
            content: cleanContent,
            authorId: item.author_id,
            authorName: item.author_name,
            authorUsername: item.author_username,
            authorPhotoURL: item.users?.photo_url,
            isPublic: item.is_public,
            imageUrls: item.image_urls,
            createdAt: item.created_at,
            likes: item.likes || [],
            understands: item.understands || [],
            inspired: item.inspired || [],
            commentCount: item.comment_count || 0,
            unlockDate: item.unlock_date || embeddedUnlock,
            locationName: item.location_name
          };
        }).filter((item: any) => {
          if (item.unlockDate && new Date(item.unlockDate) > new Date()) return true;
          return false;
        });
        setJournals(mappedJournals);
      }
      setLoading(false);
    };

    fetchMyJournals();
  }, [profile, navigate]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('journals').delete().eq('id', id);
    if (!error) {
      setJournals(prev => prev.filter(j => j.id !== id));
      setConfirmDeleteId(null);
    } else {
      console.error('Failed to delete journal');
    }
  };

  const startEditing = (journal: Journal) => {
    setEditingId(journal.id);
    setEditTitle(journal.title);
    setEditContent(journal.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSavingId(id);
    const { error } = await supabase
      .from('journals')
      .update({ title: editTitle, content: editContent })
      .eq('id', id);
      
    if (!error) {
      setJournals(prev => prev.map(j => j.id === id ? { ...j, title: editTitle, content: editContent } : j));
      setEditingId(null);
    } else {
      alert('Failed to update journal');
    }
    setSavingId(null);
  };

  const handleLike = async (journalId: string, likes: string[]) => {
    if (!profile) return;
    const isLiked = likes.includes(profile.id);
    
    let newLikes = [];
    if (isLiked) {
      newLikes = likes.filter(id => id !== profile.id);
    } else {
      newLikes = [...likes, profile.id];
    }
    
    // Optimistic update
    setJournals(prev => prev.map(j => 
      j.id === journalId ? { ...j, likes: newLikes } : j
    ));

    const { error } = await supabase
      .from('journals')
      .update({ likes: newLikes })
      .eq('id', journalId);

    if (error) {
      // Revert on error
      setJournals(prev => prev.map(j => 
        j.id === journalId ? { ...j, likes } : j
      ));
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl mb-4">
          Time Capsule
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Manage your personal journals and reflections.
        </p>
      </div>

      <div className="space-y-8">
        {journals.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No scheduled posts yet</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Schedule a post to be unlocked in the future.</p>
            <Link to="/write" className="mt-6 inline-flex items-center justify-center rounded-full bg-gray-900 dark:bg-white px-6 py-2.5 text-sm font-semibold text-white dark:text-gray-900 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 transition-all">
              Write your first entry
            </Link>
          </div>
        ) : (
          journals.map((journal) => {
            const isLocked = journal.unlockDate && new Date(journal.unlockDate) > new Date();
            const isEditing = editingId === journal.id;

            return (
              <motion.article 
                key={journal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex flex-col items-start justify-between rounded-3xl bg-white dark:bg-gray-900/50 p-6 sm:p-8 shadow-[0_2px_20px_-8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_20px_-8px_rgba(255,255,255,0.02)] border border-gray-100 dark:border-gray-800 transition-all hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_8px_30px_-12px_rgba(255,255,255,0.05)]"
              >
                <div className="flex w-full items-center justify-between gap-x-4 mb-6">
                  <div className="flex items-center gap-x-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 shadow-sm">
                      {journal.authorPhotoURL ? (
                        <img src={journal.authorPhotoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold text-lg">
                          {journal.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="text-sm leading-6">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {journal.authorName}
                      </p>
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <time dateTime={journal.createdAt}>{formatDistanceToNow(new Date(journal.createdAt), { addSuffix: true })}</time>
                        {journal.locationName && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{journal.locationName}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{getReadingTime(journal.content)} min read</span>
                        {!journal.isPublic && (
                          <>
                            <span>•</span>
                            <Lock className="w-3 h-3 text-gray-400" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full relative z-10">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="block w-full border-0 border-b border-gray-200 dark:border-gray-800 bg-transparent px-0 py-2 text-2xl font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-gray-900 dark:focus:border-white focus:ring-0"
                        placeholder="Title"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={5}
                        className="block w-full resize-none border-0 bg-transparent px-0 py-2 text-base text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:ring-0"
                        placeholder="Content..."
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(journal.id)}
                          disabled={savingId === journal.id}
                          className="flex items-center gap-1 rounded-full bg-gray-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50"
                        >
                          {savingId === journal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link to={`/journal/${journal.id}`} className="group/link block">
                        <h3 className="mt-3 text-2xl font-bold leading-tight text-gray-900 dark:text-white group-hover/link:text-gray-600 dark:group-hover/link:text-gray-300 transition-colors">
                          {journal.title}
                        </h3>
                      </Link>

                      {journal.imageUrls && journal.imageUrls.length > 0 && !isLocked && (
                        <div className="mt-6 aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                          {(() => {
                            const url = journal.imageUrls[0];
                            const isAudio = /\.(mp3|m4a|wav|ogg)(\?.*)?$/i.test(url) || url.includes('voicenote_');
                            const isVideo = /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(url) && !isAudio;
                            
                            if (isAudio) {
                              return (
                                <div className="w-full h-full flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
                                  <audio controls src={url} className="w-full" />
                                </div>
                              );
                            }
                            if (isVideo) {
                              return (
                                <div className="w-full h-full relative cursor-pointer group/media" onClick={() => setPreviewMedia({url, journalId: journal.id})}>
                                  <video src={url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                </div>
                              );
                            }
                            return (
                              <div className="w-full h-full cursor-pointer" onClick={() => setPreviewMedia({url, journalId: journal.id})}>
                                <img src={url} alt="Journal cover" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                              </div>
                            );
                          })()}
                        </div>
                      )}
                      
                      {isLocked ? (
                        <div className="mt-4 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center">
                          <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            Locked until {new Date(journal.unlockDate!).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-4 line-clamp-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                          {journal.content}
                        </p>
                      )}
                    </>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 w-full pt-6 border-t border-gray-100 dark:border-gray-800/60">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium mr-4">
                        <Heart className="w-4 h-4" /> {journal.likes?.length || 0}
                      </div>
                      <Link to={`/journal/${journal.id}#comments`} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors text-sm font-medium mr-4">
                        <MessageSquare className="w-4 h-4" /> {journal.commentCount || 0}
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditing(journal)}
                        className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      
                      {confirmDeleteId === journal.id ? (
                        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-800/30">
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(journal.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs font-bold rounded-full transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 text-xs font-bold rounded-full transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(journal.id)}
                          className="btn-delete-animated ml-2"
                          title="Delete Options"
                        >
                          <svg viewBox="0 0 448 512" className="svgIcon"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.article>
            );
          })
        )}
      </div>
      <MediaPreviewModal 
        url={previewMedia?.url || null} 
        journal={previewMedia ? journals.find(j => j.id === previewMedia.journalId) : null}
        onClose={() => setPreviewMedia(null)}
        onLike={() => {
          if (previewMedia) {
            const activeJournal = journals.find(j => j.id === previewMedia.journalId);
            if (activeJournal) handleLike(activeJournal.id, activeJournal.likes || []);
          }
        }}
      />
    </div>
  );
}
