import { useEffect, useState, useRef, type FormEvent } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useParams, Link, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { Journal, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { Heart, ArrowLeft, Send, Handshake, Sparkles, BookOpen, Lock, Globe, Loader2, Users, Check, Copy, RotateCcw, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { Reactions } from '../components/Reactions';

function getReadingTime(text: string) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

export function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [journal, setJournal] = useState<Journal | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [previewMedia, setPreviewMedia] = useState<{url: string, journalId: string} | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchJournalAndFollow = async () => {
      const { data, error } = await supabase
        .from('journals')
        .select('*, users(photo_url)')
        .eq('id', id)
        .single();
        
      if (data) {
        setJournal({
          id: data.id,
          title: data.title,
          content: data.content,
          authorId: data.author_id,
          authorName: data.author_name,
          authorUsername: data.author_username,
          authorPhotoURL: data.users?.photo_url,
          isPublic: data.is_public,
          imageUrls: data.image_urls,
          createdAt: data.created_at,
          likes: data.likes || [],
          understands: data.understands || [],
          inspired: data.inspired || [],
          commentCount: data.comment_count || 0,
          unlockDate: data.unlock_date,
          locationName: data.location_name
        });
        
        if (profile) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', profile.id)
            .eq('following_id', data.author_id)
            .maybeSingle();
            
          setIsFollowing(!!followData);
        }
      }
      setLoading(false);
    };

    fetchJournalAndFollow();

    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, users(photo_url)')
        .eq('journal_id', id)
        .order('created_at', { ascending: false });
        
      if (data) {
        setComments(data.map((item: any) => ({
          id: item.id,
          journalId: item.journal_id,
          content: item.content,
          authorId: item.author_id,
          authorName: item.author_name,
          authorPhotoURL: item.users?.photo_url,
          createdAt: item.created_at
        })));
      }
    };
    
    fetchComments();

    const subscription = supabase
      .channel('public:comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `journal_id=eq.${id}` }, payload => {
        fetchComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  useEffect(() => {
    if (!loading && location.hash === '#comments') {
      setTimeout(() => {
        const commentsSection = document.getElementById('comments');
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' });
          if (commentInputRef.current) {
            commentInputRef.current.focus();
          }
        }
      }, 100);
    }
  }, [loading, location.hash]);

  const handleFollow = async () => {
    if (!profile || !journal) return;
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', journal.authorId);
          
        setIsFollowing(false);
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: profile.id, following_id: journal.authorId }]);
          
        setIsFollowing(true);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const handleReactionUpdate = (journalId: string, updates: Partial<Journal>) => {
    setJournal(prev => prev ? { ...prev, ...updates } : prev);
  };

  const handleLikeForModal = async () => {
    if (!profile || !journal || !id) return;
    const formattedLike = `❤️:${profile.id}`;
    const legacyLike = profile.id;
    const isLiked = journal.likes?.includes(formattedLike) || journal.likes?.includes(legacyLike);
    
    let newLikes = [...(journal.likes || [])];
    if (isLiked) {
      newLikes = newLikes.filter(uid => uid !== formattedLike && uid !== legacyLike);
    } else {
      newLikes.push(formattedLike);
    }
    
    handleReactionUpdate(id, { likes: newLikes });
    
    try {
      await supabase.from('journals').update({ likes: newLikes }).eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !id || !newComment.trim()) return;

    setSubmitting(true);
    try {
      await supabase.from('comments').insert([{
        journal_id: id,
        content: newComment.trim(),
        author_id: profile.id,
        author_name: profile.displayName,
      }]);
      
      // Update comment count
      await supabase.rpc('increment_comment_count', { journal_id: id });
      
      setNewComment('');
    } catch (error) {
      console.error("Error adding comment: ", error);
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) return <LoadingScreen />;
  if (!journal) return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Journal not found.</div>;

  const isLocked = journal.unlockDate && isAfter(new Date(journal.unlockDate), new Date());

  if (isLocked) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Feed
        </Link>
        <article className="rounded-3xl bg-white dark:bg-black p-8 sm:p-12 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
            <Lock className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-white mb-4">Time Capsule</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">This journal is locked by the author.</p>
          <p className="font-medium text-gray-900 dark:text-gray-300">
            It will unlock on {new Date(journal.unlockDate!).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Feed
      </Link>

      <article className="rounded-3xl bg-white dark:bg-black p-8 sm:p-12 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 mb-8 transition-colors">
        <header className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <BookOpen className="h-3 w-3" />
              {getReadingTime(journal.content)} min read
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold font-display tracking-tight text-gray-900 dark:text-white mb-6 leading-tight">
            {journal.title}
          </h1>
          
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase">
                {journal.authorPhotoURL ? (
                  <img src={journal.authorPhotoURL} alt={journal.authorName} className="h-full w-full object-cover" />
                ) : (
                  journal.authorName.charAt(0)
                )}
              </div>
              <div className="text-left">
                <div className="flex items-center justify-center gap-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    <Link to={journal.authorUsername ? `/user/${journal.authorUsername}` : '#'} className="hover:underline">
                      {journal.authorName} {journal.authorUsername && <span className="font-normal text-gray-500 hover:text-indigo-500 transition-colors">@{journal.authorUsername}</span>}
                    </Link>
                  </div>
                  {profile && profile.id !== journal.authorId && (
                    <button
                      onClick={handleFollow}
                      className={cn(
                        "btn-follow-animated text-[10px] py-0.5 px-2.5 rounded-full font-bold tracking-wider",
                        isFollowing && "following"
                      )}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
                <time dateTime={journal.createdAt ? new Date(journal.createdAt).toISOString() : undefined} className="flex items-center text-xs text-gray-500 mt-0.5">
                  {journal.createdAt ? formatDistanceToNow(new Date(journal.createdAt), { addSuffix: true }) : ''}
                  {journal.locationName && (
                    <>
                      <span className="mx-1.5">•</span>
                      <MapPin className="w-3 h-3 mr-1" />
                      {journal.locationName}
                    </>
                  )}
                </time>
              </div>
            </div>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert mx-auto max-w-none text-gray-800 dark:text-gray-200">
          {(journal.content).split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-6 leading-relaxed text-[17px]">{paragraph}</p>
          ))}
        </div>



        {journal.imageUrls && journal.imageUrls.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {journal.imageUrls.map((url, index) => {
              const isAudio = /\.(mp3|m4a|wav|ogg)(\?.*)?$/i.test(url) || url.includes('voicenote_');
              const isVideo = /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(url) && !isAudio;
              return (
                <div key={index} className={cn("relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 group/media", isAudio ? "p-4 flex items-center justify-center" : "aspect-video cursor-pointer")} onClick={() => !isAudio && setPreviewMedia({url, journalId: journal.id})}>
                  {isAudio ? (
                    <audio controls src={url} className="w-full" onClick={(e) => e.stopPropagation()} />
                  ) : isVideo ? (
                    <>
                      <video src={url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
                    </>
                  ) : (
                    <img src={url} alt={`Journal media ${index + 1}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-105" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-12 flex flex-wrap justify-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-8">
          <Reactions journal={journal} onUpdate={handleReactionUpdate} />
        </div>
      </article>

      <section id="comments" className="rounded-3xl bg-white dark:bg-black p-6 sm:p-8 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 transition-colors">
        <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-6">Comments ({comments.length})</h2>

        {profile ? (
          <form onSubmit={handleCommentSubmit} className="mb-8 flex gap-4">
            <div className="flex-1">
              <label htmlFor="comment" className="sr-only">Add a comment</label>
              <input
                id="comment"
                ref={commentInputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-transparent px-5 py-3 text-sm focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        ) : (
          <div className="mb-8 rounded-xl bg-gray-50 dark:bg-gray-800 p-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Please sign in to join the discussion.
          </div>
        )}

        <div className="space-y-6">
          {comments.map((comment, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={comment.id} 
              className="flex gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-300 uppercase">
                {comment.authorPhotoURL ? (
                  <img src={comment.authorPhotoURL} alt={comment.authorName} className="h-full w-full object-cover" />
                ) : (
                  comment.authorName.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <div className="rounded-2xl rounded-tl-none bg-gray-50 dark:bg-gray-800/50 p-4">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{comment.authorName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
          {comments.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </section>
      <MediaPreviewModal 
        url={previewMedia?.url || null} 
        journal={journal} 
        onClose={() => setPreviewMedia(null)}
        onLike={handleLikeForModal}
      />
    </div>
  );
}
