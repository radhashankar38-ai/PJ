const fs = require('fs');
let content = fs.readFileSync('src/components/MessageContextMenu.tsx', 'utf8');

content = content.replace(
  "import { Reply, CornerDownLeft, MessageSquare, Copy, Smile, Forward, Pin, Star, Plus } from 'lucide-react';",
  "import { Reply, CornerDownLeft, MessageSquare, Copy, Smile, Forward, Pin, Star, Plus, Trash2 } from 'lucide-react';"
);

content = content.replace(
  "  onStar: () => void;\n}",
  "  onStar: () => void;\n  onDelete?: () => void;\n}"
);

content = content.replace(
  "export function MessageContextMenu({ x, y, onClose, messageId, senderName, isMe, onReact, onReply, onCopy, onForward, onPin, onStar }: MessageContextMenuProps) {",
  "export function MessageContextMenu({ x, y, onClose, messageId, senderName, isMe, onReact, onReply, onCopy, onForward, onPin, onStar, onDelete }: MessageContextMenuProps) {"
);

content = content.replace(
  "    { icon: Star, label: 'Star', onClick: onStar },\n  ];",
  "    { icon: Star, label: 'Star', onClick: onStar },\n    ...(isMe && onDelete ? [{ icon: Trash2, label: 'Delete', onClick: onDelete, destructive: true }] : []),\n  ];"
);

content = content.replace(
  "            <action.icon className=\"w-4 h-4 text-gray-300\" />\n            <span className=\"font-medium text-gray-200\">{action.label}</span>\n          </button>",
  "            <action.icon className={cn(\"w-4 h-4\", action.destructive ? \"text-red-500\" : \"text-gray-300\")} />\n            <span className={cn(\"font-medium\", action.destructive ? \"text-red-500\" : \"text-gray-200\")}>{action.label}</span>\n          </button>"
);

fs.writeFileSync('src/components/MessageContextMenu.tsx', content);
