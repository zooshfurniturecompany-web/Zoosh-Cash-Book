const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
  try {
    const { data: accounts } = await supabase.from('accounts').select('*');
    console.log('--- ACCOUNTS ---');
    console.log(accounts);

    const { data: entries } = await supabase
      .from('cash_book_entries')
      .select(`
        id,
        transaction_date,
        particulars,
        remarks,
        details:cash_book_entry_details(
          account_id,
          amount
        )
      `)
      .order('transaction_date', { ascending: true });
    
    console.log('\n--- ENTRIES & DETAILS ---');
    console.log(JSON.stringify(entries, null, 2));

    // Call opening balances for 2026-07-06
    const { data: obData } = await supabase.rpc('get_opening_balances', { p_date: '2026-07-06' });
    console.log('\n--- RPC get_opening_balances(\'2026-07-06\') ---');
    console.log(obData);

  } catch (err) {
    console.error(err);
  }
}

debug();
