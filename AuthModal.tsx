import { useState, type FormEvent } from 'react';
import { supabase } from '../supabase';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const sanitizedId = identifier.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_.-@]/g, '');
      const emailToUse = sanitizedId.includes('@') ? sanitizedId : `${sanitizedId}@pj.app`;
      
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: emailToUse,
          password: password,
        });
        if (error) throw error;
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-black p-8 shadow-2xl transition-colors z-10">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        
        <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">User ID / Username</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-gray-900 dark:text-white focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
              placeholder="e.g. johndoe"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-2 text-gray-900 dark:text-white focus:border-gray-900 dark:focus:border-white focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white transition-colors"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 dark:bg-white px-4 py-2.5 text-center text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Sign up')}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-gray-900 dark:text-white hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
