import { useState } from 'react';
import { formatDate, severityColor, severityBg, severityDot, stripAmazonSuffix } from '../utils/format';

export default function EventTable({ events, pagination, onPageChange, loading }) {
  const [sortField, setSortField] = useState('eventtime');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);

  const sorted = [...events].sort((a, b) => {
    const aVal = a[sortField] || '';
    const bVal = b[sortField] || '';
    const cmp = aVal.localeCompare(bVal);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(field) {
    if (field === sortField) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }) {
    if (field !== sortField) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const columns = [
    { key: 'eventtime', label: 'Time' },
    { key: 'eventsource', label: 'Service' },
    { key: 'eventname', label: 'Event' },
    { key: 'username', label: 'User' },
    { key: 'sourceipaddress', label: 'Source IP' },
    { key: 'awsregion', label: 'Region' },
    { key: 'risk', label: 'Risk' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'risk' && handleSort(col.key)}
                  className={`text-left px-4 py-3 font-medium text-gray-600 ${
                    col.key !== 'risk' ? 'cursor-pointer hover:text-gray-900 select-none' : ''
                  }`}
                >
                  {col.label}
                  {col.key !== 'risk' && <SortIcon field={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  Loading events…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                  No events found
                </td>
              </tr>
            ) : (
              sorted.map((event, idx) => (
                <>
                  <tr
                    key={idx}
                    onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                      event.risk?.hasRisk ? severityBg(event.risk.severity) : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(event.eventtime)}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-block bg-gray-100 rounded px-2 py-0.5 text-xs font-mono">
                        {stripAmazonSuffix(event.eventsource)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{event.eventname}</td>
                    <td className="px-4 py-2.5">{event.username || event.user_type || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{event.sourceipaddress || '—'}</td>
                    <td className="px-4 py-2.5">{event.awsregion || '—'}</td>
                    <td className="px-4 py-2.5">
                      {event.risk?.hasRisk ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${severityDot(event.risk.severity)}`} />
                          <span className={`text-xs font-semibold ${severityColor(event.risk.severity)}`}>
                            {event.risk.severity}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                  {expandedRow === idx && (
                    <tr key={`${idx}-detail`} className="bg-gray-50">
                      <td colSpan={columns.length} className="px-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-semibold text-gray-500">User ARN:</span>
                            <p className="font-mono mt-0.5 break-all">{event.user_arn || '—'}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-500">Error:</span>
                            <p className="mt-0.5">{event.errorcode ? `${event.errorcode}: ${event.errormessage || ''}` : 'None'}</p>
                          </div>
                          {event.risk?.findings?.length > 0 && (
                            <div className="col-span-2">
                              <span className="font-semibold text-gray-500">Risk Findings:</span>
                              <div className="mt-1 space-y-1">
                                {event.risk.findings.map((f, fi) => (
                                  <div key={fi} className={`flex items-center gap-2 px-2 py-1 rounded border ${severityBg(f.severity)}`}>
                                    <span className={`w-2 h-2 rounded-full ${severityDot(f.severity)}`} />
                                    <span className={`font-semibold ${severityColor(f.severity)}`}>{f.severity}</span>
                                    <span className="font-medium">{f.name}:</span>
                                    <span className="text-gray-600">{f.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500">
            {pagination.total.toLocaleString()} events — Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
