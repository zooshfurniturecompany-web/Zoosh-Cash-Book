import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:h-16 gap-3">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <img 
                src="/logo.jpg" 
                alt="ZOOSH Logo" 
                className="h-7 w-auto object-contain bg-black rounded shadow-sm hover:opacity-90 transition mr-2.5" 
              />
              <span className="text-sm font-bold text-gray-800 tracking-tight">Cash Book</span>
            </Link>
          </div>
          <nav className="flex space-x-5 sm:space-x-6">
            <Link href="/" className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition">
              Daily Ledger
            </Link>
            <Link href="/income" className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition">
              Income
            </Link>
            <Link href="/accounts" className="text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition">
              Manage Accounts
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
