const fs = require('fs');
let content = fs.readFileSync('src/pages/Messages.tsx', 'utf8');

const fetchMessagesPattern = /const myDms = parsed\.filter\(m => \n           \(m\.payload\.type === 'dm' \|\| m\.payload\.type === 'share'\) && \n           \(m\.senderId === profile\.id \|\| m\.payload\.receiverId === profile\.id\)\n        \);/;

const fetchMessagesReplace = `const myDms = parsed.filter(m => 
           !m.payload.isDeleted &&
           (m.payload.type === 'dm' || m.payload.type === 'share') && 
           (m.senderId === profile.id || m.payload.receiverId === profile.id)
        );`;

content = content.replace(fetchMessagesPattern, fetchMessagesReplace);

const realtimeFilterPattern = /if \(\(parsedPayload\.type === 'dm' \|\| parsedPayload\.type === 'share'\) && \n             \(newMsg\.senderId === profile\.id \|\| parsedPayload\.receiverId === profile\.id\)\) \{/;

const realtimeFilterReplace = `if (!parsedPayload.isDeleted && (parsedPayload.type === 'dm' || parsedPayload.type === 'share') && 
             (newMsg.senderId === profile.id || parsedPayload.receiverId === profile.id)) {`;

content = content.replace(realtimeFilterPattern, realtimeFilterReplace);

// We should also handle the case where the message gets updated to be deleted.
// If it exists and isDeleted, we remove it.
const realtimeUpdatePattern = /const exists = prev\.find\(m => m\.id === newMsg\.id\);\n            if \(exists\) \{\n              return prev\.map\(m => m\.id === newMsg\.id \? newMsg : m\);\n            \}\n            return \[\.\.\.prev, newMsg\];/;

const realtimeUpdateReplace = `const exists = prev.find(m => m.id === newMsg.id);
            if (newMsg.payload.isDeleted) {
              return prev.filter(m => m.id !== newMsg.id);
            }
            if (exists) {
              return prev.map(m => m.id === newMsg.id ? newMsg : m);
            }
            return [...prev, newMsg];`;

content = content.replace(realtimeUpdatePattern, realtimeUpdateReplace);

const handleDeletePattern = /const handleDelete = async \(messageId: string\) => \{\n    setMessages\(prev => prev\.filter\(m => m\.id !== messageId\)\);\n    const \{ error \} = await supabase\.from\('messages'\)\.delete\(\)\.eq\('id', messageId\);\n    if \(error\) console\.error\('Delete error:', error\);\n  \};/;

const handleDeleteReplace = `const handleDelete = async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // First try a hard delete
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    
    // If hard delete fails (e.g. due to RLS), fallback to soft delete
    if (error) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        const newPayload = { ...message.payload, isDeleted: true };
        await supabase.from('messages').update({ text: JSON.stringify(newPayload) }).eq('id', messageId);
      }
    }
  };`;

content = content.replace(handleDeletePattern, handleDeleteReplace);

fs.writeFileSync('src/pages/Messages.tsx', content);
