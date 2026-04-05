import { useState } from 'react';
import { Search, Calendar, User, Zap, Filter, X } from 'lucide-react';

const SERVICES = [
  'ec2', 'iam', 's3', 'lambda', 'rds', 'cloudfront',
  'dynamodb', 'sqs', 'sns', 'cloudwatch', 'kms', 'sts',
];

export default function FilterPanel({ onApply, loading }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [service, setService] = useState('');
  const [user, setUser] = useState('');
  const [eventName, setEventName] = useState('');
  const [expanded, setExpanded] = useState(false);

  const hasFilters = startTime || endTime || service || user || eventName;
  const activeCount = [startTime, endTime, service, user, eventName].filter(Boolean).length;

  function handleSubmit(e) {
    e.preventDefault();
    const filters = {};
    if (startTime) filters.startTime = new Date(startTime).toISOString();
    if (endTime) filters.endTime = new Date(endTime).toISOString();
    if (service) filters.service = service;
    if (user) filters.user = user;
    if (eventName) filters.eventName = eventName;
    onApply(filters);
  }

  function handleClear() {
    setStartTime('');
    setEndTime('');
    setService('');
    setUser('');
    setEventName('');
    onApply({});
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-card mb-6 overflow-hidden">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <Filter className="w-4 h-4 text-brand-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand-100 text-brand-700">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter fields */}
      {expanded && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 pt-1 border-t border-surface-100">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                End Time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Service
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm bg-surface-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              >
                <option value="">All Services</option>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>{s.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                <User className="w-3.5 h-3.5" />
                User
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="IAM username"
                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm bg-surface-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                <Search className="w-3.5 h-3.5" />
                Event Name
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. ConsoleLogin"
                className="w-full border border-surface-200 rounded-lg px-3 py-2 text-sm bg-surface-50 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-surface-100">
            {hasFilters && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-surface-50 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="gradient-brand text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Searching...
                </span>
              ) : (
                'Apply Filters'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
