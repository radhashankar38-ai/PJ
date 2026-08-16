const fs = require('fs');
let content = fs.readFileSync('src/pages/Messages.tsx', 'utf8');
content = content.replace(
  "await supabase.from('messages').delete().eq('id', messageId);",
  "const { error } = await supabase.from('messages').delete().eq('id', messageId);\n    if (error) console.error('Delete error:', error);"
);
fs.writeFileSync('src/pages/Messages.tsx', content);
