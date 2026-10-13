import React, { useState, useRef, useEffect } from 'react';
import { Camera, Zap, Flame, Plus, X, Share2, Users, Eye, Image as ImageIcon, Type, Palette, Trash2, SwitchCamera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import type { Moment, UserStreak } from '../types';

export function Moments() {
  const { profile, updateProfile } = useAuth();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [streaks, setStreaks] = useState<UserStreak[]>([]);
  
  const [isLiveCamera, setIsLiveCamera] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pointerStartY = useRef(0);
  const isPointerDownRef = useRef(false);

  const [caption, setCaption] = useState('');
  const [shareType, setShareType] = useState<'public' | 'friends'>('public');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  const [activeFilter, setActiveFilter] = useState('none');
  const [overlayText, setOverlayText] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [viewingMoment, setViewingMoment] = useState<Moment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [overlayFont, setOverlayFont] = useState('sans-serif');
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 50 });
  const [isDraggingText, setIsDraggingText] = useState(false);
  const mediaContainerRef = useRef<HTMLDivElement>(null);

  const FONTS = [
    { name: 'Classic', value: 'sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Mono', value: 'monospace' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Cursive', value: 'cursive' }
  ];

  const FILTERS = [
    { name: 'Normal', value: 'none' },
    { name: 'Clarendon', value: 'contrast(1.2) saturate(1.35)' },
    { name: 'Gingham', value: 'brightness(1.05) hue-rotate(-10deg)' },
    { name: 'Moon', value: 'grayscale(1) contrast(1.1) brightness(1.1)' },
    { name: 'Sepia', value: 'sepia(0.8) contrast(1.2)' },
  ];

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (isLiveCamera && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isLiveCamera, stream]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingText || !mediaContainerRef.current) return;
      
      const rect = mediaContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      
      setOverlayPosition({ x, y });
    };

    const handlePointerUp = () => {
      setIsDraggingText(false);
    };

    if (isDraggingText) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingText]);

  const startCamera = async () => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsLiveCamera(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  useEffect(() => {
    if (isLiveCamera) {
      startCamera();
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsLiveCamera(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    
    let mimeType = 'video/webm';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/mp4';
    }
    
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setCapturedVideo(url);
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 400;
        canvas.height = videoRef.current.videoHeight || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          setCapturedImage(canvas.toDataURL('image/jpeg'));
        }
      }
      setIsCapturing(true);
      stopCamera();
    };
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    isPointerDownRef.current = true;
    pointerStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;
    if (!isRecording && e.clientY - pointerStartY.current > 30) {
      startRecording();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (isRecording) {
      stopRecording();
    } else {
      takePhoto();
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setIsCapturing(true);
        stopCamera();
      }
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const handleShare = () => {
    if (!profile) return;
    if (!capturedImage && !capturedVideo) return;
    
    // Require selecting at least one friend if 'friends' is chosen
    if (shareType === 'friends' && selectedFriends.length === 0) {
      alert("Please select at least one friend to share with.");
      return;
    }

    const finalizeImage = () => {
      if (capturedVideo) {
        saveMoment(capturedVideo, 'video', false);
        return;
      }

      if (!capturedImage) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = activeFilter;
          ctx.drawImage(img, 0, 0);
          
          const finalImageUrl = canvas.toDataURL('image/jpeg');
          saveMoment(finalImageUrl, 'image', true);
        }
      };
      img.src = capturedImage;
    };

    const saveMoment = async (finalMediaUrl: string, mediaType: 'image' | 'video', baked: boolean) => {
      const newMoment: Moment = {
        id: Date.now().toString(),
        authorId: profile.id,
        authorName: profile.displayName,
        authorUsername: profile.username,
        authorPhotoURL: profile.photoURL,
        mediaUrl: finalMediaUrl,
        mediaType: mediaType,
        filter: baked ? 'none' : activeFilter,
        overlayText: overlayText,
        overlayFont: overlayFont,
        overlayPosition: overlayPosition,
        caption: caption,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        viewers: [],
        sharedWith: shareType === 'public' ? ['public'] : selectedFriends,
      };
      
      setMoments([newMoment, ...moments]);
      setIsCapturing(false);
      setCapturedImage(null);
      setCapturedVideo(null);
      setCaption('');
      setOverlayText('');
      setActiveFilter('none');
      setShowFilters(false);
      
      // Update streaks if shared with friends
      if (shareType === 'friends') {
        const updatedStreaks = streaks.map(s => {
          if (selectedFriends.includes(s.friendId)) {
            return {
              ...s,
              count: s.count + 1,
              lastSharedAt: new Date().toISOString()
            };
          }
          return s;
        });
        setStreaks(updatedStreaks);
      }
      
      setSelectedFriends([]);
      
      try {
        const res = await fetch('/api/moments/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: profile.id })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.streakCount) {
             updateProfile({ streakCount: data.streakCount }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("Failed to track moment:", e);
      }
    };
    
    finalizeImage();
  };

  const deleteMoment = (id: string) => {
    setMoments(prev => prev.filter(m => m.id !== id));
    setViewingMoment(null);
    setConfirmDeleteId(null);
  };

  const activeMoments = moments.filter(m => new Date(m.expiresAt).getTime() > Date.now());

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold font-serif flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500 fill-yellow-500" />
            Moments
          </h1>
          {profile?.streakCount ? (
            <motion.div 
              key={profile.streakCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-bold border border-orange-200 dark:border-orange-800/50 shadow-sm"
            >
              <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
              {profile.streakCount} Day Streak
            </motion.div>
          ) : null}
        </div>
        <button 
          onClick={startCamera}
          className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm"
        >
          <Camera className="h-4 w-4" />
          New Moment
        </button>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Your Streaks</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {streaks.map((streak) => (
            <div key={streak.friendId} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative">
                <img 
                  src={streak.friendPhotoURL || `https://ui-avatars.com/api/?name=${streak.friendName}`} 
                  alt={streak.friendName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500 p-[2px]"
                />
                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm">
                  <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                  <span className="text-xs font-bold">{streak.count}</span>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {streak.friendUsername}
              </span>
            </div>
          ))}
          <button 
            onClick={startCamera}
            className="flex flex-col items-center gap-2 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <span className="text-xs font-medium text-gray-500">New Moments</span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">New Moments</h2>
        {activeMoments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
            <p>No moments yet.</p>
            <p className="text-sm">Be the first to share one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {activeMoments.map((moment) => (
              <div 
                key={moment.id} 
                onClick={() => setViewingMoment(moment)}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group shadow-sm bg-gray-100 dark:bg-gray-900"
              >
                {moment.mediaType === 'video' ? (
                  <video 
                    src={moment.mediaUrl}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    muted
                    loop
                    playsInline
                    autoPlay
                    style={{ filter: moment.filter || 'none' }}
                  />
                ) : (
                  <img 
                    src={moment.mediaUrl} 
                    alt="Moment" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={{ filter: moment.filter || 'none' }}
                  />
                )}
                
                {moment.overlayText && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    <p 
                      className="absolute text-xl md:text-2xl font-bold text-white text-center px-2 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 w-max max-w-[90vw]"
                      style={{ 
                        textShadow: '1px 1px 5px rgba(0,0,0,0.8)',
                        fontFamily: moment.overlayFont || 'sans-serif',
                        left: moment.overlayPosition ? `${moment.overlayPosition.x}%` : '50%',
                        top: moment.overlayPosition ? `${moment.overlayPosition.y}%` : '50%',
                      }}
                    >
                      {moment.overlayText}
                    </p>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-0" />
                
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <img 
                    src={moment.authorPhotoURL || `https://ui-avatars.com/api/?name=${moment.authorName}`} 
                    alt={moment.authorName}
                    className="w-8 h-8 rounded-full border border-white/50"
                  />
                  <span className="text-white text-xs font-medium shadow-sm">{moment.authorName}</span>
                </div>
                
                {moment.caption && (
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-sm font-medium line-clamp-2">{moment.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Camera Modal */}
      <AnimatePresence>
        {isLiveCamera && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
              <button 
                onClick={stopCamera}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
              >
                <X className="h-6 w-6" />
              </button>
              <button 
                onClick={() => !isRecording && setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                disabled={isRecording}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm disabled:opacity-50"
              >
                <SwitchCamera className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-center bg-gradient-to-t from-black/80 to-transparent pb-16 touch-none">
              <button 
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={cn(
                  "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all touch-none",
                  isRecording 
                    ? "border-red-500 bg-red-500/20 scale-110" 
                    : "border-white/50 bg-white/20 hover:bg-white/40 hover:scale-105"
                )}
              >
                <div className={cn(
                  "rounded-full transition-all touch-none",
                  isRecording ? "w-8 h-8 bg-red-500 rounded-sm" : "w-14 h-14 bg-white"
                )}></div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture Modal */}
      <AnimatePresence>
        {isCapturing && (capturedImage || capturedVideo) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
              <button 
                onClick={() => {
                  setIsCapturing(false);
                  setCapturedImage(null);
                  setCapturedVideo(null);
                  setActiveFilter('none');
                  setOverlayText('');
                  setShowFilters(false);
                }}
                className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsAddingText(true)}
                  className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                >
                  <Type className="h-6 w-6" />
                </button>
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2 rounded-full text-white transition-colors backdrop-blur-sm",
                    showFilters ? "bg-yellow-500 text-black" : "bg-black/40 hover:bg-black/60"
                  )}
                >
                  <Palette className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div ref={mediaContainerRef} className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {capturedVideo ? (
                <video 
                  src={capturedVideo} 
                  className="w-full h-full object-contain" 
                  autoPlay
                  loop
                  playsInline
                  style={{ filter: activeFilter }}
                />
              ) : (
                <img 
                  src={capturedImage!} 
                  alt="Captured" 
                  className="w-full h-full object-contain" 
                  style={{ filter: activeFilter }}
                />
              )}
              
              {overlayText && !isAddingText && (
                <div 
                  className="absolute inset-0 pointer-events-none overflow-hidden"
                >
                  <p 
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setIsDraggingText(true);
                    }}
                    className={cn(
                      "absolute text-4xl md:text-6xl font-bold text-white text-center px-4",
                      "pointer-events-auto cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 w-max max-w-[90vw]"
                    )} 
                    style={{ 
                      textShadow: '2px 2px 10px rgba(0,0,0,0.8)',
                      fontFamily: overlayFont,
                      left: `${overlayPosition.x}%`,
                      top: `${overlayPosition.y}%`,
                    }}
                  >
                    {overlayText}
                  </p>
                </div>
              )}
              
              {isAddingText && (
                <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
                  <input
                    type="text"
                    autoFocus
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsAddingText(false);
                    }}
                    onBlur={(e) => {
                      if (!e.relatedTarget) setIsAddingText(false);
                    }}
                    placeholder="Type something..."
                    className="w-full bg-transparent text-center text-4xl md:text-6xl font-bold text-white placeholder-white/50 focus:outline-none"
                    style={{ fontFamily: overlayFont }}
                  />
                  <div className="absolute bottom-32 flex flex-wrap justify-center gap-2 max-w-sm" onPointerDown={e => e.preventDefault()}>
                    {FONTS.map(font => (
                      <button
                        key={font.name}
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOverlayFont(font.value); }}
                        className={cn(
                          "px-4 py-2 rounded-full border border-white/30 text-white font-medium text-sm transition-colors cursor-pointer",
                          overlayFont === font.value ? "bg-white text-black" : "bg-black/50 hover:bg-white/20"
                        )}
                        style={{ fontFamily: font.value }}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <AnimatePresence>
                {showFilters && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-4 left-0 right-0 px-4 z-10"
                    >
                      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                        {FILTERS.map(f => (
                          <button
                            key={f.name}
                            onClick={() => setActiveFilter(f.value)}
                            className={cn(
                              "flex-shrink-0 flex flex-col items-center gap-1",
                              activeFilter === f.value ? "opacity-100" : "opacity-60 hover:opacity-100"
                            )}
                          >
                            <div 
                              className={cn(
                                "w-16 h-16 rounded-xl border-2 overflow-hidden",
                                activeFilter === f.value ? "border-yellow-500" : "border-transparent"
                              )}
                            >
                              <img 
                                src={capturedImage!} 
                                alt={f.name} 
                                className="w-full h-full object-cover"
                                style={{ filter: f.value }}
                              />
                            </div>
                            <span className="text-white text-xs font-medium drop-shadow-md">{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="bg-black border-t border-gray-800 p-4 pb-8">
              <div className="max-w-md mx-auto space-y-4">
                <input 
                  type="text" 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                />
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShareType('public')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors border",
                      shareType === 'public' 
                        ? "bg-white text-black border-white" 
                        : "bg-transparent text-white border-gray-700 hover:bg-gray-900"
                    )}
                  >
                    <Eye className="h-4 w-4" /> Public
                  </button>
                  <button 
                    onClick={() => setShareType('friends')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors border",
                      shareType === 'friends' 
                        ? "bg-yellow-500 text-black border-yellow-500" 
                        : "bg-transparent text-white border-gray-700 hover:bg-gray-900"
                    )}
                  >
                    <Users className="h-4 w-4" /> Friends
                  </button>
                </div>
                
                <AnimatePresence>
                  {shareType === 'friends' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-4 overflow-hidden"
                    >
                      <h3 className="text-white text-sm font-bold mb-3">Share with...</h3>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto hide-scrollbar">
                        {streaks.length > 0 ? streaks.map(friend => (
                          <button 
                            key={friend.friendId}
                            onClick={() => toggleFriendSelection(friend.friendId)}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={friend.friendPhotoURL || `https://ui-avatars.com/api/?name=${friend.friendName}`} 
                                alt={friend.friendName}
                                className="w-8 h-8 rounded-full"
                              />
                              <span className="text-white font-medium text-sm">{friend.friendName}</span>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              selectedFriends.includes(friend.friendId) 
                                ? "border-yellow-500 bg-yellow-500" 
                                : "border-gray-600"
                            )}>
                              {selectedFriends.includes(friend.friendId) && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                          </button>
                        )) : (
                          <div className="text-gray-500 text-sm py-2 px-2">Add friends to start sharing streaks!</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button 
                  onClick={handleShare}
                  className="w-full bg-white text-black rounded-xl py-3 font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform"
                >
                  <Share2 className="h-5 w-5" /> Share Moment
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Moment Modal */}
      <AnimatePresence>
        {viewingMoment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
              <div className="flex items-center gap-3">
                <img 
                  src={viewingMoment.authorPhotoURL || `https://ui-avatars.com/api/?name=${viewingMoment.authorName}`} 
                  alt={viewingMoment.authorName}
                  className="w-10 h-10 rounded-full border-2 border-white/50"
                />
                <div className="flex flex-col">
                  <span className="text-white font-bold">{viewingMoment.authorName}</span>
                  <span className="text-white/60 text-xs">
                    {new Date(viewingMoment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingMoment.authorId === profile?.id && (
                  confirmDeleteId === viewingMoment.id ? (
                    <div className="flex items-center gap-2 bg-black/50 p-1 rounded-full backdrop-blur-sm mr-2 border border-red-500/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMoment(viewingMoment.id);
                        }}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full transition-colors hover:bg-red-700"
                      >
                        Yes
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                        }}
                        className="px-3 py-1 bg-gray-600 text-white text-xs font-bold rounded-full transition-colors hover:bg-gray-700"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(viewingMoment.id);
                      }}
                      className="btn-delete-animated ml-2 scale-75 origin-right"
                      title="Delete Moment"
                    >
                      <svg viewBox="0 0 448 512" className="svgIcon"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path></svg>
                    </button>
                  )
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = document.createElement('a');
                    link.href = viewingMoment.mediaUrl;
                    link.download = `moment-${viewingMoment.authorUsername}-${Date.now()}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                  title="Save Photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button 
                  onClick={() => setViewingMoment(null)}
                  className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center">
              {viewingMoment.mediaType === 'video' ? (
                <video 
                  src={viewingMoment.mediaUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                  style={{ filter: viewingMoment.filter || 'none' }}
                />
              ) : (
                <img 
                  src={viewingMoment.mediaUrl} 
                  alt="Moment" 
                  className="w-full h-full object-contain"
                  style={{ filter: viewingMoment.filter || 'none' }}
                />
              )}
              
              {viewingMoment.overlayText && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                  <p 
                    className="absolute text-4xl md:text-6xl font-bold text-white text-center px-4 transform -translate-x-1/2 -translate-y-1/2 w-max max-w-[90vw]"
                    style={{ 
                      textShadow: '2px 2px 10px rgba(0,0,0,0.8)',
                      fontFamily: viewingMoment.overlayFont || 'sans-serif',
                      left: viewingMoment.overlayPosition ? `${viewingMoment.overlayPosition.x}%` : '50%',
                      top: viewingMoment.overlayPosition ? `${viewingMoment.overlayPosition.y}%` : '50%',
                    }}
                  >
                    {viewingMoment.overlayText}
                  </p>
                </div>
              )}
              
              {viewingMoment.caption && (
                <div className="absolute bottom-12 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-xl font-medium text-center">{viewingMoment.caption}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
