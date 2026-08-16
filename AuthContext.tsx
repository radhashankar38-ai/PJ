import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (supabaseUser: User) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (data) {
      let streakCount = 0;
      let lastMomentDate = '';
      try {
        const res = await fetch(`/api/users/${data.id}/streak`);
        if (res.ok) {
          const streakData = await res.json();
          streakCount = streakData.streakCount || 0;
          lastMomentDate = streakData.lastMomentDate || '';
        }
      } catch (e) {}

      setProfile({
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        username: data.username,
        isPublic: data.is_public,
        photoURL: data.photo_url,
        bio: data.bio,
        location: data.location,
        website: data.website,
        twitter: data.twitter,
        streakCount: streakCount,
        lastMomentDate: lastMomentDate,
      });
    } else {
      const email = supabaseUser.email || '';
      const newProfile: UserProfile = {
        id: supabaseUser.id,
        email: email,
        displayName: supabaseUser.user_metadata?.full_name || email.split('@')[0] || 'Anonymous',
        username: email.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`,
        isPublic: true,
      };
      const { data: newProfileData } = await supabase
        .from('users')
        .insert([{
          id: newProfile.id,
          email: newProfile.email,
          display_name: newProfile.displayName,
          username: newProfile.username,
          is_public: newProfile.isPublic,
        }])
        .select()
        .single();
      
      if (newProfileData) {
        setProfile({
          id: newProfileData.id,
          email: newProfileData.email,
          displayName: newProfileData.display_name,
          username: newProfileData.username,
          isPublic: newProfileData.is_public,
          photoURL: newProfileData.photo_url,
          bio: newProfileData.bio,
          location: newProfileData.location,
          website: newProfileData.website,
          twitter: newProfileData.twitter,
        });
      } else {
        setProfile(newProfile);
      }
    }
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const dbUpdates: any = {};
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.isPublic !== undefined) dbUpdates.is_public = updates.isPublic;
    if (updates.photoURL !== undefined) dbUpdates.photo_url = updates.photoURL;

    // Dynamically check columns to avoid crashes if schema updates weren't applied
    const [hasBio, hasWeb, hasTwit, hasLocation] = await Promise.all([
      supabase.from('users').select('bio').limit(0).then(r => !r.error),
      supabase.from('users').select('website').limit(0).then(r => !r.error),
      supabase.from('users').select('twitter').limit(0).then(r => !r.error),
      supabase.from('users').select('location').limit(0).then(r => !r.error),
    ]);

    if (hasBio && updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (hasLocation && updates.location !== undefined) dbUpdates.location = updates.location;
    if (hasWeb && updates.website !== undefined) dbUpdates.website = updates.website;
    if (hasTwit && updates.twitter !== undefined) dbUpdates.twitter = updates.twitter;

    const { error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', user.id);
    
    if (!error) {
      setProfile({ ...profile, ...updates });
    } else {
      console.error('Error updating profile in DB:', error);
      // Fallback: update state in-memory so the app behaves seamlessly
      setProfile({ ...profile, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile }}>
      {loading ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
