const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xppyxhzhkalwuzbczdrt.supabase.co';
const supabaseKey = 'sb_publishable_TqkZX3FE8FYj8CW1ois_Tw_THRztWn_'; // public key, let's see if we can read table

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Fetched profiles:');
  profiles.forEach(p => {
    console.log({
      id: p.id,
      user_id: p.user_id,
      full_name: p.full_name,
      planning: p.global_planning,
      memory: p.global_memory,
      visual: p.global_visual,
      focus: p.global_focus,
      speed: p.global_speed,
      emotion: p.global_emotion,
      created_at: p.created_at
    });
  });
}

main();
