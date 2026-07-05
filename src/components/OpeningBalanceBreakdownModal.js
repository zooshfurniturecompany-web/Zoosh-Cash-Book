import { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function OpeningBalanceBreakdownModal({ isOpen, onClose, account, currentDate }) {
  const [initialBalance, setInitialBalance] = useState(0);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calculatedBalance, setCalculatedBalance] = useState(0);

  useEffect(() => {
    const fetchBreakdown = async () => {
      if (!isOpen || !account || !currentDate) return;
      setIsLoading(true);
      setInitialBalance(account.opening_balance || 0);

      try {
        // Fetch all transactions for this account prior to currentDate
        const { data, error } = await supabase
          .from('cash_book_entry_details')
          .select(`
            amount,
            entry:cash_book_entries!inner(transaction_date, particulars, remarks)
          `)
          .eq('account_id', account.id)
          .lt('entry.transaction_date', currentDate);

        if (error) throw error;

        // Map and sort chronologically
        const mapped = (data || []).map(row => ({
          date: row.entry.transaction_date,
          particulars: row.entry.particulars,
          remarks: row.entry.remarks,
          amount: parseFloat(row.amount)
        })).sort((a, b) => a.date.localeCompare(b.date));

        setHistory(mapped);

        // Sum past transactions
        const historySum = mapped.reduce((sum, item) => sum + item.amount, 0);
        setCalculatedBalance((account.opening_balance || 0) + historySum);

      } catch (err) {
        console.error('Error fetching opening balance breakdown:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreakdown();
  }, [isOpen, account, currentDate]);

  if (!isOpen || !account) return null;

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white border border-gray-200 rounded shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Opening Balance Breakdown</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Account: <span className="font-semibold text-gray-600">{account.account_name}</span> | Date: {formatDateDMY(currentDate)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {/* Summary Math Block */}
          <div className="grid grid-cols-3 gap-2 text-center border border-gray-100 rounded p-3 bg-gray-50/50">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Initial Balance</p>
              <p className="text-xs font-semibold text-gray-800 font-mono mt-0.5">
                ₹{initialBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Past Net Changes</p>
              <p className={`text-xs font-semibold font-mono mt-0.5 ${
                calculatedBalance - initialBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {calculatedBalance - initialBalance >= 0 ? '+' : ''}
                {(calculatedBalance - initialBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="border-l border-gray-200">
              <p className="text-[9px] font-bold text-gray-500 uppercase">Opening Balance</p>
              <p className="text-xs font-extrabold text-gray-900 font-mono mt-0.5">
                ₹{calculatedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Detailed Transaction List */}
          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Past Transactions (Ledger History)</h4>
            
            {isLoading ? (
              <p className="text-center text-xs text-gray-400 py-6">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6 border border-dashed border-gray-100 rounded italic">
                No past transactions recorded before this day. The balance is equal to the account's initial opening balance.
              </p>
            ) : (
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 text-[9px] uppercase">
                      <th className="px-3 py-1.5 w-24">Date</th>
                      <th className="px-3 py-1.5">Description</th>
                      <th className="px-3 py-1.5 text-right w-28">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {history.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition">
                        <td className="px-3 py-1.5 font-mono text-gray-400">{formatDateDMY(item.date)}</td>
                        <td className="px-3 py-1.5">
                          <div className="font-medium text-gray-800">{item.particulars}</div>
                          {item.remarks && <div className="text-[9px] text-gray-400">{item.remarks}</div>}
                        </td>
                        <td className={`px-3 py-1.5 text-right font-mono font-semibold ${
                          item.amount > 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          <span className="inline-flex items-center">
                            {item.amount > 0 ? (
                              <ArrowUpRight className="w-3 h-3 mr-0.5 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 mr-0.5 text-red-500" />
                            )}
                            ₹{Math.abs(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
