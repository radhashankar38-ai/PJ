import { Compass, Sparkles, Map, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export function ComingSoon({ title, description, icon: Icon }: { title: string, description: string, icon: any }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-8 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-w-md flex-col items-center justify-center rounded-3xl bg-white dark:bg-black/50 p-12 shadow-xl ring-1 ring-gray-100 dark:ring-gray-800"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500">
          <Icon className="h-10 w-10" />
        </div>
        <h2 className="mb-4 text-3xl font-bold font-display text-gray-900 dark:text-white">{title}</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
        
        <div className="mt-8 rounded-full border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 px-6 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-400">
          In Development
        </div>
      </motion.div>
    </div>
  );
}
