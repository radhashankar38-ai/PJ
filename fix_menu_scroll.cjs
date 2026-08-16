const fs = require('fs');
let content = fs.readFileSync('src/components/MessageContextMenu.tsx', 'utf8');

const oldListeners = `    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }, 10);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };`;

const newListeners = `    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('scroll', handleClickOutside, { capture: true });
    }, 10);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('scroll', handleClickOutside, { capture: true });
    };`;

content = content.replace(oldListeners, newListeners);
fs.writeFileSync('src/components/MessageContextMenu.tsx', content);
