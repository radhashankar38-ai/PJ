const fs = require('fs');
let code = fs.readFileSync('src/pages/Messages.tsx', 'utf8');

// The file is currently broken. Let's fix it by carefully parsing and replacing.
// Let's just find the `handleDelete` and rewrite it.

const handleDeleteStart = code.indexOf('const handleDelete =');
const handleSubmitStart = code.indexOf('const handleSubmit =');

if (handleDeleteStart !== -1 && handleSubmitStart !== -1) {
  const newHandleDelete = `const handleDelete = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    try {
      const deletedList = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
      if (!deletedList.includes(messageId)) {
        deletedList.push(messageId);
        localStorage.setItem('deletedMessages', JSON.stringify(deletedList));
      }
    } catch(e) {}
    
    if (message?.payload?.mediaUrl && message.payload.mediaUrl.includes('/journals/')) {
       try {
          const path = message.payload.mediaUrl.split('/journals/')[1];
          if (path) {
             await supabase.storage.from('journals').remove([path]);
          }
       } catch (e) {
          console.error('Failed to delete media', e);
       }
    }

    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error && message) {
      const newPayload = { ...message.payload, isDeleted: true };
      await supabase.from('messages').update({ text: JSON.stringify(newPayload) }).eq('id', messageId);
    }
  };\n\n  `;
  
  code = code.substring(0, handleDeleteStart) + newHandleDelete + code.substring(handleSubmitStart);
}

fs.writeFileSync('src/pages/Messages.tsx', code);
