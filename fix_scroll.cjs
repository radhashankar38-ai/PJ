const fs = require('fs');
let content = fs.readFileSync('src/pages/Messages.tsx', 'utf8');

const oldScroll = `  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, activeChatUserId]);`;

const newScroll = `  const prevActiveChatUserId = useRef<string | null>(null);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (activeChatUserId !== prevActiveChatUserId.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
      prevActiveChatUserId.current = activeChatUserId;
    } else if (messages.length > prevMessagesLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, activeChatUserId]);`;

content = content.replace(oldScroll, newScroll);
fs.writeFileSync('src/pages/Messages.tsx', content);
