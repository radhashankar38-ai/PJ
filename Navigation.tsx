import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { PenSquare, BookOpen, MessageCircle, LogOut, User as UserIcon, Moon, Sun, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { useRefresh } from '../contexts/RefreshContext';
import { AuthModal } from './AuthModal';
import { AISearch } from './AISearch';

export function Navigation() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { smoothReload } = useRefresh();
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const links = [
    { name: 'Feed', href: '/', icon: BookOpen },
    { name: 'Write', href: '/write', icon: PenSquare, requiresAuth: true },
    { name: 'Chat', href: '/chat', icon: MessageCircle, requiresAuth: true },
  ];

  return (
    <>
      <nav className="fixed w-full top-0 z-40 border-b border-gray-100 dark:border-gray-900 bg-white/80 dark:bg-black/80 backdrop-blur-md transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-gray-900 dark:text-white" />
                <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">PJ</span>
              </Link>
              
              <div className="hidden md:flex gap-1">
                {links.map((link) => {
                  if (link.requiresAuth && !profile) return null;
                  const isActive = location.pathname === link.href;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.name}
                      to={link.href}
                      onDoubleClick={() => smoothReload(link.href)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive 
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" 
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className="flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="h-5 w-5" />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-1 shadow-lg shadow-gray-200/50 dark:shadow-black/50 z-50">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Settings
                    </div>
                    
                    {profile && (
                      <Link 
                        to="/profile" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
                        onClick={() => setIsSettingsOpen(false)}
                      >
                        <UserIcon className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        toggleTheme();
                      }}
                      className="flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Moon className="h-4 w-4" />
                        <span>Dark Mode</span>
                      </div>
                      
                      <div className="pointer-events-none scale-[0.65] origin-right">
                        <label className="theme-switch" onClick={(e) => e.preventDefault()}>
                          <input id="input" type="checkbox" checked={theme === 'dark'} readOnly />
                          <div className="slider round">
                            <div className="sun-moon">
                              <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>

                              <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                              <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="50"></circle>
                              </svg>
                            </div>
                            <div className="stars">
                              <svg id="star-1" className="star" viewBox="0 0 20 20">
                                <path
                                  d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"
                                ></path>
                              </svg>
                              <svg id="star-2" className="star" viewBox="0 0 20 20">
                                <path
                                  d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"
                                ></path>
                              </svg>
                              <svg id="star-3" className="star" viewBox="0 0 20 20">
                                <path
                                  d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"
                                ></path>
                              </svg>
                              <svg id="star-4" className="star" viewBox="0 0 20 20">
                                <path
                                  d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"
                                ></path>
                              </svg>
                            </div>
                          </div>
                        </label>
                      </div>
                    </button>

                    {profile && (
                      <>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-800"></div>
                        <div className="px-4 py-2.5 flex justify-end">
                          <button
                            onClick={() => {
                              signOut();
                              setIsSettingsOpen(false);
                            }}
                            className="btn-logout-animated"
                          >
                            <div className="sign">
                              <svg viewBox="0 0 512 512">
                                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path>
                              </svg>
                            </div>
                            <div className="text">Logout</div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {!profile && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="rounded-full bg-gray-900 dark:bg-white px-5 py-2 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      
      </>
  );
}