const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  let sb = fs.readFileSync('src/supabase.ts', 'utf8');
  let urlMatch = sb.match(/const supabaseUrl = '([^']+)'/);
  let keyMatch = sb.match(/const supabaseAnonKey = '([^']+)'/);
  
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  // Create a random user and sign in
  const email = 'test' + Date.now() + '@example.com';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  if (authErr) {
    console.error("Auth err", authErr);
    return;
  }
  
  const userId = authData.user.id;
  
  await supabase.from('users').insert({
    id: userId,
    username: 'testuser' + Date.now(),
    full_name: 'Test User'
  });
  
  const { data: msg, error: insErr } = await supabase.from('messages').insert({
    sender_id: userId,
    sender_name: 'Test User',
    text: JSON.stringify({text: 'hello', type: 'dm'})
  }).select('*').single();
  
  console.log("Insert err", insErr, "msg", msg);
  
  if (msg) {
    const { error: delErr } = await supabase.from('messages').delete().eq('id', msg.id);
    console.log("Delete error", delErr);
    
    const { error: upErr } = await supabase.from('messages').update({ text: 'updated' }).eq('id', msg.id);
    console.log("Update error", upErr);
  }
}
run();
