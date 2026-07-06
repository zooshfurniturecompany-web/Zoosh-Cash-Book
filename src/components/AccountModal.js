import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AccountModal({ isOpen, onClose, account, onSuccess }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Bank');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!account;

  useEffect(() => {
    if (isOpen) {
      if (account) {
        setName(account.account_name || '');
        setType(account.account_type || 'Bank');
        setOpeningBalance(account.opening_balance?.toString() || '0.00');
        setIsActive(account.active ?? true);
      } else {
        setName('');
        setType('Bank');
        setOpeningBalance('0.00');
        setIsActive(true);
      }
      setError('');
    }
  }, [isOpen, account]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit) {
        // Edit Account
        const balanceNum = parseFloat(openingBalance);
        const { error: updateError } = await supabase
          .from('accounts')
          .update({
            account_name: name.trim(),
            account_type: type,
            opening_balance: isNaN(balanceNum) ? 0.00 : balanceNum,
            active: isActive
          })
          .eq('id', account.id);

        if (updateError) throw updateError;
      } else {
        // Create Account
        const balanceNum = parseFloat(openingBalance);
        const { error: insertError } = await supabase
          .from('accounts')
          .insert([{
            account_name: name.trim(),
            account_type: type,
            opening_balance: isNaN(balanceNum) ? 0.00 : balanceNum,
            active: true // default to active on creation
          }]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while saving the account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white border border-gray-200 rounded shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            {isEdit ? 'Edit Account' : 'Add New Account'}
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
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Name</label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Current, Petty Cash..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white"
            >
              <option value="Bank">Bank</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Opening Balance
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded text-xs text-gray-700 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white font-mono"
            />
          </div>

          {isEdit && (
            <div className="flex items-center space-x-2 py-1">
              <input
                type="checkbox"
                id="active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-gray-800 focus:ring-gray-400 h-4 w-4"
              />
              <label htmlFor="active" className="text-xs font-medium text-gray-700">
                Active Account (shows in daily ledger)
              </label>
            </div>
          )}

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
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
