const { createClient } = require('@supabase/supabase-js');
// I need the supabase URL and KEY
const fs = require('fs');
let sb = fs.readFileSync('src/supabase.ts', 'utf8');
let urlMatch = sb.match(/const supabaseUrl = '([^']+)'/);
let keyMatch = sb.match(/const supabaseAnonKey = '([^']+)'/);
if (!urlMatch && !keyMatch) {
  urlMatch = sb.match(/DEFAULT_SUPABASE_URL = '([^']+)'/);
  keyMatch = sb.match(/DEFAULT_SUPABASE_ANON_KEY = '([^']+)'/);
}

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  supabase.rpc('get_policies').then(console.log).catch(console.error);
}
