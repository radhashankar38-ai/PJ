import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Map as MapIcon, Clock, AlignLeft, Send, Zap, PenSquare, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { Dock, DockIcon, DockItem, DockLabel } from './ui/dock';
import { AISearch } from './AISearch';
import { useState } from 'react';
import { useRefresh } from '../contexts/RefreshContext';
import { motion } from 'motion/react';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { smoothReload } = useRefresh();

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Write', icon: PenSquare, path: '/write' },
    { label: 'My Feed', icon: AlignLeft, path: '/my-feed' },
    { label: 'Moments', icon: Zap, path: '/moments' },
    { label: 'Chat', icon: MessageCircle, path: '/chat' },
    { label: 'Messages', icon: Send, path: '/messages' },
    { label: 'Discovery', icon: Compass, path: '/discovery' },
    { label: 'Map', icon: MapIcon, path: '/map' },
    { label: 'Capsule', icon: Clock, path: '/capsule' },
  ];

  return (
    <aside className="fixed bottom-6 pb-safe left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto">
        <Dock className="items-center max-w-[100vw] overflow-x-auto no-scrollbar">
          <motion.div
            initial={false}
            animate={{
              width: isSearchExpanded ? 0 : "auto",
              opacity: isSearchExpanded ? 0 : 1,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex items-center gap-2 md:gap-4 overflow-x-auto overflow-y-hidden no-scrollbar shrink-0 px-2"
          >
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path;
              return (
                <DockItem
                  key={idx}
                  onClick={() => navigate(item.path)}
                  onDoubleClick={() => smoothReload(item.path)}
                  className={cn(
                    "aspect-square rounded-[1.25rem] transition-colors",
                    isActive 
                      ? "bg-gray-800 dark:bg-white" 
                      : "bg-transparent hover:bg-gray-800/50 dark:hover:bg-gray-800"
                  )}
                >
                  <DockLabel>{item.label}</DockLabel>
                  <DockIcon>
                    <item.icon className={cn(
                      "h-full w-full",
                      isActive 
                        ? "text-white dark:text-gray-900" 
                        : "text-gray-400 dark:text-gray-400"
                    )} />
                  </DockIcon>
                </DockItem>
              );
            })}
          </motion.div>
          
          <div className={cn("flex items-center justify-center transition-all duration-300", !isSearchExpanded && "ml-2")}>
            <AISearch dropdownPosition="top" onExpandChange={setIsSearchExpanded} />
          </div>
        </Dock>
      </div>
    </aside>
  );
}
