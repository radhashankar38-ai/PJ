const fs = require('fs');
let content = fs.readFileSync('src/pages/Messages.tsx', 'utf8');

const fetchMessagesPattern = "const myDms = parsed.filter(m => \n          (m.payload.type === 'dm' || m.payload.type === 'share') && \n          (m.senderId === profile.id || m.payload.receiverId === profile.id)\n        );";

content = content.replace(/const myDms = parsed\.filter\(m => \s*\(\(m\.payload\.type === 'dm' \|\| m\.payload\.type === 'share'\)\s*&&\s*\(m\.senderId === profile\.id \|\| m\.payload\.receiverId === profile\.id\)\)\s*\);/g, 
`const myDms = parsed.filter(m => 
          !m.payload.isDeleted &&
          (m.payload.type === 'dm' || m.payload.type === 'share') && 
          (m.senderId === profile.id || m.payload.receiverId === profile.id)
        );`);

// Wait, the regex might be wrong. Let's just do a simple replacement
content = content.replace("        const myDms = parsed.filter(m => \n          (m.payload.type === 'dm' || m.payload.type === 'share') && \n          (m.senderId === profile.id || m.payload.receiverId === profile.id)\n        );", 
`        const myDms = parsed.filter(m => 
          !m.payload.isDeleted &&
          (m.payload.type === 'dm' || m.payload.type === 'share') && 
          (m.senderId === profile.id || m.payload.receiverId === profile.id)
        );`);

// And for realtimeFilter:
content = content.replace(
"        if ((parsedPayload.type === 'dm' || parsedPayload.type === 'share') && \n            (newMsg.senderId === profile.id || parsedPayload.receiverId === profile.id)) {",
`        if (!parsedPayload.isDeleted && (parsedPayload.type === 'dm' || parsedPayload.type === 'share') && 
            (newMsg.senderId === profile.id || parsedPayload.receiverId === profile.id)) {`
);

fs.writeFileSync('src/pages/Messages.tsx', content);
