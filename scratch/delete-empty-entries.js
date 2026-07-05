const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanData() {
  try {
    // Delete the transaction with ID "003cf357-614f-4c01-9a45-7269c5efea3c" (Advance)
    const { data, error } = await supabase
      .from('cash_book_entries')
      .delete()
      .eq('id', '003cf357-614f-4c01-9a45-7269c5efea3c');

    if (error) throw error;
    console.log('Successfully deleted the empty "Advance" transaction from the database!');
    process.exit(0);
  } catch (err) {
    console.error('Error deleting entry:', err.message);
    process.exit(1);
  }
}

cleanData();
