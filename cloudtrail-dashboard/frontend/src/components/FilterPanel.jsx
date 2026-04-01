import { useState } from 'react';

const SERVICES = ['ec2', 'iam', 's3', 'lambda', 'rds', 'cloudfront', 'dynamodb', 'sqs', 'sns', 'cloudwatch', 'kms', 'sts'];

export default function FilterPanel({ onApply, loading }) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [service, setService] = useState('');
  const [user, setUser] = useState('');
  const [eventName, setEventName] = useState('');

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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Service</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="">All Services</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="IAM username"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Event Name</label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g. ConsoleLogin"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gray-900 text-white text-sm px-4 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}
