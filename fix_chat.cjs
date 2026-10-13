const fs = require('fs');
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

if (!sidebar.includes('MessageCircle')) {
  sidebar = sidebar.replace("import { Home, Compass, Map as MapIcon, Clock, AlignLeft, Send, Zap, PenSquare } from 'lucide-react';",
  "import { Home, Compass, Map as MapIcon, Clock, AlignLeft, Send, Zap, PenSquare, MessageCircle } from 'lucide-react';");
}

const targetArray = `  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Write', icon: PenSquare, path: '/write' },
    { label: 'My Feed', icon: AlignLeft, path: '/my-feed' },
    { label: 'Moments', icon: Zap, path: '/moments' },
    { label: 'Messages', icon: Send, path: '/messages' },
    { label: 'Discovery', icon: Compass, path: '/discovery' },
    { label: 'Experience Map', icon: MapIcon, path: '/map' },
    { label: 'Time Capsule', icon: Clock, path: '/capsule' },
  ];`;

const newArray = `  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Write', icon: PenSquare, path: '/write' },
    { label: 'My Feed', icon: AlignLeft, path: '/my-feed' },
    { label: 'Moments', icon: Zap, path: '/moments' },
    { label: 'Chat', icon: MessageCircle, path: '/chat' },
    { label: 'Messages', icon: Send, path: '/messages' },
    { label: 'Discovery', icon: Compass, path: '/discovery' },
    { label: 'Map', icon: MapIcon, path: '/map' },
    { label: 'Capsule', icon: Clock, path: '/capsule' },
  ];`;

sidebar = sidebar.replace(targetArray, newArray);
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);

