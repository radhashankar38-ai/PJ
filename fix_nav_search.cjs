const fs = require('fs');
let nav = fs.readFileSync('src/components/Navigation.tsx', 'utf8');

nav = nav.replace(
  '<div className="block lg:hidden">\n                <AISearch />\n              </div>',
  ''
);

fs.writeFileSync('src/components/Navigation.tsx', nav);
