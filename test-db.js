import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ufzlmzolnikxaqovufvi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmemxtem9sbmlreGFxb3Z1ZnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTU0MDAsImV4cCI6MjA5ODkzMTQwMH0.ENgXemEs7YLwjYm0Qq-A9Ek7JCS_Wnrm7fPsmldktZ8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { error: errBio } = await supabase.from('users').select('bio').limit(0);
  console.log("has bio:", !errBio);
  const { error: errWeb } = await supabase.from('users').select('website').limit(0);
  console.log("has website:", !errWeb);
}
check();
