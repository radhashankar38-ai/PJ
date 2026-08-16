import { supabase } from './src/supabase';
async function test() {
  const { data, error } = await supabase.from('users').select('id, display_name, username, photo_url');
  console.log(data);
}
test();
