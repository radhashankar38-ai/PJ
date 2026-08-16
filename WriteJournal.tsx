import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X, Sparkles, Loader2, Calendar, Mic, MicOff, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function WriteJournal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [unlockDate, setUnlockDate] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Initialize speech recognition
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      
      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setContent(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + transcript);
          }
        }
      };
      
      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
      
      rec.onend = () => {
        setIsRecording(false);
      };
      
      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
    } else {
      recognition?.start();
      setIsRecording(true);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voicenote_${Date.now()}.webm`, { type: 'audio/webm' });
        setAudioFiles(prev => [...prev, audioFile]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingAudio(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access is required to record a voice note.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecordingAudio(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const removeAudioFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: File[] = Array.from(e.target.files);
      setImages(prev => [...prev, ...newFiles]);
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

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
        setLatitude(lat);
        setLongitude(lon);

        try {
          const response = await fetch(`/api/location?lat=${lat}&lon=${lon}`);
          const data = await response.json();
          const name = data.address?.city || data.address?.town || data.address?.village || data.address?.state || data.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
          setLocationName(name);
        } catch (error) {
          console.error('Error fetching location name:', error);
          setLocationName(`${lat.toFixed(2)}, ${lon.toFixed(2)}`);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const imageUrls: string[] = [];
      
      const allFiles = [...images, ...audioFiles];
      
      for (const file of allFiles) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error } = await supabase.storage
            .from('journals')
            .upload(fileName, file);
            
          if (!error) {
            const { data: { publicUrl } } = supabase.storage
              .from('journals')
              .getPublicUrl(fileName);
            imageUrls.push(publicUrl);
          } else {
            // Read as data URL fallback
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (ev) => resolve((ev.target?.result as string) || '');
              reader.readAsDataURL(file);
            });
            if (dataUrl) imageUrls.push(dataUrl);
          }
        } catch (imgErr) {
          console.error("File upload exception, using fallback:", imgErr);
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve((ev.target?.result as string) || '');
            reader.readAsDataURL(file);
          });
          if (dataUrl) imageUrls.push(dataUrl);
        }
      }

      // Dynamically check if the 'unlock_date' column is supported by the live database
      const { error: colCheckError } = await supabase.from('journals').select('unlock_date').limit(0);
      const supportsUnlockDate = !colCheckError;

      let finalContent = content.trim();
      if (unlockDate && !supportsUnlockDate) {
        finalContent += `\n\n<!-- TIME_CAPSULE:${new Date(unlockDate).toISOString()} -->`;
      }

      const journalPayload: any = {
        title: title.trim(),
        content: finalContent,
        author_id: profile.id,
        author_name: profile.displayName,
        author_username: profile.username || '',
        is_public: profile.isPublic ?? true,
        image_urls: imageUrls,
      };

      if (latitude !== null && longitude !== null) {
        journalPayload.latitude = latitude;
        journalPayload.longitude = longitude;
        journalPayload.location_name = locationName;
      }

      if (supportsUnlockDate) {
        journalPayload.unlock_date = unlockDate ? new Date(unlockDate).toISOString() : null;
      }

      const { error } = await supabase.from('journals').insert([journalPayload]);
      
      if (error) throw error;
      
      navigate('/');
    } catch (error) {
      console.error("Error adding journal: ", error);
      alert("Failed to publish journal");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div className="p-8 text-center text-gray-900 dark:text-white">Please sign in to write a journal.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 pb-24 md:pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-white">Write a Journal</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Share your thoughts and experiences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="sr-only">Title</label>
          <input
            type="text"
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Journal Title"
            className="block w-full border-0 border-b border-gray-200 dark:border-gray-800 bg-transparent px-0 py-4 text-3xl font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-gray-900 dark:focus:border-white focus:ring-0"
          />
        </div>
        
        <div>
          <label htmlFor="content" className="sr-only">Content</label>
          <textarea
            id="content"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell your story..."
            rows={12}
            className="block w-full resize-none border-0 bg-transparent px-0 py-4 text-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0"
          />
        </div>

        {imagePreviews.length > 0 && (
          <div className="flex gap-4 overflow-x-auto py-2">
            {imagePreviews.map((preview, index) => {
              const file = images[index];
              const isVideo = file && file.type.startsWith('video/');
              return (
              <div key={index} className="relative shrink-0">
                {isVideo ? (
                  <video src={preview} className="h-32 w-32 object-cover rounded-xl" controls />
                ) : (
                  <img src={preview} alt={`Preview ${index}`} className="h-32 w-32 object-cover rounded-xl" />
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full p-1 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )})}
          </div>
        )}

        {audioFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            {audioFiles.map((file, index) => (
              <div key={index} className="relative flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                <audio controls src={URL.createObjectURL(file)} className="h-10 flex-1" />
                <button
                  type="button"
                  onClick={() => removeAudioFile(index)}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full p-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                Media
              </button>
            </div>

            <button
              type="button"
              onClick={recordingAudio ? stopAudioRecording : startAudioRecording}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                recordingAudio 
                  ? "border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 animate-pulse" 
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {recordingAudio ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {recordingAudio ? `Recording (${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, '0')})` : 'Voice Note'}
            </button>
            
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleRecording}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hidden sm:flex",
                  isRecording 
                    ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" 
                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                {isRecording ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
                {isRecording ? 'Listening...' : 'Dictate'}
              </button>
            )}

            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isFetchingLocation}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                locationName 
                  ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" 
                  : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                isFetchingLocation && "opacity-50 cursor-not-allowed"
              )}
            >
              {isFetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              {locationName ? locationName : 'Add Location'}
            </button>
            
            <div className="relative flex items-center">
               <label htmlFor="unlockDate" className="sr-only">Schedule Post (Time Capsule)</label>
               <div className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                 <Calendar className="w-4 h-4 text-gray-500" />
                 <input
                   type="datetime-local"
                   id="unlockDate"
                   value={unlockDate}
                   onChange={(e) => setUnlockDate(e.target.value)}
                   className="bg-transparent border-none p-0 text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 [&::-webkit-calendar-picker-indicator]:dark:invert"
                   title="Schedule Post (Time Capsule)"
                 />
               </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim()}
            className="rounded-full bg-gray-900 dark:bg-white px-8 py-2.5 text-sm font-semibold text-white dark:text-gray-900 shadow-sm hover:bg-gray-800 dark:hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-white disabled:opacity-50 transition-colors"
          >
            {loading ? 'Publishing...' : 'Publish Journal'}
          </button>
        </div>
      </form>
    </div>
  );
}
