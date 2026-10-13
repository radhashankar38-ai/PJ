import { useEffect, useState } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Journal, UserProfile as UserProfileType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Heart, MessageSquare, Clock, BookOpen, Lock, UserPlus, UserCheck, Calendar, Handshake, Sparkles, Link as LinkIcon, Loader2, RotateCcw, Flame, MapPin } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MediaPreviewModal } from '../components/MediaPreviewModal';
import { extractTimeCapsule } from '../lib/timecapsule';

function getReadingTime(text: string) {
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}


export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { profile: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [previewMedia, setPreviewMedia] = useState<{url: string, journalId: string} | null>(null);

  useEffect(() => {
    const fetchUserAndJournals = async () => {
      if (!username) return;
      setLoading(true);

      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (userData) {
        let streakCount = 0;
        try {
          const res = await fetch(`/api/users/${userData.id}/streak`);
          if (res.ok) {
            const data = await res.json();
            streakCount = data.streakCount || 0;
          }
        } catch (e) {}

        setUserProfile({
          id: userData.id,
          email: userData.email,
          displayName: userData.display_name,
          username: userData.username,
          isPublic: userData.is_public,
          photoURL: userData.photo_url,
          bio: userData.bio,
          location: userData.location,
          website: userData.website,
          twitter: userData.twitter,
          streakCount: streakCount,
        });

        // Check if following and get counts
        let isUserFollowing = false;
        
        // Follower count
        const { count: followers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userData.id);
          
        setFollowerCount(followers || 0);

        // Following count
        const { count: following } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userData.id);
          
        setFollowingCount(following || 0);

        if (currentUser) {
           const { data: followData } = await supabase
             .from('follows')
             .select('*')
             .eq('follower_id', currentUser.id)
             .eq('following_id', userData.id)
             .maybeSingle();
             
           isUserFollowing = !!followData;
           setIsFollowing(isUserFollowing);
        }

        // Only fetch journals if public, or if it's the current user, or if following a private user
        const isOwnProfile = currentUser && currentUser.id === userData.id;
        if (userData.is_public || isOwnProfile || isUserFollowing) {
          let { data: journalData, error: journalError } = await supabase
            .from('journals')
            .select('*')
            .eq('author_id', userData.id)
            .or(`unlock_date.is.null,unlock_date.lte.${new Date().toISOString()}`)
            .order('created_at', { ascending: false });

          if (journalError && journalError.code === '42703') {
            const fallback = await supabase
              .from('journals')
              .select('*')
              .eq('author_id', userData.id)
              .order('created_at', { ascending: false });
            journalData = fallback.data;
            journalError = fallback.error;
          }

          if (journalData) {
            const mappedJournals = journalData.map((item: any) => {
              const { unlockDate: embeddedUnlock, cleanContent } = extractTimeCapsule(item.content);
              return {
                id: item.id,
                title: item.title,
                content: cleanContent,
                authorId: item.author_id,
                authorName: item.author_name,
                authorUsername: item.author_username,
                isPublic: item.is_public,
                imageUrls: item.image_urls,
                createdAt: item.created_at,
                likes: item.likes || [],
                commentCount: item.comment_count || 0,
                unlockDate: item.unlock_date || embeddedUnlock
              };
            }).filter((item: any) => {
              if (item.unlockDate && new Date(item.unlockDate) > new Date()) return false;
              return true;
            });
            setJournals(mappedJournals);
          }
        }
      }
      setLoading(false);
    };

    fetchUserAndJournals();
  }, [username, currentUser]);

  const toggleFollow = async () => {
    if (!userProfile || !currentUser) return; // Need to be logged in to follow
    
    setIsFollowingLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userProfile.id);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: currentUser.id, following_id: userProfile.id }]);
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsFollowingLoading(false);
    }
  };

  const handleLike = async (journalId: string, likes: string[]) => {
    if (!currentUser) return;
    const isLiked = likes.includes(currentUser.id);
    let newLikes = [];
    if (isLiked) {
      newLikes = likes.filter(id => id !== currentUser.id);
    } else {
      newLikes = [...likes, currentUser.id];
    }
    try {
      await supabase.from('journals').update({ likes: newLikes }).eq('id', journalId);
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, likes: newLikes } : j));
    } catch (error) {
      console.error("Error updating like:", error);
    }
  };

  const handleUnderstand = async (journalId: string, understands: string[]) => {
    if (!currentUser) return;
    const isUnderstood = understands.includes(currentUser.id);
    let newUnderstands = [];
    if (isUnderstood) {
      newUnderstands = understands.filter(id => id !== currentUser.id);
    } else {
      newUnderstands = [...understands, currentUser.id];
    }
    try {
      await supabase.from('journals').update({ understands: newUnderstands }).eq('id', journalId);
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, understands: newUnderstands } : j));
    } catch (error) {
      console.error("Error updating understand:", error);
    }
  };

  const handleInspired = async (journalId: string, inspired: string[]) => {
    if (!currentUser) return;
    const isInspired = inspired.includes(currentUser.id);
    let newInspired = [];
    if (isInspired) {
      newInspired = inspired.filter(id => id !== currentUser.id);
    } else {
      newInspired = [...inspired, currentUser.id];
    }
    try {
      await supabase.from('journals').update({ inspired: newInspired }).eq('id', journalId);
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, inspired: newInspired } : j));
    } catch (error) {
      console.error("Error updating inspired:", error);
    }
  };

  if (loading) return <LoadingScreen />;

  if (!userProfile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User not found</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">The user @{username} doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userProfile.id;
  const isPrivateAndNotFollowing = !userProfile.isPublic && !isOwnProfile && !isFollowing;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8">
      {/* Profile Header */}
      <div className="mb-12 overflow-hidden rounded-3xl bg-white dark:bg-black shadow-sm ring-1 ring-gray-100 dark:ring-gray-800">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 sm:h-48"></div>
        <div className="px-6 pb-8 sm:px-10">
          <div className="relative flex justify-between sm:flex-row flex-col sm:items-end">
            <div className="-mt-12 sm:-mt-16 flex items-end">
              <div className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-3xl bg-white dark:bg-gray-800 text-3xl sm:text-5xl font-bold uppercase text-gray-900 dark:text-white shadow-xl ring-4 ring-white dark:ring-gray-950">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="h-full w-full object-cover" />
                ) : (
                  userProfile.displayName.charAt(0)
                )}
              </div>
            </div>
            
            <div className="mt-6 sm:mt-0 flex items-center gap-3">
              {!isOwnProfile && (
                <button
                  onClick={toggleFollow}
                  disabled={!currentUser || isFollowingLoading}
                  className={cn(
                    "btn-follow-animated min-w-[120px] h-9 px-5 py-2 text-xs font-bold rounded-full",
                    isFollowing && "following",
                    isFollowingLoading && "opacity-80 cursor-not-allowed"
                  )}
                >
                  {isFollowingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-3">
              {userProfile.displayName}
              {!userProfile.isPublic && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Lock className="h-3.5 w-3.5" />
                  Account Private
                </span>
              )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-lg mt-1">@{userProfile.username}</p>
            
            {userProfile.bio && (
              <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed">
                {userProfile.bio}
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-400">
              {userProfile.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 opacity-70" />
                  {userProfile.location}
                </div>
              )}
              {userProfile.website && (
                <a href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <LinkIcon className="h-4 w-4 opacity-70" />
                  {userProfile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex gap-4">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{followingCount}</span> Following
                </div>
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{followerCount}</span> Followers
                </div>
              </div>
              {(userProfile.streakCount !== undefined && userProfile.streakCount > 0) && (
                <motion.div 
                  key={userProfile.streakCount}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-bold border border-orange-200 dark:border-orange-800/50 shadow-sm"
                >
                  <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                  {userProfile.streakCount} Day Streak
                </motion.div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 opacity-70" />
                Joined {format(new Date(), 'MMMM yyyy')}
              </div>
              {(!userProfile.isPublic && !isOwnProfile && !isFollowing) ? null : (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 opacity-70" />
                  {journals.length} Journals
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Content */}
      <div className="space-y-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Journals by {userProfile.displayName}</h2>
        
        {isPrivateAndNotFollowing ? (
          <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/50 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800 mb-4">
              <Lock className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">This account is private</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
              Follow this user to see their journals and experiences.
            </p>
          </div>
        ) : journals.length === 0 ? (
          <div className="text-center rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 p-12">
            <p className="text-gray-500 dark:text-gray-400">No journals published yet.</p>
          </div>
        ) : (
          journals.map((journal, i) => (
            <motion.article 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              key={journal.id} 
              className="group relative flex flex-col items-start justify-between rounded-3xl bg-white dark:bg-black/80 p-8 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800/50 transition-all hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:-translate-y-1"
            >
              <div className="flex w-full items-center justify-between gap-x-4 text-xs mb-6">
                <time dateTime={journal.createdAt ? new Date(journal.createdAt).toISOString() : undefined} className="flex items-center text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {journal.createdAt ? formatDistanceToNow(new Date(journal.createdAt), { addSuffix: true }) : 'Just now'}
                </time>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                    <BookOpen className="h-3 w-3" />
                    {getReadingTime(journal.content)} min read
                  </span>
                </div>
              </div>
              
              <div className="group relative w-full">
                <h3 className="text-2xl font-bold font-display tracking-tight text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  <Link to={`/journal/${journal.id}`}>
                    <span className="absolute inset-0" />
                    {journal.title}
                  </Link>
                </h3>

                {journal.imageUrls && journal.imageUrls.length > 0 && (
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
                <p className="mt-4 line-clamp-4 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                  {journal.content}
                </p>
              </div>
              
              <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 w-full pt-6 border-t border-gray-100 dark:border-gray-800/60">
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => handleLike(journal.id, journal.likes || [])}
                    className={cn(
                      "flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-800",
                      currentUser && journal.likes?.includes(currentUser.id) ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", currentUser && journal.likes?.includes(currentUser.id) && "fill-current")} />
                    <span>{journal.likes?.length || 0} Supports</span>
                  </button>
                  <button 
                    onClick={() => handleUnderstand(journal.id, journal.understands || [])}
                    className={cn(
                      "hidden sm:flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      currentUser && journal.understands?.includes(currentUser.id) 
                        ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" 
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <Handshake className={cn("h-4 w-4", currentUser && journal.understands?.includes(currentUser.id) ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-500")} />
                    <span>{journal.understands?.length || 0} I Understand</span>
                  </button>
                  <button 
                    onClick={() => handleInspired(journal.id, journal.inspired || [])}
                    className={cn(
                      "hidden md:flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      currentUser && journal.inspired?.includes(currentUser.id) 
                        ? "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" 
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <Sparkles className={cn("h-4 w-4", currentUser && journal.inspired?.includes(currentUser.id) ? "text-amber-600 dark:text-amber-400" : "text-amber-500")} />
                    <span>{journal.inspired?.length || 0} Inspired Me</span>
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Link to={`/journal/${journal.id}#comments`} className="flex items-center gap-2 rounded-full bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition-all hover:bg-gray-100 dark:hover:bg-gray-700">
                    <MessageSquare className="h-4 w-4" />
                    <span>{journal.commentCount || 0} Replies</span>
                  </Link>
                </div>
              </div>
            </motion.article>
          ))
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
