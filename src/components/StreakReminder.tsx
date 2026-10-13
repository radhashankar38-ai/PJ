import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function StreakReminder() {
  const { profile } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Only show if logged in and profile is loaded
    if (!profile) return;
    
    // Don't show reminder on the moments page itself
    if (location.pathname === '/moments') {
      setIsVisible(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const hasPostedToday = profile.lastMomentDate === today;
    
    // Have they dismissed it in this session?
    const isDismissed = sessionStorage.getItem('streak-reminder-dismissed') === 'true';

    // Show if they haven't posted today and haven't dismissed the reminder
    if (!hasPostedToday && !isDismissed) {
      // Delay it slightly for a smoother entry experience
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [profile, location.pathname]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    sessionStorage.setItem('streak-reminder-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }}
          className="fixed bottom-24 right-4 z-50 md:bottom-8 lg:bottom-8"
        >
          <Link 
            to="/moments"
            className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-900/50 shadow-2xl rounded-2xl p-4 pr-12 relative overflow-hidden group hover:scale-[1.02] transition-transform"
          >
            <div className="absolute top-0 right-0 p-2">
              <button 
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                aria-label="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500 animate-pulse" />
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                Don't break your streak!
              </h4>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                Share a daily moment to keep your fire alive.
              </p>
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
