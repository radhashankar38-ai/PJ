const fs = require('fs');
let menu = fs.readFileSync('src/components/MessageContextMenu.tsx', 'utf8');

menu = menu.replace(
  '<div className="w-60 bg-[#1c1c1c] text-white rounded-2xl shadow-xl border border-gray-800 py-2">',
  '<div className="w-60 bg-[#1c1c1c] text-white rounded-2xl shadow-xl border border-gray-800 py-2 max-h-[50vh] overflow-y-auto no-scrollbar">'
);

// Also add bounds checking for safeY to avoid negative top values
menu = menu.replace(
  'const safeY = Math.min(y, window.innerHeight - 380);',
  'const safeY = Math.max(10, Math.min(y, window.innerHeight - 380));'
);

fs.writeFileSync('src/components/MessageContextMenu.tsx', menu);
