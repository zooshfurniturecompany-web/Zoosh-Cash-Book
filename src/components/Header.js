import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:h-16 gap-3">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-800 tracking-tight">Zoosh Furniture</span>
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded">Cash Book</span>
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
