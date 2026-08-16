import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';

interface RefreshContextType {
  smoothReload: (targetPath?: string) => void;
  refreshKey: number;
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const smoothReload = useCallback((targetPath?: string) => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (targetPath && targetPath !== location.pathname) {
        navigate(targetPath);
      }
      setRefreshKey(prev => prev + 1);
      
      // Delay before fading out loader
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }, 200);
  }, [navigate, location]);

  return (
    <RefreshContext.Provider value={{ smoothReload, refreshKey }}>
      {children}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-[#F9FAFB] dark:bg-black flex items-center justify-center"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-10 h-10 border-[3px] border-gray-200 border-t-gray-800 dark:border-gray-800 dark:border-t-gray-300 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </RefreshContext.Provider>
  );
}

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};
