const { createClient } = require('@supabase/supabase-js');

// Load env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined in the environment.');
  process.exit(1);
}

console.log('Attempting to connect to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    const { data, error } = await supabase.from('accounts').select('*').limit(1);
    
    if (error) {
      console.error('Connection query failed:', error.message);
      console.error('Make sure you have run the schema migration in the Supabase SQL editor.');
      process.exit(1);
    }
    
    console.log('Connection Successful!');
    console.log('Fetched accounts successfully. Count:', data.length);
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error connecting to Supabase:', err.message);
    process.exit(1);
  }
}

test();
