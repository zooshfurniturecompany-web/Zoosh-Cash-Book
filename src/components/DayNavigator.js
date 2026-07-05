import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function DayNavigator({ currentDate, onChangeDate }) {
  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    // Use split to avoid timezone shifting issues with Date constructor
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePrevDay = () => {
    const [year, month, day] = currentDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    onChangeDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const [year, month, day] = currentDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    onChangeDate(`${yyyy}-${mm}-${dd}`);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-5 bg-white border border-gray-200 rounded-lg notebook-shadow no-print">
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition cursor-pointer"
          title="Previous Day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="relative flex items-center">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => {
              if (e.target.value) {
                onChangeDate(e.target.value);
              }
            }}
            className="block w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
          />
          <Calendar className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
        </div>

        <button
          onClick={handleNextDay}
          className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition cursor-pointer"
          title="Next Day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center sm:text-right">
        <h2 className="text-base font-bold text-gray-800 tracking-tight">
          {formatDateDisplay(currentDate)}
        </h2>
        <p className="text-xs text-gray-400">Working Hours: 9:00 AM - 6:00 PM</p>
      </div>
    </div>
  );
}
