const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(
  'className="flex items-center gap-4 overflow-hidden shrink-0"',
  'className="flex items-center gap-2 md:gap-4 overflow-x-auto overflow-y-hidden no-scrollbar shrink-0 px-2"'
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
