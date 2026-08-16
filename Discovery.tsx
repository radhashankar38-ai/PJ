import { useEffect, useState } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Compass, Users, UserPlus, UserCheck, Loader2, HeartHandshake, UserMinus } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

type SuggestedUser = {
  id: string;
  display_name: string;
  username: string;
  photo_url: string;
  bio?: string;
};

export function Discovery() {
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [followers, setFollowers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<SuggestedUser[]>([]);
  const [mutual, setMutual] = useState<SuggestedUser[]>([]);
  const [notFollowingBack, setNotFollowingBack] = useState<SuggestedUser[]>([]);
  
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<string>('suggested');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      
      let query = supabase
        .from('users')
        .select('id, display_name, username, photo_url')
        .order('created_at', { ascending: false })
        .limit(200);
        
      if (profile) {
        query = query.neq('id', profile.id);
      }
      
      const { data } = await query;
      
      if (data) {
        let followsData: any[] = [];
        let followersData: any[] = [];
        
        if (profile) {
          const [{ data: fData }, { data: fdData }] = await Promise.all([
            supabase.from('follows').select('following_id').eq('follower_id', profile.id),
            supabase.from('follows').select('follower_id').eq('following_id', profile.id)
          ]);
          followsData = fData || [];
          followersData = fdData || [];
          
          const map: Record<string, boolean> = {};
          followsData.forEach((f: any) => {
            map[f.following_id] = true;
          });
          setFollowingMap(map);
        }
        
        const followingIds = new Set(followsData.map((f: any) => f.following_id));
        const followersIds = new Set(followersData.map((f: any) => f.follower_id));

        setSuggested(data.filter(u => !followingIds.has(u.id)));
        setFollowers(data.filter(u => followersIds.has(u.id)));
        setFollowing(data.filter(u => followingIds.has(u.id)));
        setMutual(data.filter(u => followingIds.has(u.id) && followersIds.has(u.id)));
        setNotFollowingBack(data.filter(u => followingIds.has(u.id) && !followersIds.has(u.id)));
      }
      setLoading(false);
    };

    fetchUsers();
  }, [profile]);

  const handleFollow = async (userId: string) => {
    if (!profile) return;
    
    const isFollowing = followingMap[userId];
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', userId);
          
        setFollowingMap(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      } else {
        await supabase
          .from('follows')
          .insert([{ follower_id: profile.id, following_id: userId }]);
          
        setFollowingMap(prev => ({
          ...prev,
          [userId]: true
        }));
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const tabs = profile ? [
    { id: 'suggested', label: 'Suggested', title: 'Suggested People', icon: <Users className="h-5 w-5 text-indigo-500" />, users: suggested, emptyMessage: "No new people found to suggest right now." },
    { id: 'followers', label: 'Followers', title: 'Followers', icon: <UserPlus className="h-5 w-5 text-indigo-500" />, users: followers, emptyMessage: "You don't have any followers yet." },
    { id: 'following', label: 'Following', title: 'Following', icon: <UserCheck className="h-5 w-5 text-indigo-500" />, users: following, emptyMessage: "You aren't following anyone yet." },
    { id: 'mutual', label: 'Mutual', title: 'Mutual Connections', icon: <HeartHandshake className="h-5 w-5 text-indigo-500" />, users: mutual, emptyMessage: "No mutual connections yet." },
    { id: 'notFollowingBack', label: 'Not Following Back', title: 'Not Following You Back', icon: <UserMinus className="h-5 w-5 text-indigo-500" />, users: notFollowingBack, emptyMessage: "Everyone you follow is following you back!" }
  ] : [
    { id: 'suggested', label: 'Suggested', title: 'Suggested People', icon: <Users className="h-5 w-5 text-indigo-500" />, users: suggested, emptyMessage: "No new people found to suggest right now." },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white font-display">Discovery</h1>
        <p className="text-gray-500 dark:text-gray-400">Discover inspiring people and new perspectives.</p>
      </div>

      {loading ? (<LoadingScreen />) : (<>
          <div className="flex space-x-6 overflow-x-auto border-b border-gray-200 dark:border-gray-800 mb-8 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "whitespace-nowrap py-3 text-sm font-medium transition-all relative",
                  activeTab === tab.id
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                <div className="flex items-center gap-2">
                  {tab.label}
                  <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                    {tab.users.length}
                  </span>
                </div>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white"
                  />
                )}
              </button>
            ))}
          </div>
          
          <div className="bg-white dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm">
            {tabs.map(tab => tab.id === activeTab && (
              <motion.div 
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                  {tab.icon}
                  {tab.title}
                </h2>
          
                {tab.users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {tab.emptyMessage}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tab.users.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-black/20 transition-colors group"
                      >
                        <Link to={`/user/${user.username || user.id}`} className="flex items-center gap-4 overflow-hidden flex-1">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase shadow-sm">
                            {user.photo_url ? (
                              <img src={user.photo_url} alt={user.display_name} className="h-full w-full object-cover" />
                            ) : (
                              user.display_name.charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col truncate pr-4">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:underline">
                              {user.display_name}
                            </span>
                            {user.username && (
                              <span className="text-xs text-gray-500 truncate mt-0.5">@{user.username}</span>
                            )}
                          </div>
                        </Link>
                        
                        {profile && (
                          <button
                            onClick={() => handleFollow(user.id)}
                            className={cn(
                              "btn-follow-animated px-4 py-1.5 text-[11px] font-bold rounded-full",
                              followingMap[user.id] && "following"
                            )}
                          >
                            {followingMap[user.id] ? "Following" : "Follow"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
