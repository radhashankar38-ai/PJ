const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(
  '<aside className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">',
  '<aside className="fixed bottom-6 pb-safe left-0 right-0 z-50 flex justify-center pointer-events-none">'
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
