const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  '<aside className="fixed bottom-6 left-0 right-0 z-50 hidden md:flex justify-center pointer-events-none">',
  '<aside className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">'
);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);

let nav = fs.readFileSync('src/components/Navigation.tsx', 'utf8');
const bottomNavStart = nav.indexOf('{/* Mobile navigation bottom bar */}');
if (bottomNavStart !== -1) {
  nav = nav.substring(0, bottomNavStart) + '</>\n  );\n}';
}
fs.writeFileSync('src/components/Navigation.tsx', nav);
