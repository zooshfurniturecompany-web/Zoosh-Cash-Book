'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DayNavigator from '@/components/DayNavigator';
import AddEntryModal from '@/components/AddEntryModal';
import EditEntryModal from '@/components/EditEntryModal';
import { supabase } from '@/lib/supabase';
import { Plus, Printer, Search, RefreshCw } from 'lucide-react';

export default function IncomePage() {
  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [currentDate, setCurrentDate] = useState(getTodayStr());
  const [activeAccounts, setActiveAccounts] = useState([]);
  const [displayedAccounts, setDisplayedAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active accounts
      const { data: activeAccData } = await supabase
        .from('accounts')
        .select('*')
        .eq('active', true);
      
      const activeAccs = activeAccData || [];
      setActiveAccounts(activeAccs);

      // 2. Fetch income entries for currentDate (amount > 0)
      const { data: entriesData, error: entriesError } = await supabase
        .from('cash_book_entries')
        .select(`
          id,
          transaction_date,
          particulars,
          remarks,
          created_at,
          details:cash_book_entry_details(
            account_id,
            amount,
            account:accounts(*)
          )
        `)
        .eq('transaction_date', currentDate)
        .order('created_at', { ascending: true });

      if (entriesError) throw entriesError;
      
      // Filter only income entries
      const dayIncomes = (entriesData || []).filter(entry => 
        entry.details?.some(d => d.amount > 0)
      );
      setEntries(dayIncomes);

      // 3. Determine displayed accounts
      const displayedMap = {};
      activeAccs.forEach(acc => {
        displayedMap[acc.id] = acc;
      });

      dayIncomes.forEach(entry => {
        entry.details?.forEach(detail => {
          if (detail.account && !displayedMap[detail.account_id]) {
            displayedMap[detail.account_id] = detail.account;
          }
        });
      });

      const sortedDisplayed = Object.values(displayedMap).sort((a, b) => 
        a.account_name.localeCompare(b.account_name)
      );
      setDisplayedAccounts(sortedDisplayed);

    } catch (err) {
      console.error('Error fetching income data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setIsSearching(false);
      fetchData();
      return;
    }

    setIsLoading(true);
    setIsSearching(true);

    try {
      const isDate = /^\d{4}-\d{2}-\d{2}$/.test(searchTerm.trim());
      
      let query = supabase
        .from('cash_book_entries')
        .select(`
          id,
          transaction_date,
          particulars,
          remarks,
          details:cash_book_entry_details(
            account_id,
            amount,
            account:accounts(*)
          )
        `);

      if (isDate) {
        query = query.eq('transaction_date', searchTerm.trim());
      } else {
        query = query.ilike('particulars', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query.order('transaction_date', { ascending: false }).limit(100);
      if (error) throw error;

      // Filter only entries that are incomes
      const filteredIncomes = (data || []).filter(entry => 
        entry.details?.some(d => d.amount > 0)
      );
      setSearchResults(filteredIncomes);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isSearching) {
      fetchData();
    }
  }, [currentDate, isSearching]);

  const handleRefresh = () => {
    fetchData();
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
    setIsEditOpen(true);
  };

  const jumpToDateFromSearch = (dateStr) => {
    setCurrentDate(dateStr);
    setSearchTerm('');
    setIsSearching(false);
  };

  // Calculate totals
  const accountTotals = {};
  displayedAccounts.forEach(acc => {
    accountTotals[acc.id] = 0;
  });

  entries.forEach(entry => {
    entry.details?.forEach(detail => {
      const accId = detail.account_id;
      if (accountTotals[accId] !== undefined && detail.amount > 0) {
        accountTotals[accId] += detail.amount;
      }
    });
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <Header />

      {/* Print View Header */}
      <div className="hidden print:flex flex-col items-center py-6 border-b border-gray-400">
        <img src="/logo.jpg" alt="ZOOSH Logo" className="h-10 w-auto object-contain mb-2 bg-black rounded" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">Daily Income Ledger</h2>
        <p className="text-xs text-gray-500 mt-2 font-mono">Date: {formatDateDMY(currentDate)}</p>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Controls Panel */}
        <div className="no-print space-y-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="hidden sm:flex items-center space-x-3.5">
              <img src="/logo.jpg" alt="ZOOSH Logo" className="h-10 w-auto object-contain bg-black rounded shadow-sm" />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-gray-800">Income Register</h1>
                <p className="text-xs text-gray-500">Manage income receipts and client payments.</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full md:w-auto gap-2">
              <form onSubmit={handleSearch} className="flex items-center flex-1 md:flex-none">
                <div className="relative flex-1 md:flex-none">
                  <input
                    type="text"
                    placeholder="Search income particulars..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs text-gray-700 bg-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 w-full md:w-64"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  className="ml-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                >
                  Search
                </button>
                {isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsSearching(false);
                    }}
                    className="ml-1 px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </form>

              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-semibold transition shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Income</span>
              </button>

              <button
                onClick={handleRefresh}
                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded shadow-sm cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isSearching && (
            <DayNavigator currentDate={currentDate} onChangeDate={setCurrentDate} />
          )}
        </div>

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="py-20 text-center text-xs text-gray-400 bg-white border border-gray-200 rounded shadow-sm">
            Loading incomes...
          </div>
        ) : isSearching ? (
          /* Search Results View */
          <div className="bg-white border border-gray-200 rounded notebook-shadow overflow-hidden p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
              Search Results: "{searchTerm}" ({searchResults.length} entries found)
            </h3>
            
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No income entries found matching your query.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Particulars</th>
                      <th className="px-4 py-3">Remarks</th>
                      <th className="px-4 py-3">Account & Amount</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {searchResults.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50/40 transition">
                        <td className="px-4 py-3 font-mono font-semibold">{formatDateDMY(entry.transaction_date)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{entry.particulars}</td>
                        <td className="px-4 py-3 text-gray-500">{entry.remarks || '-'}</td>
                        <td className="px-4 py-3 space-y-1">
                          {entry.details?.map((detail) => (
                            <div key={detail.account_id} className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-600">{detail.account?.account_name}:</span>
                              <span className="font-mono font-bold text-emerald-600">
                                ₹{detail.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => jumpToDateFromSearch(entry.transaction_date)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded text-gray-700 font-semibold text-[10px] transition cursor-pointer"
                          >
                            Go To Ledger Page
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Income List */
          <div className="print-container bg-white border border-gray-200 rounded notebook-shadow overflow-hidden">
            
            <div className="no-print flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/80">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Income Received Today</span>
              
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-sm transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Income</span>
              </button>
            </div>

            {displayedAccounts.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-400">
                No accounts available. Create accounts first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200 text-[10px] tracking-wider">
                      <th className="px-4 py-2.5 font-semibold min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">Date</th>
                      <th className="px-4 py-2.5 font-semibold min-w-[150px] sticky-col-2">Particulars</th>
                      <th className="px-4 py-2.5 font-semibold">Remarks</th>
                      
                      {displayedAccounts.map((account) => (
                        <th key={account.id} className="px-4 py-2.5 text-right font-semibold w-40 border-l border-gray-200">
                          {account.account_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={3 + displayedAccounts.length} className="px-4 py-8 text-center text-gray-400 italic">
                          No incomes recorded for this day. Click "+ Add Income" to add.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr
                          key={entry.id}
                          onClick={() => handleRowClick(entry)}
                          className="hover:bg-gray-50/50 transition cursor-pointer group"
                        >
                          <td className="px-4 py-2 font-mono text-gray-500 min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">{formatDateDMY(entry.transaction_date)}</td>
                          <td className="px-4 py-2 font-medium text-gray-900 group-hover:text-gray-800 min-w-[150px] sticky-col-2">
                            {entry.particulars}
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-[11px]">{entry.remarks || '-'}</td>
                          
                          {displayedAccounts.map((account) => {
                            const detail = entry.details?.find(d => d.account_id === account.id);
                            return (
                              <td key={account.id} className="px-4 py-2 text-right font-mono border-l border-gray-200 text-emerald-700 font-medium">
                                {detail ? (
                                  detail.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                ) : (
                                  <span className="text-gray-200">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                    
                    {/* Total Income Row */}
                    <tr className="bg-gray-100 text-[11px] font-bold text-gray-950 border-t-2 border-gray-300">
                      <td className="px-4 py-2 text-gray-400 font-mono min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">-</td>
                      <td className="px-4 py-2 uppercase min-w-[150px] sticky-col-2">Total Income</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                      
                      {displayedAccounts.map((account) => {
                        const inc = accountTotals[account.id] || 0;
                        return (
                          <td key={account.id} className="px-4 py-2 text-right font-mono text-emerald-700 border-l border-gray-200 font-black">
                            {inc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      <AddEntryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        activeAccounts={activeAccounts}
        defaultDate={currentDate}
        onSuccess={handleRefresh}
        type="income"
      />

      <EditEntryModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        activeAccounts={displayedAccounts}
        entry={selectedEntry}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
