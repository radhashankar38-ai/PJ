import { useEffect, useState, useRef, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { profile } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profile) return; // Only authenticated users

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        const publicMessages = data.filter(item => {
          try {
            const parsed = JSON.parse(item.text);
            if (parsed && typeof parsed === 'object' && (parsed.type === 'dm' || parsed.type === 'share')) return false;
            return true;
          } catch(e) {
            return true;
          }
        });

        setMessages(publicMessages.map(item => ({
          id: item.id,
          text: item.text,
          senderId: item.sender_id,
          senderName: item.sender_name,
          createdAt: item.created_at
        })).reverse());
      }
    };
    
    fetchMessages();

    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        let isPublic = true;
        try {
          const parsed = JSON.parse(payload.new.text);
          if (parsed && typeof parsed === 'object' && (parsed.type === 'dm' || parsed.type === 'share')) isPublic = false;
        } catch(e) {}

        if (isPublic) {
          setMessages(prev => [...prev, {
            id: payload.new.id,
            text: payload.new.text,
            senderId: payload.new.sender_id,
            senderName: payload.new.sender_name,
            createdAt: payload.new.created_at
          }]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [profile]);

  useEffect(() => {
    // Scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('messages').insert([{
        text: newMessage.trim(),
        sender_id: profile.id,
        sender_name: profile.displayName,
      }]);
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4 text-center">
        <div className="max-w-md rounded-2xl bg-white dark:bg-black p-8 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 transition-colors">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Join the Conversation</h2>
          <p className="text-gray-600 dark:text-gray-400">Please sign in to access the community chat room.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-4 md:py-8 h-[calc(100dvh-11rem)] flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 dark:text-white">Community Chat</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Connect with other journal writers.</p>
      </div>
      <div className="flex-1 overflow-hidden rounded-3xl bg-white dark:bg-black shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 flex flex-col transition-colors">
        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((message, i) => {
            const isMe = message.senderId === profile.id;
            const showName = i === 0 || messages[i - 1].senderId !== message.senderId;
            
            return (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                key={message.id} 
                className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
              >
                {!isMe && showName && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2 font-medium">{message.senderName}</span>
                )}
                <div 
                  className={cn(
                    "px-4 py-2.5 rounded-2xl break-words relative group",
                    isMe 
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-br-sm" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm"
                  )}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {message.createdAt ? format(new Date(message.createdAt), 'HH:mm') : ''}
                </span>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {/* Input Area */}
        <div className="border-t border-gray-100 dark:border-gray-900 p-4 bg-gray-50/50 dark:bg-black/50">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-5 py-3 text-sm focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white bg-white dark:bg-black text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
            <button
              type="submit"
              disabled={submitting || !newMessage.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
