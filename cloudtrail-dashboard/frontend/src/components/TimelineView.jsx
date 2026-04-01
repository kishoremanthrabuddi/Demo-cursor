import { formatDate, severityColor, severityDot } from '../utils/format';

export default function TimelineView({ events }) {
  const riskEvents = events.filter((e) => e.risk?.hasRisk);

  if (riskEvents.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
        No risk events detected in current view
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Event Timeline</h3>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {riskEvents.map((event, idx) => (
            <div key={idx} className="relative pl-8">
              <div
                className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${severityDot(
                  event.risk.severity
                )}`}
              />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold ${severityColor(event.risk.severity)}`}>
                      {event.risk.severity}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(event.eventtime)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {event.eventname}
                    <span className="text-gray-400 font-normal ml-2">
                      {event.eventsource?.replace('.amazonaws.com', '')}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {event.risk.findings.map((f) => f.name).join(', ')} — {event.username || event.user_type || 'Unknown user'} from {event.sourceipaddress || 'unknown IP'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
