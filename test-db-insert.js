import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ufzlmzolnikxaqovufvi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmemxtem9sbmlreGFxb3Z1ZnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTU0MDAsImV4cCI6MjA5ODkzMTQwMH0.ENgXemEs7YLwjYm0Qq-A9Ek7JCS_Wnrm7fPsmldktZ8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: { user }, error: signUpError } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123'
  });
  
  if (signUpError) {
    console.log("Signup err:", signUpError);
    // Maybe try sign in
    const { data: { user: loginUser } } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
    });
    console.log("Login user:", loginUser?.id);
    if (loginUser) {
        const { error: insErr } = await supabase.from('journals').insert([{
            title: 'Test', content: 'test', author_id: loginUser.id, author_name: 'Test',
            unlock_date: null
        }]);
        console.log("Insert journal err:", insErr);
    }
  } else {
    console.log("Signed up:", user?.id);
    const { error: insErr } = await supabase.from('journals').insert([{
        title: 'Test', content: 'test', author_id: user.id, author_name: 'Test'
    }]);
    console.log("Insert journal err:", insErr);
  }
}
check();
