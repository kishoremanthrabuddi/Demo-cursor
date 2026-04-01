export default function SummaryCards({ stats, loading }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const totalLogins = stats.loginResults.reduce((sum, r) => sum + r.count, 0);
  const failedLogins = stats.loginResults.find((r) => r.result === 'Failed')?.count || 0;

  const cards = [
    { label: 'Total Events', value: stats.totalEvents.toLocaleString() },
    { label: 'Services Active', value: stats.topServices.length },
    { label: 'Unique Users', value: stats.topUsers.length },
    {
      label: 'Failed Logins',
      value: failedLogins,
      highlight: failedLogins > 0 ? 'text-severity-high' : '',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className={`text-2xl font-bold ${card.highlight || 'text-gray-900'}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
