import { Activity, Server, Users, ShieldX } from 'lucide-react';
import { formatNumber } from '../utils/format';

const SKELETON = [1, 2, 3, 4];

export default function SummaryCards({ stats, loading }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SKELETON.map((i) => (
          <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-surface-100" />
              <div className="flex-1">
                <div className="h-3 bg-surface-100 rounded w-2/3 mb-2" />
                <div className="h-7 bg-surface-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const failedLogins =
    stats.loginResults.find((r) => r.result === 'Failed')?.count || 0;

  const cards = [
    {
      label: 'Total Events',
      value: formatNumber(stats.totalEvents),
      rawValue: stats.totalEvents.toLocaleString(),
      icon: Activity,
      gradient: 'gradient-brand',
      iconBg: 'bg-brand-50',
      iconColor: 'text-brand-600',
      accent: 'border-l-brand-500',
    },
    {
      label: 'Services Active',
      value: stats.topServices.length,
      icon: Server,
      gradient: 'gradient-info',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accent: 'border-l-blue-500',
    },
    {
      label: 'Unique Users',
      value: stats.topUsers.length,
      icon: Users,
      gradient: 'gradient-success',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accent: 'border-l-emerald-500',
    },
    {
      label: 'Failed Logins',
      value: failedLogins,
      icon: ShieldX,
      gradient: 'gradient-danger',
      iconBg: failedLogins > 0 ? 'bg-red-50' : 'bg-surface-50',
      iconColor: failedLogins > 0 ? 'text-red-600' : 'text-gray-400',
      accent: failedLogins > 0 ? 'border-l-red-500' : 'border-l-surface-300',
      highlight: failedLogins > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-xl border border-surface-200 border-l-4 ${card.accent} shadow-card hover:shadow-card-hover transition-all duration-200 p-5`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {card.label}
              </p>
              <p
                className={`text-2xl font-extrabold tracking-tight ${
                  card.highlight ? 'text-red-600' : 'text-gray-900'
                }`}
                title={card.rawValue || String(card.value)}
              >
                {card.value}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
