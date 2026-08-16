import { useState, useEffect, FormEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Clock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface AISearchProps {
  dropdownPosition?: 'top' | 'bottom';
  onExpandChange?: (expanded: boolean) => void;
}

export function AISearch({ dropdownPosition = 'bottom', onExpandChange }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (onExpandChange) {
      onExpandChange(isFocused || query.length > 0);
    }
  }, [isFocused, query, onExpandChange]);

  useEffect(() => {
    const saved = localStorage.getItem('ai_search_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse search history');
      }
    }
  }, []);

  const saveHistory = (newHistory: string[]) => {
    setHistory(newHistory);
    localStorage.setItem('ai_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    const newQuery = query.trim();
    const newHistory = [newQuery, ...history.filter(q => q !== newQuery)].slice(0, 5);
    saveHistory(newHistory);
    
    setIsFocused(false);
    navigate(`/discovery?q=${encodeURIComponent(newQuery)}`);
  };

  const removeHistoryItem = (e: ReactMouseEvent, item: string) => {
    e.stopPropagation();
    saveHistory(history.filter(q => q !== item));
  };

  const selectHistoryItem = (item: string) => {
    setQuery(item);
    const newHistory = [item, ...history.filter(q => q !== item)].slice(0, 5);
    saveHistory(newHistory);
    setIsFocused(false);
    navigate(`/discovery?q=${encodeURIComponent(item)}`);
  };

  return (
    <div className="relative z-50 flex flex-col items-end">
      <form onSubmit={handleSearch} className="relative z-50">
        <div className="search-container">
          <input 
            className="search-checkbox" 
            type="checkbox" 
            checked={!isFocused && query.length === 0} 
            onChange={(e) => {
               if (e.target.checked) {
                 setIsFocused(false);
                 setQuery('');
               } else {
                 setIsFocused(true);
               }
            }}
          /> 
          <div className="search-mainbox">
              <div className="search-iconContainer">
                  <svg viewBox="0 0 512 512" height="1em" xmlns="http://www.w3.org/2000/svg" className="search-icon"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"></path></svg>
              </div>
           <input 
              className="search-input" 
              placeholder="Search journals, users, or topics..." 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            />
          </div>
        </div>
      </form>

      <AnimatePresence>
        {isFocused && history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -10 : 10 }}
            className={cn(
              "absolute left-0 right-0 bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50",
              dropdownPosition === 'bottom' ? "top-full mt-2" : "bottom-full mb-2"
            )}
          >
            <div className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              Recent Searches
            </div>
            <ul className="max-h-60 overflow-y-auto py-1">
              {history.map((item, index) => (
                <li key={index}>
                  <button
                    onClick={() => selectHistoryItem(item)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between group transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                      {item}
                    </span>
                    <span
                      onClick={(e) => removeHistoryItem(e, item)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
