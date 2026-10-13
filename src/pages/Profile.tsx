import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Globe, Lock, ImagePlus, Loader2, Link as LinkIcon, AlignLeft, MapPin, LocateFixed } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabase';

export function Profile() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const response = await fetch(`/api/location?lat=${lat}&lon=${lon}`);
          const data = await response.json();
          const name = data.address?.city || data.address?.town || data.address?.village || data.address?.state || data.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
          setLocation(name);
        } catch (error) {
          console.error('Error fetching location name:', error);
          setLocation(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to retrieve your location. Please check your permissions.');
        setIsFetchingLocation(false);
      }
    );
  };
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!profile) {
      navigate('/');
    }
  }, [profile, navigate]);

  if (!profile) {
    return null;
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('journals')
        .upload(fileName, file);
        
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('journals')
          .getPublicUrl(fileName);
        setPhotoURL(publicUrl);
      } else {
        // Fallback to Data URL for instant resilient preview and save
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setPhotoURL(event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Error uploading image, falling back to data URL:", error);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoURL(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateProfile({
        displayName: displayName.trim(),
        username: username.trim(),
        isPublic,
        photoURL,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
      });

      // Update all journals by this user to reflect new username and privacy settings
      await supabase
        .from('journals')
        .update({
          author_name: displayName.trim(),
          author_username: username.trim(),
          is_public: isPublic
        })
        .eq('author_id', profile.id);

      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile', error);
      setMessage('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your public presence.</p>
      </div>

      <div className="rounded-3xl bg-white dark:bg-black p-6 sm:p-8 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 transition-colors">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="relative group">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 text-3xl font-bold uppercase text-gray-900 dark:text-white shadow-sm ring-4 ring-white dark:ring-gray-900">
                {photoURL ? (
                  <img src={photoURL} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  displayName.charAt(0) || '?'
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
              >
                {uploadingImage ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <ImagePlus className="h-6 w-6 text-white" />}
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Profile Picture</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Click the avatar to upload a custom image.</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="block w-full pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white px-4 py-3 focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
                placeholder="Your Name"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 text-gray-500 dark:text-gray-400 sm:text-sm transition-colors">
                @
              </span>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full min-w-0 flex-1 rounded-none rounded-r-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white px-4 py-3 focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
                placeholder="username"
                required
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">This will be used to identify you in mentions and URLs.</p>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none">
                <AlignLeft className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="block w-full pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white px-4 py-3 focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
                placeholder="A brief description about yourself"
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="block w-full pl-10 pr-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white px-4 py-3 focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
                placeholder="City, Country"
              />
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isFetchingLocation}
                className="absolute inset-y-0 right-0 pr-3 pl-2 flex items-center text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
                title="Get Live Location"
              >
                {isFetchingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Website</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="url"
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="block w-full pl-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white px-4 py-3 focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">Account Privacy</h3>
            <div className="mt-4 space-y-4">
              <div
                className={cn(
                  "relative flex cursor-pointer rounded-2xl border p-4 shadow-sm focus:outline-none transition-colors",
                  isPublic ? "border-gray-900 dark:border-gray-500 bg-gray-50 dark:bg-gray-800" : "border-gray-200 dark:border-gray-700"
                )}
                onClick={() => setIsPublic(true)}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className={cn("h-6 w-6", isPublic ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500")} />
                    <div className="text-sm">
                      <p className={cn("font-medium", isPublic ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-gray-300")}>
                        Public Account
                      </p>
                      <p className={cn("inline", isPublic ? "text-gray-500 dark:text-gray-400" : "text-gray-500 dark:text-gray-400")}>
                        Anyone can see your journals in the feed.
                      </p>
                    </div>
                  </div>
                  <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", isPublic ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white" : "border-gray-300 dark:border-gray-600")}>
                    {isPublic && <div className="h-2 w-2 rounded-full bg-white dark:bg-black" />}
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  "relative flex cursor-pointer rounded-2xl border p-4 shadow-sm focus:outline-none transition-colors",
                  !isPublic ? "border-gray-900 dark:border-gray-500 bg-gray-50 dark:bg-gray-800" : "border-gray-200 dark:border-gray-700"
                )}
                onClick={() => setIsPublic(false)}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Lock className={cn("h-6 w-6", !isPublic ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500")} />
                    <div className="text-sm">
                      <p className={cn("font-medium", !isPublic ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-gray-300")}>
                        Private Account
                      </p>
                      <p className={cn("inline", !isPublic ? "text-gray-500 dark:text-gray-400" : "text-gray-500 dark:text-gray-400")}>
                        Only you (and followers later) can see your journals.
                      </p>
                    </div>
                  </div>
                  <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", !isPublic ? "border-gray-900 dark:border-white bg-gray-900 dark:bg-white" : "border-gray-300 dark:border-gray-600")}>
                    {!isPublic && <div className="h-2 w-2 rounded-full bg-white dark:bg-black" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <p className={cn("text-sm font-medium", message.includes('success') ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
              {message}
            </p>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !displayName.trim() || !username.trim()}
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-gray-900 dark:bg-white px-4 py-3 text-sm font-semibold text-white dark:text-gray-900 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white disabled:opacity-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
