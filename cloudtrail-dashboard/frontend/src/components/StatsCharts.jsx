import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CHART_GRAY = '#374151';
const PIE_COLORS = ['#16A34A', '#DC2626'];

function ChartCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function StatsCharts({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 h-80 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <ChartCard title="Events Over Time">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={stats.eventsOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
            <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6 }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={CHART_GRAY}
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Events"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Services">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.topServices} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
            <YAxis dataKey="service" type="category" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={80} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6 }}
            />
            <Bar dataKey="count" fill={CHART_GRAY} radius={[0, 4, 4, 0]} name="Events" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top Users">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.topUsers} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
            <YAxis dataKey="user" type="category" tick={{ fontSize: 11 }} stroke="#9CA3AF" width={100} />
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6 }}
            />
            <Bar dataKey="count" fill="#6B7280" radius={[0, 4, 4, 0]} name="Events" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Console Login Results">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stats.loginResults}
              dataKey="count"
              nameKey="result"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ result, percent }) =>
                `${result} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: '#9CA3AF' }}
            >
              {stats.loginResults.map((entry, index) => (
                <Cell
                  key={entry.result}
                  fill={entry.result === 'Success' ? PIE_COLORS[0] : PIE_COLORS[1]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 6 }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
