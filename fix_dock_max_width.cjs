const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(
  '<Dock className="items-center">',
  '<Dock className="items-center max-w-[100vw] overflow-x-auto no-scrollbar">'
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
