import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, BarChart3, Users, KeyRound } from 'lucide-react';

const CHART_COLORS = {
  primary: '#6366F1',
  primaryLight: '#A5B4FC',
  primaryGradientStart: 'rgba(99,102,241,0.3)',
  primaryGradientEnd: 'rgba(99,102,241,0.02)',
  secondary: '#3B82F6',
  secondaryLight: '#93C5FD',
  success: '#10B981',
  danger: '#EF4444',
  amber: '#F59E0B',
  gray: '#64748B',
};

const SERVICE_PALETTE = [
  '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
];

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      <div className="h-64 px-3 pb-4">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-semibold">
          {p.name}: {Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export default function StatsCharts({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-surface-200 p-5 h-80 animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-surface-100" />
              <div className="h-4 bg-surface-100 rounded w-1/3" />
            </div>
            <div className="h-full bg-surface-50 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Events Over Time - Area Chart */}
      <ChartCard title="Events Over Time" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.eventsOverTime}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              fill="url(#areaGradient)"
              dot={false}
              activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: '#fff', strokeWidth: 2 }}
              name="Events"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Services - Horizontal Bar */}
      <ChartCard title="Top Services" icon={BarChart3}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.topServices} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            />
            <YAxis
              dataKey="service"
              type="category"
              tick={{ fontSize: 11, fill: '#64748B', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={85}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Events" radius={[0, 6, 6, 0]} barSize={18}>
              {stats.topServices.map((_, i) => (
                <Cell key={i} fill={SERVICE_PALETTE[i % SERVICE_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Users - Horizontal Bar */}
      <ChartCard title="Top Users" icon={Users}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.topUsers} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            />
            <YAxis
              dataKey="user"
              type="category"
              tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={105}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Events" radius={[0, 6, 6, 0]} barSize={18}>
              {stats.topUsers.map((_, i) => (
                <Cell key={i} fill={SERVICE_PALETTE[(i + 3) % SERVICE_PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Console Login Results - Donut Chart */}
      <ChartCard title="Console Login Results" icon={KeyRound}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="successGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <linearGradient id="failGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="100%" stopColor="#F87171" />
              </linearGradient>
            </defs>
            <Pie
              data={stats.loginResults}
              dataKey="count"
              nameKey="result"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              label={({ result, percent }) => `${result} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
            >
              {stats.loginResults.map((entry) => (
                <Cell
                  key={entry.result}
                  fill={entry.result === 'Success' ? 'url(#successGrad)' : 'url(#failGrad)'}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs font-medium text-gray-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
