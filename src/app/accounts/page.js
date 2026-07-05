'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AccountModal from '@/components/AccountModal';
import { supabase } from '@/lib/supabase';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [error, setError] = useState('');

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        .from('accounts')
        .select('*')
        .order('account_name', { ascending: true });

      if (fetchError) throw fetchError;
      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Could not load accounts. Please make sure the Supabase database migrations have been executed in your SQL editor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const handleEditAccount = (account) => {
    setSelectedAccount(account);
    setIsModalOpen(true);
  };

  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the account "${name}"? This will delete all cash book entries associated with it.`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete account: ' + err.message);
    }
  };

  const handleToggleActive = async (account) => {
    try {
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ active: !account.active })
        .eq('id', account.id);

      if (updateError) throw updateError;
      fetchAccounts();
    } catch (err) {
      console.error(err);
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Account Management</h1>
            <p className="text-xs text-gray-500 mt-1">
              Add and manage bank or cash accounts. Active accounts appear as columns in the cash book.
            </p>
          </div>
          <button
            onClick={handleAddAccount}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-gray-900 transition shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs rounded border border-red-100 shadow-sm">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded notebook-shadow overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No accounts found. Click "Add Account" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                    <th className="px-4 py-3 font-semibold">Account Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 text-right font-semibold">Opening Balance</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50/40 transition">
                      <td className="px-4 py-3 font-semibold text-gray-800">{account.account_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          account.account_type === 'Bank' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {account.account_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        ₹{parseFloat(account.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(account)}
                          className="inline-flex items-center focus:outline-none cursor-pointer"
                        >
                          {account.active ? (
                            <span className="flex items-center text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold text-[10px] uppercase">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-bold text-[10px] uppercase">
                              <XCircle className="w-3 h-3 mr-1" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="inline-flex items-center p-1 bg-gray-50 border border-gray-200 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
                          title="Edit Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.account_name)}
                          className="inline-flex items-center p-1 bg-red-50 border border-red-100 rounded text-red-600 hover:text-red-700 hover:bg-red-100 transition cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        account={selectedAccount}
        onSuccess={fetchAccounts}
      />
    </div>
  );
}
