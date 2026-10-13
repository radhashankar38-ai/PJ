const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  let sb = fs.readFileSync('src/supabase.ts', 'utf8');
  let urlMatch = sb.match(/const supabaseUrl = '([^']+)'/);
  let keyMatch = sb.match(/const supabaseAnonKey = '([^']+)'/);
  if (!urlMatch && !keyMatch) {
    urlMatch = sb.match(/DEFAULT_SUPABASE_URL = '([^']+)'/);
    keyMatch = sb.match(/DEFAULT_SUPABASE_ANON_KEY = '([^']+)'/);
  }

  if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    const { data: messages, error } = await supabase.from('messages').select('*').limit(5);
    console.log("Messages Error:", error);
    if (messages && messages.length > 0) {
       console.log("Sample message:", messages[0]);
    }
  }
}
run();
