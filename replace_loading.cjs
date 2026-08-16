const fs = require('fs');

const filesToUpdate = [
  'src/pages/Feed.tsx',
  'src/pages/MyFeed.tsx',
  'src/pages/TimeCapsule.tsx',
  'src/pages/UserProfile.tsx',
  'src/pages/JournalDetail.tsx',
  'src/pages/Discovery.tsx'
];

for (const file of filesToUpdate) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('LoadingScreen')) {
    // Add import
    const importRegex = /(import .* from 'react';)/;
    if (content.match(importRegex)) {
      content = content.replace(importRegex, "$1\nimport { LoadingScreen } from '../components/ui/LoadingScreen';");
    } else {
        content = "import { LoadingScreen } from '../components/ui/LoadingScreen';\n" + content;
    }
  }

  // Replace various loading blocks
  // block 1: Feed
  content = content.replace(
    /if \(loading\) {\s*return \(\s*<div className="flex min-h-\[50vh\] items-center justify-center">\s*<div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"><\/div>\s*<\/div>\s*\);\s*}/g,
    'if (loading) return <LoadingScreen />;'
  );

  // block 2: MyFeed, TimeCapsule, UserProfile
  content = content.replace(
    /if \(loading\) {\s*return \(\s*<div className="flex h-64 items-center justify-center">\s*<Loader2 className="h-8 w-8 animate-spin text-gray-400" \/>\s*<\/div>\s*\);\s*}/g,
    'if (loading) return <LoadingScreen />;'
  );

  content = content.replace(
    /if \(loading\) {\s*return \(\s*<div className="p-8 text-center text-gray-500">Loading...<\/div>\s*\);\s*}/g,
    'if (loading) return <LoadingScreen />;'
  );

  // JournalDetail one-liner
  content = content.replace(
    /if \(loading\) return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Loading...<\/div>;/g,
    'if (loading) return <LoadingScreen />;'
  );
  
  fs.writeFileSync(file, content);
}
