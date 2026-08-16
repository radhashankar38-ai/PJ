import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function VoiceNotePlayer({ url, isMe, standalone }: { url: string, isMe?: boolean, standalone?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioData, setAudioData] = useState<number[]>(new Array(24).fill(4));
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(undefined);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && audio.duration !== Infinity) {
        setDuration(audio.duration);
      }
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (duration === 0 && audio.currentTime > 0) {
        setDuration(Math.max(audio.duration, audio.currentTime));
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [duration]);

  const initAudio = () => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // 32 bins
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
    } catch (e) {
      console.warn("Web Audio API not supported or CORS error", e);
    }
  };

  const updateWaveform = (timestamp: number) => {
    if (!isPlaying) return;
    
    if (timestamp - lastUpdateRef.current > 50) {
      lastUpdateRef.current = timestamp;
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const newHeights = [];
        for (let i = 0; i < 24; i++) {
          // Read lower-mid frequencies for voice
          const value = dataArray[i]; 
          const height = Math.max(4, (value / 255) * 32);
          newHeights.push(height);
        }
        setAudioData(newHeights);
      } else {
        // Fallback pseudo-random pattern if analyser failed
        setAudioData(prev => prev.map(() => Math.max(4, Math.random() * 24)));
      }
    }
    
    animationRef.current = requestAnimationFrame(updateWaveform);
  };

  useEffect(() => {
    if (isPlaying) {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      animationRef.current = requestAnimationFrame(updateWaveform);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setAudioData(new Array(24).fill(4)); // Reset to dots
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (!audioCtxRef.current) {
      initAudio();
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error(e));
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) : 0;

  const isDarkPill = standalone ? isMe : !isMe;


  return (
    <div className={cn(
      "flex items-center p-2 sm:p-3 rounded-full shadow-sm max-w-xs space-x-2 sm:space-x-3 w-64 my-1", 
      isDarkPill ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 " + (standalone ? "rounded-br-sm" : "border border-gray-800 dark:border-gray-200") : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-gray-200 dark:ring-gray-700 " + (standalone ? "rounded-bl-sm" : "border border-gray-100 dark:border-gray-700")
    )}>
      <audio ref={audioRef} src={url} preload="metadata" crossOrigin="anonymous" />
      
      <button
        onClick={togglePlay}
        className={cn(
          "rounded-full p-2 transition duration-200 shrink-0 flex items-center justify-center", 
          isDarkPill ? "bg-white text-gray-900 hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
        )}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
        ) : (
          <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current translate-x-[1px]" />
        )}
      </button>

      <div className="flex items-center justify-between flex-grow px-1 overflow-hidden h-10 space-x-0.5">
        
        
        {audioData.map((height, i) => {
          const isPassed = (i / audioData.length) <= progress;
          
          return (
            <motion.div
              key={i}
              animate={isPlaying ? { height } : { height: 4 }}
              transition={{ type: "tween", duration: 0.1, ease: "linear" }}
              className={cn(
                "w-1 rounded-full",
                isPlaying 
                  ? (isPassed ? (isDarkPill ? "bg-blue-400 dark:bg-blue-500" : "bg-blue-500 dark:bg-blue-400") : (isDarkPill ? "bg-gray-600 dark:bg-gray-300" : "bg-gray-300 dark:bg-gray-600"))
                  : (isDarkPill ? "bg-gray-500 dark:bg-gray-400" : "bg-gray-400 dark:bg-gray-500")
              )}
            />
          );
        })}


      </div>

      <span className={cn(
        "text-xs pr-1 font-mono shrink-0", 
        isDarkPill ? "text-gray-400" : "text-gray-500 dark:text-gray-400"
      )}>
        {formatTime(currentTime)}
      </span>
    </div>
  );
}
