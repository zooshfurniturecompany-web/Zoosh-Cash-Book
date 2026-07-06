'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import DayNavigator from '@/components/DayNavigator';
import AddEntryModal from '@/components/AddEntryModal';
import EditEntryModal from '@/components/EditEntryModal';
import OpeningBalanceBreakdownModal from '@/components/OpeningBalanceBreakdownModal';
import { supabase } from '@/lib/supabase';
import { Plus, Printer, Search, RefreshCw, Lock, LockOpen } from 'lucide-react';
import Link from 'next/link';

export default function CashBookPage() {
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
  const [dayState, setDayState] = useState({ is_closed: false });
  const [openingBalances, setOpeningBalances] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Add popup states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState('expense'); // 'expense' or 'income'
  
  // Edit popup states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Opening Balance Breakdown states
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [selectedBreakdownAccount, setSelectedBreakdownAccount] = useState(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active accounts
      const { data: activeAccData, error: activeAccError } = await supabase
        .from('accounts')
        .select('*')
        .eq('active', true);
      
      if (activeAccError) throw activeAccError;
      const activeAccs = activeAccData || [];
      setActiveAccounts(activeAccs);

      // 2. Fetch day state (closed/open status)
      const { data: dayStateData } = await supabase
        .from('day_states')
        .select('*')
        .eq('date', currentDate)
        .maybeSingle();

      setDayState(dayStateData || { is_closed: false });

      // 3. Fetch opening balances for ALL accounts at currentDate (using fixed RPC)
      const { data: obData, error: obError } = await supabase
        .rpc('get_opening_balances', { p_date: currentDate });

      if (obError) throw obError;
      
      const obMap = {};
      obData?.forEach(row => {
        obMap[row.account_id] = parseFloat(row.total_balance);
      });
      setOpeningBalances(obMap);

      // 4. Fetch all entries for currentDate (both incomes and expenses)
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
      const dayEntries = (entriesData || []).filter(entry => entry.details && entry.details.length > 0);
      setEntries(dayEntries);

      // 5. Determine displayed accounts for the day
      const displayedMap = {};
      activeAccs.forEach(acc => {
        displayedMap[acc.id] = acc;
      });

      dayEntries.forEach(entry => {
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
      console.error('Error fetching cash book data:', err);
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
      const validResults = (data || []).filter(entry => entry.details && entry.details.length > 0);
      setSearchResults(validResults);
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

  const handleToggleCloseDay = async () => {
    const nextStatus = !dayState.is_closed;
    try {
      const { error } = await supabase
        .from('day_states')
        .upsert({
          date: currentDate,
          is_closed: nextStatus,
          closed_at: nextStatus ? new Date().toISOString() : null
        });

      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update day state: ' + err.message);
    }
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
    if (dayState.is_closed) {
      alert('This day is closed. Reopen the day to edit or delete entries.');
      return;
    }
    setSelectedEntry(entry);
    setIsEditOpen(true);
  };

  const handleOpeningBalanceCellClick = (account) => {
    setSelectedBreakdownAccount(account);
    setIsBreakdownOpen(true);
  };

  const jumpToDateFromSearch = (dateStr) => {
    setCurrentDate(dateStr);
    setSearchTerm('');
    setIsSearching(false);
  };

  const triggerAddModal = (type) => {
    setAddType(type);
    setIsAddOpen(true);
  };

  // --- Calculate Account Income & Expense for today ---
  const accountTotals = {};
  displayedAccounts.forEach(acc => {
    accountTotals[acc.id] = { income: 0, expense: 0 };
  });

  entries.forEach(entry => {
    entry.details?.forEach(detail => {
      const accId = detail.account_id;
      if (accountTotals[accId]) {
        if (detail.amount > 0) {
          accountTotals[accId].income += detail.amount;
        } else if (detail.amount < 0) {
          accountTotals[accId].expense += Math.abs(detail.amount); // store as positive
        }
      }
    });
  });

  // --- Grand Totals ---
  let grandTotalOpening = 0;
  let grandTotalIncome = 0;
  let grandTotalExpense = 0;
  let grandTotalClosing = 0;

  displayedAccounts.forEach(acc => {
    const ob = openingBalances[acc.id] || 0;
    const inc = accountTotals[acc.id]?.income || 0;
    const exp = accountTotals[acc.id]?.expense || 0;
    const cb = ob + inc - exp;

    grandTotalOpening += ob;
    grandTotalIncome += inc;
    grandTotalExpense += exp;
    grandTotalClosing += cb;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      <Header />

      {/* Print View Header */}
      <div className="hidden print:flex flex-col items-center py-6 border-b border-gray-400">
        <img src="/logo.jpg" alt="ZOOSH Logo" className="h-10 w-auto object-contain mb-2 bg-black rounded" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">Daily Cash Book Ledger</h2>
        <p className="text-xs text-gray-500 mt-2 font-mono">Date: {formatDateDMY(currentDate)}</p>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        <div className="no-print space-y-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="hidden sm:flex items-center space-x-3.5">
              <img src="/logo.jpg" alt="ZOOSH Logo" className="h-10 w-auto object-contain bg-black rounded shadow-sm" />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-gray-800">Cash Book</h1>
                <p className="text-xs text-gray-500">Maintain daily financial ledger records.</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full md:w-auto gap-2">
              <form onSubmit={handleSearch} className="flex items-center flex-1 md:flex-none">
                <div className="relative flex-1 md:flex-none">
                  <input
                    type="text"
                    placeholder="Search by particulars or date..."
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
                <span>Print Ledger</span>
              </button>

              <button
                onClick={handleRefresh}
                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded shadow-sm cursor-pointer"
                title="Refresh Ledger"
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
            Loading ledger book data...
          </div>
        ) : isSearching ? (
          /* Search Results View */
          <div className="bg-white border border-gray-200 rounded notebook-shadow overflow-hidden p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
              Search Results for: "{searchTerm}" ({searchResults.length} entries found)
            </h3>
            
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No entries found matching your query.</p>
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
                              <span className={`font-mono font-bold ${detail.amount > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                ₹{Math.abs(detail.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
          /* Main Cash Book Ledger Sheet (Notebook Look) */
          <div className="space-y-4">
            {/* Net Balances Grid */}
            <div className="grid grid-cols-2 gap-3 no-print">
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 notebook-shadow flex flex-col justify-center">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Opening Balance</span>
                <h2 className="text-sm min-[375px]:text-base sm:text-2xl font-black text-gray-900 font-mono mt-0.5 break-all">
                  ₹{grandTotalOpening.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 notebook-shadow flex flex-col justify-center text-right">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400">Net Closing Balance</span>
                <h2 className="text-sm min-[375px]:text-base sm:text-2xl font-black text-emerald-700 font-mono mt-0.5 break-all">
                  ₹{grandTotalClosing.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            <div className="print-container bg-white border border-gray-200 rounded notebook-shadow overflow-hidden">
            
            {/* Status & Actions Header */}
            <div className="no-print p-3 sm:p-4 border-b border-gray-200 bg-gray-50/80 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              
              {/* Left side: Status and Close Day Toggle */}
              <div className="flex items-center justify-between sm:justify-start sm:space-x-3">
                <div className="flex items-center">
                  {dayState.is_closed ? (
                    <span className="flex items-center text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                      <Lock className="w-3 h-3 mr-1" /> Ledger Closed
                    </span>
                  ) : (
                    <span className="flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
                      <LockOpen className="w-3 h-3 mr-1" /> Ledger Open
                    </span>
                  )}
                </div>
                
                <button
                  onClick={handleToggleCloseDay}
                  className={`flex items-center space-x-1 px-2.5 py-1 border rounded text-[10px] font-semibold transition cursor-pointer shadow-sm ${
                    dayState.is_closed
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  {dayState.is_closed ? 'Reopen Day' : 'Close Day'}
                </button>
              </div>

              {/* Right side: Add Expense / Add Income buttons */}
              {!dayState.is_closed && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-2">
                  <button
                    onClick={() => triggerAddModal('expense')}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded text-xs font-semibold shadow-sm transition cursor-pointer w-full sm:w-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense</span>
                  </button>
                  <button
                    onClick={() => triggerAddModal('income')}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shadow-sm transition cursor-pointer w-full sm:w-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Income</span>
                  </button>
                </div>
              )}
            </div>

            {displayedAccounts.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-400">
                No accounts available. Please{' '}
                <Link href="/accounts" className="text-gray-800 underline font-semibold">
                  create bank or cash accounts
                </Link>{' '}
                to display the ledger columns.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 font-bold uppercase border-b border-gray-200 text-[10px] tracking-wider">
                      <th className="px-4 py-2.5 font-semibold min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">Date</th>
                      <th className="px-4 py-2.5 font-semibold min-w-[150px] sticky-col-2">Particulars</th>
                      <th className="px-4 py-2.5 font-semibold">Remarks</th>
                      
                      {/* Dynamic Columns */}
                      {displayedAccounts.map((account) => (
                        <th key={account.id} className="px-4 py-2.5 text-right font-semibold w-40 border-l border-gray-200">
                          {account.account_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-700">
                    
                    {/* 1. Opening Balance Row (Click cell to view breakdown) */}
                    <tr className="bg-gray-100 text-[11px] font-bold border-b-2 border-gray-300 text-gray-950">
                      <td className="px-4 py-2 font-mono text-gray-500 min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">{formatDateDMY(currentDate)}</td>
                      <td className="px-4 py-2 uppercase tracking-wide min-w-[150px] sticky-col-2">Opening Balance</td>
                      <td className="px-4 py-2 text-gray-400 italic">-</td>
                      
                      {displayedAccounts.map((account) => {
                        const ob = openingBalances[account.id] || 0;
                        return (
                          <td 
                            key={account.id} 
                            onClick={() => handleOpeningBalanceCellClick(account)}
                            className="px-4 py-2 text-right font-mono border-l border-gray-200 cursor-pointer hover:bg-gray-200 transition"
                            title="Click to view opening balance details"
                          >
                            {ob.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 2. Daily Transactions Rows (Mixed Incomes and Expenses) */}
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={3 + displayedAccounts.length} className="px-4 py-8 text-center text-gray-400 italic">
                          No transactions entered for today. Click "+ Add Expense" or "+ Add Income" to record.
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
                          <td className="px-4 py-2 text-gray-400 text-[11px]">
                            {entry.remarks || '-'}
                          </td>
                          
                          {displayedAccounts.map((account) => {
                            const detail = entry.details?.find(d => d.account_id === account.id);
                            return (
                              <td key={account.id} className="px-4 py-2 text-right font-mono border-l border-gray-200">
                                {detail ? (
                                  <span className={detail.amount > 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                                    {detail.amount > 0 ? '' : '-'}
                                    {Math.abs(detail.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : (
                                  <span className="text-gray-200">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}

                    {/* 3. Total Income Row */}
                    <tr className="bg-gray-50/20 text-[11px] font-semibold border-t-2 border-gray-300">
                      <td className="px-4 py-2 text-gray-400 font-mono min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">-</td>
                      <td className="px-4 py-2 text-emerald-800 font-bold uppercase min-w-[150px] sticky-col-2">Total Income</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                      
                      {displayedAccounts.map((account) => {
                        const inc = accountTotals[account.id]?.income || 0;
                        return (
                          <td key={account.id} className="px-4 py-2 text-right font-mono text-emerald-700 font-bold border-l border-gray-200">
                            {inc > 0 ? inc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 4. Total Expense Row */}
                    <tr className="bg-gray-50/20 text-[11px] font-semibold">
                      <td className="px-4 py-2 text-gray-400 font-mono min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">-</td>
                      <td className="px-4 py-2 text-red-800 font-bold uppercase min-w-[150px] sticky-col-2">Total Expense</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                      
                      {displayedAccounts.map((account) => {
                        const exp = accountTotals[account.id]?.expense || 0;
                        return (
                          <td key={account.id} className="px-4 py-2 text-right font-mono text-red-700 font-bold border-l border-gray-200">
                            {exp > 0 ? exp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* 5. Closing Balance Row */}
                    <tr className="bg-gray-100 text-[11px] font-bold border-t-2 border-gray-300 border-b-4 border-double border-gray-900 text-gray-950">
                      <td className="px-4 py-2 font-mono text-gray-500 min-w-[80px] w-[80px] max-w-[80px] sticky-col-1">{formatDateDMY(currentDate)}</td>
                      <td className="px-4 py-2 uppercase min-w-[150px] sticky-col-2">Closing Balance</td>
                      <td className="px-4 py-2 text-gray-400 font-normal italic">-</td>
                      
                      {displayedAccounts.map((account) => {
                        const ob = openingBalances[account.id] || 0;
                        const inc = accountTotals[account.id]?.income || 0;
                        const exp = accountTotals[account.id]?.expense || 0;
                        const cb = ob + inc - exp;
                        return (
                          <td key={account.id} className="px-4 py-2 text-right font-mono border-l border-gray-200 font-black">
                            {cb.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        );
                      })}
                    </tr>

                  </tbody>
                </table>
              </div>
            )}

            {/* Grand Totals Summary Row */}
            {displayedAccounts.length > 0 && (
              <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-wrap justify-between items-center gap-4 text-xs font-semibold">
                <div className="text-gray-500 font-normal">
                  Grand Totals for <span className="font-bold text-gray-800">{formatDateDMY(currentDate)}</span> (Across all accounts)
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex space-x-2">
                    <span className="text-gray-500">Net Opening Balance:</span>
                    <span className="font-mono text-gray-900 font-bold">
                      ₹{grandTotalOpening.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-gray-500">Total Income:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      ₹{grandTotalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-gray-500">Total Expense:</span>
                    <span className="font-mono text-red-700 font-bold">
                      ₹{grandTotalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex space-x-2 border-l border-gray-300 pl-4">
                    <span className="text-gray-700">Net Closing Balance:</span>
                    <span className="font-mono text-gray-900 font-extrabold">
                      ₹{grandTotalClosing.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
          </div>
        )}

      </main>

      {/* Popups */}
      <AddEntryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        activeAccounts={activeAccounts}
        defaultDate={currentDate}
        onSuccess={handleRefresh}
        type={addType}
      />

      <EditEntryModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        activeAccounts={displayedAccounts}
        entry={selectedEntry}
        onSuccess={handleRefresh}
      />

      <OpeningBalanceBreakdownModal
        isOpen={isBreakdownOpen}
        onClose={() => {
          setIsBreakdownOpen(false);
          setSelectedBreakdownAccount(null);
        }}
        account={selectedBreakdownAccount}
        currentDate={currentDate}
      />
    </div>
  );
}
