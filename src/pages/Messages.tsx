import { useEffect, useState, useRef, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Send, ArrowLeft, Search, MessageCircle, Image as ImageIcon, Paperclip, Camera, Mic, X, Loader2, Square, Pin, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { VoiceNotePlayer } from '../components/VoiceNotePlayer';
import { LiveCamera } from '../components/LiveCamera';
import { MessageStatus } from '../components/MessageStatus';
import { MessageContextMenu } from '../components/MessageContextMenu';

type ParsedMessage = {
  id: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  payload: {
    type?: string;
    text?: string;
    receiverId?: string;
    journalId?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
    reactions?: Record<string, string>;
    replyToId?: string;
    isPinned?: boolean;
    isStarred?: boolean;
  };
};

type UserData = {
  id: string;
  display_name: string;
  username: string;
  photo_url?: string;
};

export function Messages() {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [users, setUsers] = useState<Record<string, UserData>>({});
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string, senderName: string, isMe: boolean, x: number, y: number } | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  
  const { profile } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!profile) return;
    
    // Fetch users for new message search
    const fetchAllUsers = async () => {
      const { data } = await supabase.from('users').select('id, display_name, username, photo_url');
      if (data) {
        setAllUsers(data);
        const map: Record<string, UserData> = {};
        data.forEach((u: any) => map[u.id] = u);
        setUsers(map);
      }
    };
    fetchAllUsers();

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (data) {
        const parsed = data.map(item => {
          let payload: ParsedMessage['payload'] = { text: item.text, type: 'public' };
          try {
            const maybeJson = JSON.parse(item.text);
            if (maybeJson && typeof maybeJson === 'object') {
              payload = maybeJson;
            }
          } catch(e) {}
          
          return {
            id: item.id,
            senderId: item.sender_id,
            senderName: item.sender_name,
            createdAt: item.created_at,
            payload
          } as ParsedMessage;
        });
        
        // Filter only DMs involving me
        const deletedList = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
        const myDms = parsed.filter(m => 
          !deletedList.includes(m.id) &&
          !m.payload.isDeleted &&
          (m.payload.type === 'dm' || m.payload.type === 'share') && 
          (m.senderId === profile.id || m.payload.receiverId === profile.id)
        );
        
        setMessages(myDms.reverse());
      }
    };
    
    fetchMessages();

    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          return;
        }
        let parsedPayload: ParsedMessage['payload'] = { text: payload.new.text, type: 'public' };
        try {
          const maybeJson = JSON.parse(payload.new.text);
          if (maybeJson && typeof maybeJson === 'object') parsedPayload = maybeJson;
        } catch(e) {}
        
        const newMsg: ParsedMessage = {
          id: payload.new.id,
          senderId: payload.new.sender_id,
          senderName: payload.new.sender_name,
          createdAt: payload.new.created_at,
          payload: parsedPayload
        };
        
        if ((parsedPayload.type === 'dm' || parsedPayload.type === 'share') && 
            (newMsg.senderId === profile.id || parsedPayload.receiverId === profile.id)) {
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id);
            if (newMsg.payload.isDeleted) {
              return prev.filter(m => m.id !== newMsg.id);
            }
            if (exists) {
              return prev.map(m => m.id === newMsg.id ? newMsg : m);
            }
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);

  const prevActiveChatUserId = useRef<string | null>(null);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (activeChatUserId !== prevActiveChatUserId.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      prevActiveChatUserId.current = activeChatUserId;
    } else if (messages.length > prevMessagesLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, activeChatUserId]);

  
  const handleUpdateMessage = async (messageId: string, updates: Partial<ParsedMessage['payload']>) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    const newPayload = { ...message.payload, ...updates };
    
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, payload: newPayload } : m));
    
    await supabase.from('messages').update({ text: JSON.stringify(newPayload) }).eq('id', messageId);
  };
  
  const handleReact = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || !profile) return;
    const reactions = { ...(message.payload.reactions || {}) };
    if (reactions[profile.id] === emoji) {
      delete reactions[profile.id]; // Toggle off
    } else {
      reactions[profile.id] = emoji;
    }
    handleUpdateMessage(messageId, { reactions });
  };
  
  const handlePin = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    handleUpdateMessage(messageId, { isPinned: !message.payload.isPinned });
  };
  
  const handleStar = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    handleUpdateMessage(messageId, { isStarred: !message.payload.isStarred });
  };

  const handleDelete = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      const deletedList = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
      if (!deletedList.includes(messageId)) {
        deletedList.push(messageId);
        localStorage.setItem('deletedMessages', JSON.stringify(deletedList));
      }
    } catch(e) {}
    
    if (message?.payload?.mediaUrl && message.payload.mediaUrl.includes('/journals/')) {
       try {
          const path = message.payload.mediaUrl.split('/journals/')[1];
          if (path) {
             await supabase.storage.from('journals').remove([path]);
          }
       } catch (e) {
          console.error('Failed to delete media', e);
       }
    }

    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error && message) {
      const newPayload = { ...message.payload, isDeleted: true };
      await supabase.from('messages').update({ text: JSON.stringify(newPayload) }).eq('id', messageId);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!profile || (!newMessage.trim() && !attachment) || !activeChatUserId) return;
    setSubmitting(true);
    try {
      let mediaUrl = undefined;
      let mediaType = undefined;
      let fileName = undefined;

      if (attachment) {
        const fileExt = attachment.name.split('.').pop() || 'bin';
        const rawFileName = `${profile.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('journals')
          .upload(rawFileName, attachment);
          
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('journals')
            .getPublicUrl(rawFileName);
          mediaUrl = publicUrl;
          
          if (attachment.type.startsWith('image/')) mediaType = 'image';
          else if (attachment.type.startsWith('video/')) mediaType = 'video';
          else if (attachment.type.startsWith('audio/')) mediaType = 'audio';
          else mediaType = 'file';
          
          fileName = attachment.name;
        } else {
          // Fallback to data URL
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve((ev.target?.result as string) || '');
            reader.readAsDataURL(attachment);
          });
          if (dataUrl) {
            mediaUrl = dataUrl;
            if (attachment.type.startsWith('image/')) mediaType = 'image';
            else if (attachment.type.startsWith('video/')) mediaType = 'video';
            else if (attachment.type.startsWith('audio/')) mediaType = 'audio';
            else mediaType = 'file';
            fileName = attachment.name;
          }
        }
      }

      await supabase.from('messages').insert([{
        text: JSON.stringify({ 
          type: 'dm', 
          receiverId: activeChatUserId, 
          text: newMessage.trim(),
          mediaUrl,
          mediaType,
          fileName,
          replyToId: replyToMessageId
        }),
        sender_id: profile.id,
        sender_name: profile.displayName,
      }]);
      setNewMessage('');
      setAttachment(null);
      setReplyToMessageId(null);
    } catch (error) {
      console.error("Error sending message: ", error);
    } finally {
      setSubmitting(false);
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
        setAttachment(audioFile);
        
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


  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4 text-center">
        <div className="max-w-md rounded-2xl bg-white dark:bg-black p-8 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Messages</h2>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to view your direct messages.</p>
        </div>
      </div>
    );
  }

  // Get unique conversations
  const conversations = new Set<string>();
  messages.forEach(m => {
    if (m.senderId === profile.id && m.payload.receiverId) conversations.add(m.payload.receiverId);
    if (m.payload.receiverId === profile.id) conversations.add(m.senderId);
  });

  const chatMessages = messages.filter(m => 
    (m.senderId === activeChatUserId && m.payload.receiverId === profile.id) ||
    (m.senderId === profile.id && m.payload.receiverId === activeChatUserId)
  );

  const filteredUsers = allUsers.filter(u => 
    u.id !== profile.id && 
    (u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>

      {showLiveCamera && (
        <LiveCamera
          onClose={() => setShowLiveCamera(false)}
          onCapture={(file) => {
            setAttachment(file);
            setShowLiveCamera(false);
          }}
        />
      )}

    
      <AnimatePresence>
        {contextMenu && (
          <MessageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            messageId={contextMenu.messageId}
            senderName={contextMenu.senderName}
            isMe={contextMenu.isMe}
            onClose={() => setContextMenu(null)}
            onReact={(emoji) => handleReact(contextMenu.messageId, emoji)}
            onReply={() => setReplyToMessageId(contextMenu.messageId)}
            onCopy={() => {
              const msg = messages.find(m => m.id === contextMenu.messageId);
              if (msg && msg.payload.text) navigator.clipboard.writeText(msg.payload.text);
            }}
            onForward={() => alert('Forward feature coming soon!')}
            onPin={() => handlePin(contextMenu.messageId)}
            onStar={() => handleStar(contextMenu.messageId)}
            onDelete={() => handleDelete(contextMenu.messageId)}
          />
        )}
      </AnimatePresence>
<div className="mx-auto max-w-6xl px-4 py-8 h-[calc(100dvh-11rem)]">
      <div className="flex h-full rounded-3xl bg-white dark:bg-black shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 overflow-hidden">
        
        {/* Left Pane: Threads */}
        <div className={cn("w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-100 dark:border-gray-800 shrink-0", activeChatUserId ? "hidden md:flex" : "flex")}>
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold">Messages</h2>
            <button 
              onClick={() => setIsSearching(!isSearching)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="p-2">
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  className="w-full bg-gray-100 dark:bg-gray-900 rounded-xl px-4 py-2 mb-2 outline-none"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {filteredUsers.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => { setActiveChatUserId(u.id); setIsSearching(false); setSearchQuery(''); }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0">
                      {u.photo_url ? <img src={u.photo_url} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold truncate">{u.display_name}</p>
                      <p className="text-xs text-gray-500 truncate">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-2">
                {Array.from(conversations).map(userId => {
                  const user = users[userId];
                  const lastMessage = messages.filter(m => 
                    (m.senderId === userId && m.payload.receiverId === profile.id) ||
                    (m.senderId === profile.id && m.payload.receiverId === userId)
                  ).pop();
                  
                  if (!user) return null;
                  
                  return (
                    <button 
                      key={userId}
                      onClick={() => setActiveChatUserId(userId)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                        activeChatUserId === userId ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-900"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center font-bold">
                        {user.photo_url ? <img src={user.photo_url} className="w-full h-full object-cover" /> : user.display_name.charAt(0)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-semibold truncate">{user.display_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {lastMessage?.payload.type === 'share' ? 'Shared a journal' : lastMessage?.payload.text}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {conversations.size === 0 && !isSearching && (
                  <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                    <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                    <p>No messages yet.</p>
                    <button onClick={() => setIsSearching(true)} className="mt-4 text-sm font-semibold text-blue-500">
                      Start a conversation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat */}
        <div className={cn("flex-1 flex-col", activeChatUserId ? "flex" : "hidden md:flex")}>
          {activeChatUserId ? (
            <>
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0">
                <button 
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setActiveChatUserId(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden shrink-0">
                  {users[activeChatUserId]?.photo_url ? <img src={users[activeChatUserId].photo_url} className="w-full h-full object-cover" /> : null}
                </div>
                <h3 className="font-bold">{users[activeChatUserId]?.display_name}</h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-[#0a0a0a]">
                {chatMessages.map((message, i) => {
                  const isMe = message.senderId === profile.id;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={message.id} 
                      className={cn("flex flex-col max-w-[75%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({
                          messageId: message.id,
                          senderName: message.senderName || users[message.senderId]?.display_name || 'User',
                          isMe,
                          x: e.clientX,
                          y: e.clientY
                        });
                      }}
                    >
                      {message.payload.type === 'share' ? (
                        <div className={cn(
                          "rounded-2xl p-1 overflow-hidden",
                          isMe ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-br-sm" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm"
                        )}>
                          <Link to={`/journal/${message.payload.journalId}`} className="block relative w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden group">
                            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                              <ImageIcon className="w-8 h-8 opacity-50" />
                              <span className="text-xs font-semibold px-4 text-center">View Shared Journal</span>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </Link>
                          {message.payload.text && (
                            <p className="px-3 py-2 text-sm">{message.payload.text}</p>
                          )}
                        </div>
                      ) : (
                        <>
                        {message.payload.replyToId && (
                          <div className={cn(
                            "mb-1 px-3 py-2 rounded-xl text-xs opacity-80 border-l-2",
                            isMe ? "bg-gray-800 dark:bg-gray-200 border-gray-400" : "bg-gray-100 dark:bg-gray-800 border-blue-400"
                          )}>
                            <div className="font-semibold">{messages.find(m => m.id === message.payload.replyToId)?.senderName || 'Message'}</div>
                            <div className="truncate">{messages.find(m => m.id === message.payload.replyToId)?.payload.text || 'Attachment'}</div>
                          </div>
                        )}
                        <div className={cn(
                          "break-words relative",
                          message.payload.mediaType === 'audio' && !message.payload.text ? "" : "px-4 py-2.5 rounded-2xl",
                          message.payload.mediaType === 'audio' && !message.payload.text ? "" : (isMe ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-br-sm" : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm")
                        )}>
                          {(message.payload.isPinned || message.payload.isStarred) && (
                            <div className="absolute -top-3 -right-2 flex gap-1 z-10">
                              {message.payload.isPinned && <div className="bg-yellow-100 text-yellow-600 rounded-full p-0.5 shadow-sm ring-1 ring-yellow-200"><Pin className="w-3 h-3" /></div>}
                              {message.payload.isStarred && <div className="bg-yellow-100 text-yellow-600 rounded-full p-0.5 shadow-sm ring-1 ring-yellow-200"><Star className="w-3 h-3 fill-current" /></div>}
                            </div>
                          )}

                          {message.payload.mediaUrl && (
                            <div className={cn(message.payload.mediaType === 'audio' && !message.payload.text ? "" : "-mx-2 -mt-1 rounded-xl overflow-hidden", message.payload.text && "mb-2")}>
                              {message.payload.mediaType === 'image' && <img src={message.payload.mediaUrl} alt="attachment" className="w-full max-w-sm rounded-xl" />}
                              {message.payload.mediaType === 'video' && <video src={message.payload.mediaUrl} controls className="w-full max-w-sm rounded-xl" />}
                              {message.payload.mediaType === 'audio' && <div className={message.payload.text ? "p-2 flex justify-center" : ""}><VoiceNotePlayer url={message.payload.mediaUrl} isMe={isMe} standalone={!message.payload.text} /></div>}
                              {message.payload.mediaType === 'file' && (
                                <a href={message.payload.mediaUrl} target="_blank" rel="noreferrer" className="underline break-all block p-2">
                                  📎 {message.payload.fileName || 'Download File'}
                                </a>
                              )}
                            </div>
                          )}
                          {message.payload.text && <p className="text-sm whitespace-pre-wrap">{message.payload.text}</p>}
                          {message.payload.reactions && Object.keys(message.payload.reactions).length > 0 && (
                            <div className={cn("absolute -bottom-3 flex items-center gap-0.5 bg-[#202020] rounded-full p-0.5 px-1 shadow-sm border border-gray-700", isMe ? "right-2" : "left-2")}>
                              {Array.from(new Set(Object.values(message.payload.reactions))).map(emoji => (
                                <span key={emoji} className="text-xs">{emoji}</span>
                              ))}
                              {Object.keys(message.payload.reactions).length > 1 && (
                                <span className="text-[10px] text-gray-400 ml-0.5 font-medium">{Object.keys(message.payload.reactions).length}</span>
                              )}
                            </div>
                          )}
                        </div>
                        </>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1 mx-1">
                        <span className="text-[10px] text-gray-400">
                          {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
                        </span>
                        {isMe && message.createdAt && (
                          <MessageStatus createdAt={message.createdAt} />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black shrink-0">
                
                {replyToMessageId && (
                  <div className="mb-3 flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Replying to {messages.find(m => m.id === replyToMessageId)?.senderName}</span>
                      <span className="text-sm truncate opacity-70">
                        {messages.find(m => m.id === replyToMessageId)?.payload.text || 'Attachment'}
                      </span>
                    </div>
                    <button onClick={() => setReplyToMessageId(null)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {attachment && !recordingAudio && (
                  <div className="mb-3 flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a]">
                    <div className="flex items-center gap-2 truncate">
                      {attachment.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : attachment.type.startsWith('audio/') ? <Mic className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                      <span className="text-sm truncate font-medium">{attachment.name}</span>
                    </div>
                    <button onClick={() => setAttachment(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachment(e.target.files[0]);
                      }
                    }}
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*,video/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachment(e.target.files[0]);
                      }
                    }}
                  />
                  
                  {!recordingAudio && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLiveCamera(true)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {recordingAudio ? (
                    <div className="flex-1 flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full px-5 py-3 text-sm font-medium animate-pulse">
                      <Mic className="w-4 h-4" />
                      Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Message..."
                      className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-5 py-3 text-sm focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white bg-transparent"
                    />
                  )}

                  {recordingAudio ? (
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </button>
                  ) : newMessage.trim() || attachment ? (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startAudioRecording}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </form>

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Your Messages</p>
              <p className="text-sm">Select a conversation or start a new one.</p>
            </div>
          )}
        </div>

      </div>
    </div>
    </>
  );
}
