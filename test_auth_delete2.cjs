const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ufzlmzolnikxaqovufvi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmemxtem9sbmlreGFxb3Z1ZnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTU0MDAsImV4cCI6MjA5ODkzMTQwMH0.ENgXemEs7YLwjYm0Qq-A9Ek7JCS_Wnrm7fPsmldktZ8';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
async function run() {
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
  console.log("Insert err", insErr);
  if (msg) {
    const { error: delErr } = await supabase.from('messages').delete().eq('id', msg.id);
    console.log("Delete error", delErr);
    const { error: upErr } = await supabase.from('messages').update({ text: 'updated' }).eq('id', msg.id);
    console.log("Update error", upErr);
  }
}
run();
