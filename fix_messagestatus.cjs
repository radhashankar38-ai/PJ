const fs = require('fs');
let content = fs.readFileSync('src/components/MessageStatus.tsx', 'utf8');

content = content.replace(
  `return <Check className="w-3.5 h-3.5 text-gray-400" />`,
  `return <div className="w-4 flex justify-center"><Check className="w-3.5 h-3.5 text-gray-400" /></div>`
);
content = content.replace(
  `return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />`,
  `return <div className="w-4 flex justify-center"><CheckCheck className="w-3.5 h-3.5 text-gray-400" /></div>`
);
content = content.replace(
  `return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />`,
  `return <div className="w-4 flex justify-center"><CheckCheck className="w-3.5 h-3.5 text-blue-500" /></div>`
);

fs.writeFileSync('src/components/MessageStatus.tsx', content);
