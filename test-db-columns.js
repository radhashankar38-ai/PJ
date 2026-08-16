import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ufzlmzolnikxaqovufvi.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmemxtem9sbmlreGFxb3Z1ZnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNTU0MDAsImV4cCI6MjA5ODkzMTQwMH0.ENgXemEs7YLwjYm0Qq-A9Ek7JCS_Wnrm7fPsmldktZ8');
async function check() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log(data);
}
check();
