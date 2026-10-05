import React, { useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';

export const DateRangeSelector = ({
  activeRange = '30d',
  startDate = '',
  endDate = '',
  onChangeRange
}) => {
  const [selectedRange, setSelectedRange] = useState(activeRange);
  const [customStart, setCustomStart] = useState(startDate || '');
  const [customEnd, setCustomEnd] = useState(endDate || '');
  const [dateError, setDateError] = useState('');

  const handleDropdownChange = (e) => {
    const newRange = e.target.value;
    setSelectedRange(newRange);
    setDateError('');

    if (newRange !== 'custom') {
      onChangeRange({ range: newRange, startDate: null, endDate: null });
    } else {
      // If start and end already exist, apply them if valid
      if (customStart && customEnd) {
        if (customEnd < customStart) {
          setDateError('End Date cannot be before Start Date.');
        } else {
          onChangeRange({ range: 'custom', startDate: customStart, endDate: customEnd });
        }
      }
    }
  };

  const handleCustomApply = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) {
      setDateError('Please provide both Start Date and End Date.');
      return;
    }
    if (customEnd < customStart) {
      setDateError('End Date cannot be before Start Date.');
      return;
    }
    setDateError('');
    onChangeRange({ range: 'custom', startDate: customStart, endDate: customEnd });
  };

  const isInvalid = customStart && customEnd && customEnd < customStart;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
      {/* Dropdown Select Control */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
        <Calendar className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
        <span className="text-slate-400 font-medium">Period:</span>
        <select
          value={selectedRange}
          onChange={handleDropdownChange}
          className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer pr-2"
        >
          <option value="today" className="bg-slate-900 text-slate-200">Today</option>
          <option value="7d" className="bg-slate-900 text-slate-200">Last 7 Days</option>
          <option value="30d" className="bg-slate-900 text-slate-200">Last 30 Days</option>
          <option value="90d" className="bg-slate-900 text-slate-200">Last 90 Days</option>
          <option value="ytd" className="bg-slate-900 text-slate-200">Year to Date</option>
          <option value="custom" className="bg-slate-900 text-slate-200">Custom Range</option>
        </select>
      </div>

      {/* Custom Date Inputs Displayed When 'Custom Range' Selected */}
      {selectedRange === 'custom' && (
        <div className="flex flex-col gap-1">
          <form
            onSubmit={handleCustomApply}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Start:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  if (customEnd && e.target.value > customEnd) {
                    setDateError('End Date cannot be before Start Date.');
                  } else {
                    setDateError('');
                  }
                }}
                className="bg-slate-950 border border-slate-800 text-slate-200 px-2 py-0.5 rounded text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <span className="text-slate-500">—</span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">End:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  if (customStart && e.target.value < customStart) {
                    setDateError('End Date cannot be before Start Date.');
                  } else {
                    setDateError('');
                  }
                }}
                className="bg-slate-950 border border-slate-800 text-slate-200 px-2 py-0.5 rounded text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isInvalid || !customStart || !customEnd}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold transition text-[11px]"
            >
              Apply
            </button>
          </form>

          {dateError && (
            <p className="text-[10px] text-rose-400 flex items-center gap-1 px-1">
              <AlertCircle className="h-3 w-3" />
              {dateError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DateRangeSelector;
