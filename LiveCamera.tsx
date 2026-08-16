import { useEffect, useRef, useState } from 'react';
import { Camera, Video, X, Circle, Square, SwitchCamera } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function LiveCamera({ 
  onCapture, 
  onClose 
}: { 
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const chunksRef = useRef<BlobPart[]>([]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  const startCamera = async () => {
    stopCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode }, 
        audio: true 
      });
      streamRef.current = s;
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera/microphone.");
      onClose();
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopCamera();
        onCapture(file);
      }
    }, 'image/jpeg', 0.9);
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const mimeType = chunksRef.current.length > 0 ? (chunksRef.current[0] as Blob).type : 'video/webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `video_${Date.now()}.${ext}`, { type: mimeType });
      stopCamera();
      onCapture(file);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onClose} className="p-2 text-white bg-black/20 rounded-full backdrop-blur-sm">
          <X className="w-6 h-6" />
        </button>
        <div className="flex bg-black/40 backdrop-blur-sm rounded-full p-1">
          <button 
            onClick={() => { if (!isRecording) setMode('photo'); }}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", mode === 'photo' ? "bg-white text-black" : "text-white")}
          >
            Photo
          </button>
          <button 
            onClick={() => { if (!isRecording) setMode('video'); }}
            className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-colors", mode === 'video' ? "bg-white text-black" : "text-white")}
          >
            Video
          </button>
        </div>
        <button 
          onClick={() => {
            if (!isRecording) setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
          }}
          disabled={isRecording}
          className="p-2 text-white bg-black/20 rounded-full backdrop-blur-sm disabled:opacity-50"
        >
          <SwitchCamera className="w-6 h-6" />
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
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-20 right-4 flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full backdrop-blur-sm border border-red-500/50"
          >
            <motion.div 
              animate={{ opacity: [1, 0.5, 1] }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-2.5 h-2.5 bg-red-500 rounded-full"
            />
            <span className="text-red-500 text-xs font-bold tracking-wider uppercase">REC</span>
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center items-center bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        {mode === 'photo' ? (
          <button 
            onClick={takePhoto}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform"
          >
            <div className="w-full h-full bg-white rounded-full" />
          </button>
        ) : (
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "w-20 h-20 rounded-full border-4 flex items-center justify-center p-1 active:scale-95 transition-transform",
              isRecording ? "border-red-500" : "border-white"
            )}
          >
            <div className={cn(
              "transition-all duration-300",
              isRecording ? "w-8 h-8 bg-red-500 rounded-lg" : "w-full h-full bg-red-500 rounded-full"
            )} />
          </button>
        )}
      </div>
    </div>
  );
}
