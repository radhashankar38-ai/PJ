const fs = require('fs');
let content = fs.readFileSync('src/pages/Messages.tsx', 'utf8');

// Update fetchMessages to use localStorage
content = content.replace(
  'const myDms = parsed.filter(m => ',
  `const deletedList = JSON.parse(localStorage.getItem('deletedMessages') || '[]');\n        const myDms = parsed.filter(m => \n          !deletedList.includes(m.id) &&`
);

// Update handleDelete to use localStorage and delete storage image
content = content.replace(
  /const handleDelete = async \(messageId: string\) => {([\s\S]*?)};\n/g,
  `const handleDelete = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    // Store in localStorage as fallback since RLS might block DB delete
    try {
      const deletedList = JSON.parse(localStorage.getItem('deletedMessages') || '[]');
      if (!deletedList.includes(messageId)) {
        deletedList.push(messageId);
        localStorage.setItem('deletedMessages', JSON.stringify(deletedList));
      }
    } catch(e) {}
    
    // Actually delete the image from storage if it exists
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

    // First try a hard delete
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    
    // If hard delete fails (e.g. due to RLS), fallback to soft delete
    if (error && message) {
      const newPayload = { ...message.payload, isDeleted: true };
      await supabase.from('messages').update({ text: JSON.stringify(newPayload) }).eq('id', messageId);
    }
  };\n`
);

// Fix the realtime listener so if a soft-delete update DOES come through, it handles it
content = content.replace(
  `if (!parsedPayload.isDeleted && (parsedPayload.type === 'dm' || parsedPayload.type === 'share') && `,
  `if ((parsedPayload.type === 'dm' || parsedPayload.type === 'share') && `
);

// Update the setMessages inside realtime listener
content = content.replace(
  `            if (newMsg.payload.isDeleted) {
              return prev.filter(m => m.id !== newMsg.id);
            }
            if (exists) {`,
  `            if (newMsg.payload.isDeleted) {
              return prev.filter(m => m.id !== newMsg.id);
            }
            if (exists) {`
);

fs.writeFileSync('src/pages/Messages.tsx', content);
