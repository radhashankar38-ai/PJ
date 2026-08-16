import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ufzlmzolnikxaqovufvi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmemxtem9sbmlreGFxb3Z1ZnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTU0MDAsImV4cCI6MjA5ODkzMTQwMH0.ENgXemEs7YLwjYm0Qq-A9Ek7JCS_Wnrm7fPsmldktZ8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: { user } } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123'
    });
    
  if (user) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id);
    console.log("Select user:", { data, error });
  }
}
check();
