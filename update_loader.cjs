const fs = require('fs');
let content = fs.readFileSync('src/contexts/RefreshContext.tsx', 'utf8');

const oldLoader = `      <AnimatePresence>
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
      </AnimatePresence>`;

const newLoader = `      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ 
                scale: [0.95, 1.02, 0.95],
                opacity: 1,
                boxShadow: [
                  "inset 0 -5px 15px rgba(255, 255, 255, 0.4), inset 0 -30px 40px rgba(139, 92, 246, 0.5), inset 0 10px 20px rgba(139, 92, 246, 0.1), 0 0 40px rgba(139, 92, 246, 0.2)",
                  "inset 0 -5px 20px rgba(255, 255, 255, 0.8), inset 0 -40px 60px rgba(139, 92, 246, 0.8), inset 0 10px 25px rgba(139, 92, 246, 0.2), 0 0 60px rgba(139, 92, 246, 0.4)",
                  "inset 0 -5px 15px rgba(255, 255, 255, 0.4), inset 0 -30px 40px rgba(139, 92, 246, 0.5), inset 0 10px 20px rgba(139, 92, 246, 0.1), 0 0 40px rgba(139, 92, 246, 0.2)"
                ]
              }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ 
                scale: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                opacity: { duration: 0.2 }
              }}
              className="relative w-40 h-40 rounded-full bg-[#030014] flex items-center justify-center"
            >
              <span className="text-sm font-medium tracking-[0.25em] bg-gradient-to-r from-white via-white/90 to-white/20 bg-clip-text text-transparent ml-2">
                LOADING...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>`;

content = content.replace(oldLoader, newLoader);

// Also let's slightly increase the delay so the user can actually see this cool animation
content = content.replace('setTimeout(() => {        setIsRefreshing(false);      }, 300);', 'setTimeout(() => {        setIsRefreshing(false);      }, 800);');
content = content.replace('}, 200);', '}, 400);');

fs.writeFileSync('src/contexts/RefreshContext.tsx', content);
