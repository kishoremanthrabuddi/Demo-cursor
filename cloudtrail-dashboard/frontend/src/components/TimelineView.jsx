import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { formatDate, severityColor, severityDot, severityBadge } from '../utils/format';

const SEVERITY_ICONS = {
  HIGH: ShieldAlert,
  MEDIUM: AlertTriangle,
  LOW: Info,
};

export default function TimelineView({ events }) {
  const riskEvents = events.filter((e) => e.risk?.hasRisk);

  if (riskEvents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-card p-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7 text-surface-300" />
          </div>
          <p className="text-sm font-semibold text-gray-400">No risk events detected</p>
          <p className="text-xs text-gray-300">All clear in the current view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-danger flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Risk Event Timeline</h3>
            <p className="text-[11px] text-gray-400">{riskEvents.length} event{riskEvents.length !== 1 ? 's' : ''} detected</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {['HIGH', 'MEDIUM', 'LOW'].map((s) => {
            const count = riskEvents.filter((e) => e.risk.severity === s).length;
            if (!count) return null;
            return (
              <span key={s} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${severityBadge(s)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${severityDot(s)}`} />
                {count} {s}
              </span>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        <div className="relative">
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-surface-200 via-surface-200 to-transparent" />
          <div className="space-y-1">
            {riskEvents.map((event, idx) => {
              const SevIcon = SEVERITY_ICONS[event.risk.severity] || Info;
              return (
                <div key={idx} className="relative pl-12 py-3 group">
                  <div
                    className={`absolute left-2 top-4 w-[22px] h-[22px] rounded-full border-[3px] border-white shadow-sm flex items-center justify-center ${severityDot(event.risk.severity)}`}
                  >
                    <SevIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>

                  <div className="bg-surface-50 rounded-xl px-4 py-3.5 border border-surface-100 group-hover:border-surface-200 group-hover:shadow-card transition-all duration-200">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${severityBadge(event.risk.severity)}`}>
                        {event.risk.severity}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {formatDate(event.eventtime)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {event.eventname}
                      <span className="ml-2 text-xs font-medium text-gray-400">
                        {event.eventsource?.replace('.amazonaws.com', '')}
                      </span>
                    </p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                      <span>{event.risk.findings.map((f) => f.name).join(', ')}</span>
                      <span className="text-gray-300">|</span>
                      <span>{event.username || event.user_type || 'Unknown user'}</span>
                      <span className="text-gray-300">|</span>
                      <span className="font-mono">{event.sourceipaddress || 'unknown IP'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
