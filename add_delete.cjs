const fs = require('fs');
let content = fs.readFileSync('src/pages/Messages.tsx', 'utf8');

const handleStarCode = `  const handleStar = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    handleUpdateMessage(messageId, { isStarred: !message.payload.isStarred });
  };`;

const handleDeleteCode = `  const handleStar = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    handleUpdateMessage(messageId, { isStarred: !message.payload.isStarred });
  };

  const handleDelete = async (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
    await supabase.from('messages').delete().eq('id', messageId);
  };`;

content = content.replace(handleStarCode, handleDeleteCode);

const contextMenuCode = `            onPin={() => handlePin(contextMenu.messageId)}
            onStar={() => handleStar(contextMenu.messageId)}
          />`;

const contextMenuNewCode = `            onPin={() => handlePin(contextMenu.messageId)}
            onStar={() => handleStar(contextMenu.messageId)}
            onDelete={() => handleDelete(contextMenu.messageId)}
          />`;

content = content.replace(contextMenuCode, contextMenuNewCode);

fs.writeFileSync('src/pages/Messages.tsx', content);
