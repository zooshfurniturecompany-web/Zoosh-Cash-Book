import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AddEntryModal({ isOpen, onClose, activeAccounts, defaultDate, onSuccess, type = 'expense' }) {
  const [date, setDate] = useState(defaultDate);
  const [particulars, setParticulars] = useState('');
  const [amounts, setAmounts] = useState({}); // accountId -> string amount
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sync defaultDate when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      setParticulars('');
      setAmounts({});
      setRemarks('');
      setError('');
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleAmountChange = (accountId, value) => {
    setAmounts(prev => ({
      ...prev,
      [accountId]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!particulars.trim()) {
      setError('Particulars field is required.');
      return;
    }

    // Filter out accounts with empty or zero amounts
    const validDetails = [];
    for (const account of activeAccounts) {
      const valStr = amounts[account.id];
      if (valStr && valStr.trim() !== '') {
        const num = parseFloat(valStr);
        if (!isNaN(num) && num !== 0) {
          // For expenses, store as negative. For income, store as positive.
          const finalAmount = type === 'expense' ? -Math.abs(num) : Math.abs(num);
          validDetails.push({
            account_id: account.id,
            amount: finalAmount
          });
        }
      }
    }

    if (validDetails.length === 0) {
      setError('Please enter a non-zero amount for at least one account.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Insert cash book entry
      const { data: entryData, error: entryError } = await supabase
        .from('cash_book_entries')
        .insert([{
          transaction_date: date,
          particulars: particulars.trim(),
          remarks: remarks.trim() || null
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // 2. Insert entry details
      const detailsToInsert = validDetails.map(detail => ({
        cashbook_entry_id: entryData.id,
        account_id: detail.account_id,
        amount: detail.amount
      }));

      const { error: detailsError } = await supabase
        .from('cash_book_entry_details')
        .insert(detailsToInsert);

      if (detailsError) throw detailsError;

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white border border-gray-200 rounded shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            {type === 'expense' ? 'Add Expense Entry' : 'Add Client Payment (Income)'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              {type === 'expense' ? 'Particulars (Expense Description)' : 'Client Name / Particulars'}
            </label>
            <input
              type="text"
              required
              placeholder={type === 'expense' ? "e.g. Salary, Fuel, Food..." : "e.g. Canara Client Advance, Hamza Wood Payment..."}
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Amounts (Enter standard positive values)
            </label>
            <div className="border border-gray-100 rounded bg-gray-50 p-2 max-h-44 overflow-y-auto space-y-1.5">
              {activeAccounts.length === 0 ? (
                <p className="text-[11px] text-gray-400 p-2 text-center">No active accounts found. Create accounts first.</p>
              ) : (
                activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between py-1 px-2 bg-white rounded border border-gray-100 shadow-sm">
                    <span className="text-[11px] font-medium text-gray-700">{account.account_name}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amounts[account.id] || ''}
                      onChange={(e) => handleAmountChange(account.id, e.target.value)}
                      className="w-28 px-2 py-0.5 text-right border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white font-mono"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Remarks (Optional)</label>
            <textarea
              placeholder="Add details, payment method, bill no..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="2"
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || activeAccounts.length === 0}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
