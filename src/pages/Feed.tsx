import { useEffect, useState } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { supabase } from '../supabase';
import { Journal } from '../types';
import { Link } from 'react-router-dom';
import { Heart, MessageSquare, BookOpen, Handshake, Sparkles, Lock, Loader2, RotateCcw, MapPin } from 'lucide-react';
import { formatDistanceToNow, isAfter } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { extractTimeCapsule } from '../lib/timecapsule';
import { Reactions } from '../components/Reactions';

function getReadingTime(text: string) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}


export function Feed() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [previewMedia, setPreviewMedia] = useState<{url: string, journalId: string} | null>(null);

  useEffect(() => {
    const fetchJournalsAndFollows = async () => {
      let { data, error } = await supabase
        .from('journals')
        .select('*, users(photo_url)')
        .eq('is_public', true)
        .or(`unlock_date.is.null,unlock_date.lte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error && error.code === '42703') {
        const fallback = await supabase
          .from('journals')
          .select('*, users(photo_url)')
          .eq('is_public', true)
          .order('created_at', { ascending: false });
        data = fallback.data;
        error = fallback.error;
      }

      if (data) {
        // Map database fields to our TypeScript types
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
          if (item.unlockDate && new Date(item.unlockDate) > new Date()) return false;
          return true;
        });
        setJournals(mappedJournals);
      }
      
      if (profile) {
        const { data: followsData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', profile.id);
          
        if (followsData) {
          const fmap: Record<string, boolean> = {};
          followsData.forEach(f => fmap[f.following_id] = true);
          setFollowingMap(fmap);
        }
      }
      
      setLoading(false);
    };

    fetchJournalsAndFollows();

    const subscription = supabase
      .channel('public:journals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journals' }, payload => {
        fetchJournalsAndFollows();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleReactionUpdate = (journalId: string, updates: Partial<Journal>) => {
    setJournals(prev => prev.map(j => j.id === journalId ? { ...j, ...updates } : j));
  };

  const handleLikeForModal = async (journalId: string, journal: Journal) => {
    if (!profile) return;
    const formattedLike = `❤️:${profile.id}`;
    const legacyLike = profile.id;
    const isLiked = journal.likes?.includes(formattedLike) || journal.likes?.includes(legacyLike);
    
    let newLikes = [...(journal.likes || [])];
    if (isLiked) {
      newLikes = newLikes.filter(id => id !== formattedLike && id !== legacyLike);
    } else {
      newLikes.push(formattedLike);
    }
    
    handleReactionUpdate(journalId, { likes: newLikes });
    
    try {
      await supabase.from('journals').update({ likes: newLikes }).eq('id', journalId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFollow = async (authorId: string) => {
    if (!profile) return;
    
    const isFollowing = followingMap[authorId];
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', authorId);
          
        setFollowingMap(prev => {
          const next = { ...prev };
          delete next[authorId];
          return next;
        });
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: profile.id, following_id: authorId }]);
          
        setFollowingMap(prev => ({ ...prev, [authorId]: true }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-12 text-center lg:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight font-display text-gray-900 dark:text-white sm:text-5xl">World Experience Library</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Discover and learn from the lives of others.</p>
      </div>

      <div className="space-y-8">
        {journals.length === 0 ? (
          <div className="text-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 p-12">
            <p className="text-gray-500 dark:text-gray-400">No experiences shared yet. Be the first!</p>
          </div>
        ) : (
          journals.map((journal, i) => {

            const isLocked = journal.unlockDate && isAfter(new Date(journal.unlockDate), new Date());

            return (
              <motion.article 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                key={journal.id} 
                className={cn(
                  "group relative flex flex-col items-start justify-between rounded-3xl p-8 shadow-sm ring-1 transition-all hover:shadow-lg hover:-translate-y-1",
                  isLocked ? "bg-gray-50/50 dark:bg-black/40 ring-gray-200/50 dark:ring-gray-800/30 backdrop-blur-sm" : "bg-white dark:bg-black/80 ring-gray-100 dark:ring-gray-800/50 hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50"
                )}
              >
                <div className="flex w-full items-center justify-between gap-x-4 text-xs mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase">
                      {journal.authorPhotoURL ? (
                        <img src={journal.authorPhotoURL} alt={journal.authorName} className="h-full w-full object-cover" />
                      ) : (
                        journal.authorName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          <Link to={journal.authorUsername ? `/user/${journal.authorUsername}` : '#'} className="hover:underline">
                            {journal.authorName} {journal.authorUsername && <span className="font-normal text-gray-500 hover:text-indigo-500 transition-colors">@{journal.authorUsername}</span>}
                          </Link>
                        </div>
                        {profile && profile.id !== journal.authorId && (
                          <button
                            onClick={() => handleFollow(journal.authorId)}
                            className={cn(
                              "btn-follow-animated text-[10px] py-0.5 px-2 rounded-full font-bold tracking-wider",
                              followingMap[journal.authorId] && "following"
                            )}
                          >
                            {followingMap[journal.authorId] ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                      <time dateTime={journal.createdAt ? new Date(journal.createdAt).toISOString() : undefined} className="flex items-center text-gray-500 mt-0.5">
                        {journal.createdAt ? formatDistanceToNow(new Date(journal.createdAt), { addSuffix: true }) : 'Just now'}
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
                  <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <BookOpen className="h-3 w-3" />
                      {getReadingTime(journal.content)} min read
                    </span>
                  </div>
                </div>
                
                <div className="group relative w-full">
                  <h3 className="text-2xl font-bold font-display tracking-tight text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {isLocked ? (
                      <span className="flex items-center gap-2 text-gray-500">
                        <Lock className="w-5 h-5" />
                        Time Capsule
                      </span>
                    ) : (
                      <Link to={`/journal/${journal.id}`}>
                        <span className="absolute inset-0" />
                        {journal.title}
                      </Link>
                    )}
                  </h3>

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
                </div>
                
                <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 w-full pt-6 border-t border-gray-100 dark:border-gray-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <Reactions journal={journal} onUpdate={handleReactionUpdate} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link to={`/journal/${journal.id}#comments`} className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-700">
                      <MessageSquare className="h-4 w-4" />
                      <span>{journal.commentCount || 0} Replies</span>
                    </Link>
                  </div>
                </div>
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
            if (activeJournal) handleLikeForModal(activeJournal.id, activeJournal);
          }
        }}
      />
    </div>
  );
}
