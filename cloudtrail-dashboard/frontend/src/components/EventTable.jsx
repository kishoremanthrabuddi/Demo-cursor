import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { formatDate, severityColor, severityBg, severityBadge, severityDot, stripAmazonSuffix } from '../utils/format';

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
    if (field !== sortField) return <ChevronsUpDown className="w-3 h-3 text-gray-300 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-brand-600 ml-1" />
      : <ChevronDown className="w-3 h-3 text-brand-600 ml-1" />;
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
    <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.key !== 'risk' && handleSort(col.key)}
                  className={`text-left px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider ${
                    col.key !== 'risk' ? 'cursor-pointer hover:text-gray-700 select-none' : ''
                  }`}
                >
                  <span className="flex items-center">
                    {col.label}
                    {col.key !== 'risk' && <SortIcon field={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3.5">
                      <div className="h-4 bg-surface-100 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <ExternalLink className="w-8 h-8 text-surface-300" />
                    <p className="font-medium">No events found</p>
                    <p className="text-xs">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((event, idx) => (
                <EventRow
                  key={idx}
                  event={event}
                  idx={idx}
                  expanded={expandedRow === idx}
                  onToggle={() => setExpandedRow(expandedRow === idx ? null : idx)}
                  colCount={columns.length}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-200 bg-surface-50">
          <span className="text-xs font-medium text-gray-500">
            {pagination.total.toLocaleString()} events &mdash; Page{' '}
            <span className="font-bold text-gray-700">{pagination.page}</span> of{' '}
            <span className="font-bold text-gray-700">{pagination.totalPages.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-surface-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-surface-200 rounded-lg hover:bg-white disabled:opacity-30 transition-all"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, idx, expanded, onToggle, colCount }) {
  const hasRisk = event.risk?.hasRisk;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer transition-colors duration-150 ${
          hasRisk ? severityBg(event.risk.severity) : 'hover:bg-surface-50'
        }`}
      >
        <td className="px-5 py-3 whitespace-nowrap text-gray-600">{formatDate(event.eventtime)}</td>
        <td className="px-5 py-3">
          <span className="inline-block bg-brand-50 text-brand-700 rounded-md px-2.5 py-0.5 text-xs font-semibold">
            {stripAmazonSuffix(event.eventsource)}
          </span>
        </td>
        <td className="px-5 py-3 font-semibold text-gray-800">{event.eventname}</td>
        <td className="px-5 py-3 text-gray-600">{event.username || event.user_type || '\u2014'}</td>
        <td className="px-5 py-3 font-mono text-xs text-gray-500">{event.sourceipaddress || '\u2014'}</td>
        <td className="px-5 py-3 text-gray-500">{event.awsregion || '\u2014'}</td>
        <td className="px-5 py-3">
          {hasRisk ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${severityBadge(event.risk.severity)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${severityDot(event.risk.severity)}`} />
              {event.risk.severity}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">&mdash;</span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-surface-50">
          <td colSpan={colCount} className="px-5 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">User ARN</span>
                  <p className="font-mono mt-1 text-gray-700 break-all bg-white rounded-lg px-3 py-2 border border-surface-200">
                    {event.user_arn || '\u2014'}
                  </p>
                </div>
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Error</span>
                  <p className="mt-1 text-gray-700 bg-white rounded-lg px-3 py-2 border border-surface-200">
                    {event.errorcode ? `${event.errorcode}: ${event.errormessage || ''}` : 'None'}
                  </p>
                </div>
              </div>
              {event.risk?.findings?.length > 0 && (
                <div>
                  <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Risk Findings</span>
                  <div className="mt-1 space-y-2">
                    {event.risk.findings.map((f, fi) => (
                      <div
                        key={fi}
                        className="flex items-start gap-3 bg-white rounded-lg px-3 py-2.5 border border-surface-200"
                      >
                        <span className={`mt-0.5 flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${severityBadge(f.severity)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${severityDot(f.severity)}`} />
                          {f.severity}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-800">{f.name}</p>
                          <p className="text-gray-500 mt-0.5">{f.description}</p>
                        </div>
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
  );
}
